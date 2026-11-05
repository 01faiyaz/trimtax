"""TrimTax API.

Every number in a response comes from the engine. These routes only load a
workspace, call the engine, and save any change the person made.

Run locally from the api/ folder:

    uvicorn app.main:app --reload
"""

import os
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app import store
from app.convert import data_to_workspace, workspace_to_data
from engine.categories import CATEGORIES, is_category, label
from engine.compare import compare_years
from engine.equipment import all_in_price, check_purchase
from engine.meals import MEAL_RULES, meal_outcomes
from engine.overview import overview
from engine.records import Company, Workspace, load_workspace
from engine.review import flagged_documents, open_items
from engine.rules import load_ruleset

RULES = {2025: load_ruleset(2025), 2026: load_ruleset(2026)}
RECEIPT_IMAGES = Path(__file__).resolve().parents[2] / "data" / "tidewell" / "receipt_images"
PACKET_NOTE = "Prepared for your accountant to review. This is not a tax filing."


@asynccontextmanager
async def lifespan(app):
    store.setup()
    yield


app = FastAPI(title="TrimTax API", lifespan=lifespan)

allowed = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed.split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.mount("/receipt-images", StaticFiles(directory=RECEIPT_IMAGES), name="receipt-images")


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def get_workspace(workspace_id):
    data, is_demo = store.load(workspace_id)
    if data is None:
        raise HTTPException(status_code=404, detail="No such workspace. Start a new demo.")
    return data_to_workspace(data), is_demo


def get_rules(year):
    if year not in RULES:
        raise HTTPException(status_code=404, detail=f"No ruleset for {year}.")
    return RULES[year]


def as_of_for(workspace):
    """The demo is pinned to Nov 19, 2026. A real company uses today."""
    if workspace.company.demo_date:
        return workspace.company.demo_date
    return date.today()


def find_transaction(workspace, transaction_id):
    for t in workspace.transactions:
        if t.id == transaction_id:
            return t
    raise HTTPException(status_code=404, detail="No such transaction.")


# ------------------------------------------------------------------
# Workspaces
# ------------------------------------------------------------------

class StartFresh(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    entity_type: str = "s_corporation"
    state: str = "CA"
    expected_net_income_cents: int = Field(ge=0)
    small_item_election: bool = True
    has_audited_financials: bool = False


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/workspaces/demo")
def new_demo_workspace():
    """A fresh copy of the Tidewell Labs demo, just for this visitor."""
    data = workspace_to_data(load_workspace())
    return {"workspace_id": store.create(data, is_demo=True)}


@app.post("/workspaces")
def new_empty_workspace(profile: StartFresh):
    company = Company(
        name=profile.name,
        entity_type=profile.entity_type,
        state=profile.state,
        expected_net_income_cents=profile.expected_net_income_cents,
        small_item_election=profile.small_item_election,
        has_audited_financials=profile.has_audited_financials,
    )
    workspace = Workspace(company=company, contractors=[], transactions=[], receipts=[])
    return {"workspace_id": store.create(workspace_to_data(workspace), is_demo=False)}


@app.post("/workspaces/{workspace_id}/reset")
def reset_demo(workspace_id: str):
    _, is_demo = get_workspace(workspace_id)
    if not is_demo:
        raise HTTPException(status_code=400, detail="Only demo workspaces can be reset.")
    store.save(workspace_id, workspace_to_data(load_workspace()))
    return {"ok": True}


# ------------------------------------------------------------------
# Overview, purchase check, rules
# ------------------------------------------------------------------

@app.get("/workspaces/{workspace_id}/overview")
def get_overview(workspace_id: str, year: int = 2026):
    workspace, is_demo = get_workspace(workspace_id)
    result = overview(workspace, get_rules(year), as_of_for(workspace))
    result["is_demo"] = is_demo
    return result


class PurchaseCheck(BaseModel):
    price_each_cents: int = Field(gt=0, le=10_000_000_00)
    quantity: int = Field(gt=0, le=1000)
    in_use_by: date
    sales_tax_percent: str = "0"  # added to the price, e.g. "8.625"
    shipping_each_cents: int = Field(default=0, ge=0)
    year: int = 2026


@app.post("/workspaces/{workspace_id}/check-purchase")
def post_check_purchase(workspace_id: str, purchase: PurchaseCheck):
    workspace, _ = get_workspace(workspace_id)
    ruleset = get_rules(purchase.year)
    try:
        price = all_in_price(purchase.price_each_cents, purchase.sales_tax_percent,
                             purchase.shipping_each_cents)
    except ArithmeticError:
        raise HTTPException(status_code=422, detail="Sales tax must be a number like 8.625.")
    return check_purchase(price, purchase.quantity, purchase.in_use_by, as_of_for(workspace),
                          workspace.transactions, ruleset, workspace.company)


@app.get("/rules/{year}")
def get_ruleset(year: int):
    ruleset = get_rules(year)
    return {"version": ruleset.version, "tax_year": ruleset.tax_year,
            "rules": list(ruleset.rules.values())}


@app.get("/workspaces/{workspace_id}/compare")
def get_compare(workspace_id: str, from_year: int = 2025, to_year: int = 2026):
    workspace, _ = get_workspace(workspace_id)
    return compare_years(workspace, get_rules(from_year), get_rules(to_year))


@app.get("/categories")
def get_categories():
    return CATEGORIES


# ------------------------------------------------------------------
# Questions (one question instead of a guess)
# ------------------------------------------------------------------

def question_view(t, ruleset):
    options = []
    for category in t.options.split("|"):
        if not category:
            continue
        option = {"category": category, "label": label(category), "outcome": None}
        if category in MEAL_RULES:
            option["outcome"] = meal_outcomes(t.amount_cents, ruleset, [category])["outcomes"][category]
        options.append(option)
    return {
        "transaction_id": t.id,
        "date": t.date,
        "merchant": t.merchant,
        "amount_cents": t.amount_cents,
        "question": t.question,
        "status": t.status,
        "category": t.category,
        "options": options,
        "ruleset_version": ruleset.version,
    }


@app.get("/workspaces/{workspace_id}/questions")
def get_questions(workspace_id: str, year: int = 2026):
    """Open questions, plus ones already answered (so they can be undone)."""
    workspace, _ = get_workspace(workspace_id)
    ruleset = get_rules(year)
    questions = []
    for t in workspace.transactions:
        if t.question:
            questions.append(question_view(t, ruleset))
    return {"questions": questions}


class Answer(BaseModel):
    category: str


@app.post("/workspaces/{workspace_id}/questions/{transaction_id}/answer")
def answer_question(workspace_id: str, transaction_id: str, answer: Answer):
    workspace, _ = get_workspace(workspace_id)
    t = find_transaction(workspace, transaction_id)
    allowed_answers = t.options.split("|")
    if not t.question or not is_category(answer.category) or answer.category not in allowed_answers:
        raise HTTPException(status_code=400, detail="That isn't one of the answers for this question.")
    t.category = answer.category
    t.status = "confirmed"
    store.save(workspace_id, workspace_to_data(workspace))
    return question_view(t, get_rules(2026))


@app.post("/workspaces/{workspace_id}/questions/{transaction_id}/undo")
def undo_answer(workspace_id: str, transaction_id: str):
    workspace, _ = get_workspace(workspace_id)
    t = find_transaction(workspace, transaction_id)
    if not t.question:
        raise HTTPException(status_code=400, detail="This transaction had no question.")
    t.category = ""
    t.status = "needs_answer"
    store.save(workspace_id, workspace_to_data(workspace))
    return question_view(t, get_rules(2026))


# ------------------------------------------------------------------
# Accountant packet
# ------------------------------------------------------------------

@app.get("/workspaces/{workspace_id}/packet")
def get_packet(workspace_id: str, year: int = 2026):
    workspace, _ = get_workspace(workspace_id)
    ruleset = get_rules(year)
    as_of = as_of_for(workspace)
    return {
        "note": PACKET_NOTE,
        "company": workspace.company.name,
        "as_of": as_of,
        "ruleset_version": ruleset.version,
        "open_items": open_items(workspace, ruleset),
        "flagged": flagged_documents(workspace),
        "summary": overview(workspace, ruleset, as_of),
    }
