"""TrimTax API.

Every number in a response comes from the engine. These routes only load a
workspace, call the engine, and save any change the person made.

Run locally from the api/ folder:

    uvicorn app.main:app --reload
"""

import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import base64

from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ai import model as ai_model
from ai.pipeline import process_receipt
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

# Cost guards for uploads.
UPLOAD_TYPES = {"image/png", "image/jpeg", "image/webp", "application/pdf"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_UPLOADS_PER_WORKSPACE = 10
# Reset demo starts a workspace's count over, so there's also a cap for the whole server.
MAX_UPLOADS_PER_DAY = int(os.environ.get("TRIMTAX_MAX_UPLOADS_PER_DAY", "300"))

# Tests replace this with a fake model; in production it's the Claude API.
make_model = None


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


def empty_extras():
    """Things the person did that aren't tax data: W-9 requests, purchases added to the packet."""
    return {"w9_requested": [], "packet_purchases": [], "uploads": 0}


def get_extras(workspace_id):
    data, _ = store.load(workspace_id)
    extras = empty_extras()
    extras.update(data.get("extras", {}))
    return extras


def save_workspace(workspace_id, workspace, extras):
    data = workspace_to_data(workspace)
    data["extras"] = extras
    store.save(workspace_id, data)


def mark_w9_requests(items, extras):
    for item in items:
        if item["kind"] == "missing_w9":
            item["w9_requested"] = item["contractor_id"] in extras["w9_requested"]
    return items


def get_rules(year):
    if year not in RULES:
        raise HTTPException(status_code=404, detail=f"No ruleset for {year}.")
    return RULES[year]


def as_of_for(workspace):
    """The demo is pinned to Nov 19, 2026. A real company uses today."""
    if workspace.company.demo_date:
        return workspace.company.demo_date
    return date.today()


def image_path(receipt_id):
    """Where the web app can load a receipt's image from, relative to the API."""
    if receipt_id.startswith("up_"):
        return f"uploads/{receipt_id}"
    return f"receipt-images/{receipt_id}.png"


def receipt_image_for(workspace, transaction_id):
    for r in workspace.receipts:
        if r.transaction_id == transaction_id and r.has_image:
            return image_path(r.id)
    return None


def add_receipt_images(workspace, flagged):
    for item in flagged:
        if "transaction_id" in item:
            item["image"] = receipt_image_for(workspace, item["transaction_id"])
        else:
            item["image"] = image_path(item["receipt_id"])
    return flagged


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
    extras = get_extras(workspace_id)
    result = overview(workspace, get_rules(year), as_of_for(workspace))
    result["is_demo"] = is_demo
    result["open_items"] = mark_w9_requests(result["open_items"], extras)
    result["packet_purchases"] = extras["packet_purchases"]
    result["flagged"] = add_receipt_images(workspace, result["flagged"])
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


@app.post("/workspaces/{workspace_id}/packet/purchases")
def add_purchase_to_packet(workspace_id: str, purchase: PurchaseCheck):
    """Save a checked purchase so the accountant sees it. Nothing is recorded as bought."""
    workspace, _ = get_workspace(workspace_id)
    result = post_check_purchase(workspace_id, purchase)
    extras = get_extras(workspace_id)
    # One planned purchase at a time; a new check replaces the old one.
    entry = jsonable_encoder({"input": purchase, "result": result})
    extras["packet_purchases"] = [entry]
    save_workspace(workspace_id, workspace, extras)
    return extras["packet_purchases"]


@app.post("/workspaces/{workspace_id}/packet/purchases/clear")
def clear_packet_purchases(workspace_id: str):
    workspace, _ = get_workspace(workspace_id)
    extras = get_extras(workspace_id)
    extras["packet_purchases"] = []
    save_workspace(workspace_id, workspace, extras)
    return {"ok": True}


@app.post("/workspaces/{workspace_id}/contractors/{contractor_id}/request-w9")
def request_w9(workspace_id: str, contractor_id: str, undo: bool = False):
    """Note that a W-9 was asked for. TrimTax doesn't send anything itself."""
    workspace, _ = get_workspace(workspace_id)
    known = [c.id for c in workspace.contractors]
    if contractor_id not in known:
        raise HTTPException(status_code=404, detail="No such contractor.")
    extras = get_extras(workspace_id)
    requested = [c for c in extras["w9_requested"] if c != contractor_id]
    if not undo:
        requested.append(contractor_id)
    extras["w9_requested"] = requested
    save_workspace(workspace_id, workspace, extras)
    return {"w9_requested": requested}


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

def question_view(workspace, t, ruleset):
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
        "image": receipt_image_for(workspace, t.id),
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
            questions.append(question_view(workspace, t, ruleset))
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
    save_workspace(workspace_id, workspace, get_extras(workspace_id))
    return question_view(workspace, t, get_rules(2026))


@app.post("/workspaces/{workspace_id}/questions/{transaction_id}/undo")
def undo_answer(workspace_id: str, transaction_id: str):
    workspace, _ = get_workspace(workspace_id)
    t = find_transaction(workspace, transaction_id)
    if not t.question:
        raise HTTPException(status_code=400, detail="This transaction had no question.")
    t.category = ""
    t.status = "needs_answer"
    save_workspace(workspace_id, workspace, get_extras(workspace_id))
    return question_view(workspace, t, get_rules(2026))


# ------------------------------------------------------------------
# Accountant packet
# ------------------------------------------------------------------

@app.get("/workspaces/{workspace_id}/packet")
def get_packet(workspace_id: str, year: int = 2026):
    workspace, _ = get_workspace(workspace_id)
    extras = get_extras(workspace_id)
    ruleset = get_rules(year)
    as_of = as_of_for(workspace)
    return {
        "note": PACKET_NOTE,
        "company": workspace.company.name,
        "as_of": as_of,
        "ruleset_version": ruleset.version,
        "open_items": mark_w9_requests(open_items(workspace, ruleset), extras),
        "flagged": add_receipt_images(workspace, flagged_documents(workspace)),
        "purchases": extras["packet_purchases"],
        "summary": overview(workspace, ruleset, as_of),
    }


# ------------------------------------------------------------------
# Uploads: the AI reads a receipt, plain code decides what counts
# ------------------------------------------------------------------

def get_model():
    if make_model is not None:
        return make_model()
    if not ai_model.available():
        raise HTTPException(status_code=503, detail="Receipt reading isn't switched on for this server.")
    return ai_model.ClaudeModel()


@app.post("/workspaces/{workspace_id}/receipts")
async def upload_receipt(workspace_id: str, file: UploadFile = File(...)):
    workspace, _ = get_workspace(workspace_id)
    extras = get_extras(workspace_id)

    if file.content_type not in UPLOAD_TYPES:
        raise HTTPException(status_code=415, detail="Upload a PNG, JPEG, WebP or PDF.")
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="That file is over 5 MB.")
    if extras["uploads"] >= MAX_UPLOADS_PER_WORKSPACE:
        raise HTTPException(status_code=429, detail="This workspace has reached its upload limit.")
    a_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    if store.uploads_since(a_day_ago) >= MAX_UPLOADS_PER_DAY:
        raise HTTPException(status_code=429, detail="Receipt reading is busy today. Try the demo receipts instead.")

    model = get_model()
    file_base64 = base64.b64encode(contents).decode("ascii")
    upload_id = store.save_upload(workspace_id, file.content_type, file_base64)
    ruleset = get_rules(2026)

    transaction, receipt, summary, traces = process_receipt(
        model, file_base64, file.content_type, upload_id, as_of_for(workspace), ruleset)

    if transaction is not None:
        workspace.transactions.append(transaction)
    workspace.receipts.append(receipt)
    extras["uploads"] += 1
    save_workspace(workspace_id, workspace, extras)
    for trace in traces:
        trace["upload_id"] = upload_id
        store.add_trace(workspace_id, trace)

    return {
        "summary": summary,
        "transaction_id": transaction.id if transaction else None,
        "receipt_id": receipt.id,
        "image": image_path(receipt.id),
        "note": receipt.note,
        "traces": traces,
    }


@app.get("/uploads/{upload_id}")
def get_upload(upload_id: str):
    """An uploaded receipt file. Ids are long and random, like the workspace ids."""
    media_type, file_base64 = store.load_upload(upload_id)
    if media_type is None:
        raise HTTPException(status_code=404, detail="No such upload.")
    return Response(content=base64.b64decode(file_base64), media_type=media_type)


@app.get("/workspaces/{workspace_id}/traces")
def get_traces(workspace_id: str):
    get_workspace(workspace_id)
    return {"traces": store.list_traces(workspace_id)}
