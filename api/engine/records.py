"""The data the engine works on, and how to read it from the data folder."""

import csv
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

TIDEWELL_DIR = Path(__file__).resolve().parents[2] / "data" / "tidewell"


@dataclass
class Company:
    name: str
    entity_type: str
    state: str
    expected_net_income_cents: int
    small_item_election: bool
    demo_date: date | None = None
    has_audited_financials: bool = False


@dataclass
class Contractor:
    id: str
    name: str
    entity_type: str
    w9_on_file: bool
    country: str


@dataclass
class Transaction:
    id: str
    date: date
    merchant: str
    amount_cents: int
    category: str
    status: str  # confirmed, needs_answer or cant_determine
    memo: str = ""
    payee_id: str = ""
    flag: str = ""
    question: str = ""  # set when status is needs_answer
    options: str = ""  # the categories the answer can be, separated by "|"


@dataclass
class Receipt:
    id: str
    transaction_id: str
    date: date | None
    merchant: str
    total_cents: int | None  # None when the total couldn't be read
    has_image: bool
    note: str = ""


@dataclass
class Workspace:
    company: Company
    contractors: list
    transactions: list
    receipts: list


def read_csv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def to_date(text):
    if text == "":
        return None
    return date.fromisoformat(text)


def to_cents(text):
    if text == "":
        return None
    return int(text)


def load_company(folder):
    data = json.loads((Path(folder) / "company.json").read_text())
    return Company(
        name=data["name"],
        entity_type=data["entity_type"],
        state=data["state"],
        expected_net_income_cents=data["expected_net_income_cents"],
        small_item_election=data["small_item_election"],
        demo_date=to_date(data.get("demo_date", "")),
        has_audited_financials=data.get("has_audited_financials", False),
    )


def load_contractors(folder):
    contractors = []
    for row in read_csv(Path(folder) / "contractors.csv"):
        contractors.append(Contractor(
            id=row["id"],
            name=row["name"],
            entity_type=row["entity_type"],
            w9_on_file=row["w9_on_file"] == "True",
            country=row["country"],
        ))
    return contractors


def load_transactions(folder):
    transactions = []
    for row in read_csv(Path(folder) / "transactions.csv"):
        transactions.append(Transaction(
            id=row["id"],
            date=to_date(row["date"]),
            merchant=row["merchant"],
            amount_cents=int(row["amount_cents"]),
            category=row["category"],
            status=row["status"],
            memo=row["memo"],
            payee_id=row["payee_id"],
            flag=row["flag"],
            question=row.get("question", ""),
            options=row.get("options", ""),
        ))
    return transactions


def load_receipts(folder):
    receipts = []
    for row in read_csv(Path(folder) / "receipts.csv"):
        receipts.append(Receipt(
            id=row["id"],
            transaction_id=row["transaction_id"],
            date=to_date(row["date"]),
            merchant=row["merchant"],
            total_cents=to_cents(row["total_cents"]),
            has_image=row["has_image"] == "True",
            note=row["note"],
        ))
    return receipts


def load_workspace(folder=TIDEWELL_DIR):
    return Workspace(
        company=load_company(folder),
        contractors=load_contractors(folder),
        transactions=load_transactions(folder),
        receipts=load_receipts(folder),
    )
