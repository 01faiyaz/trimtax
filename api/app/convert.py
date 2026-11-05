"""Turn a Workspace into plain JSON-ready data and back, for storage."""

from dataclasses import asdict
from datetime import date

from engine.records import Company, Contractor, Receipt, Transaction, Workspace


def to_text(day):
    if day is None:
        return None
    return day.isoformat()


def to_day(text):
    if not text:
        return None
    return date.fromisoformat(text)


def workspace_to_data(workspace):
    company = asdict(workspace.company)
    company["demo_date"] = to_text(workspace.company.demo_date)

    transactions = []
    for t in workspace.transactions:
        row = asdict(t)
        row["date"] = to_text(t.date)
        transactions.append(row)

    receipts = []
    for r in workspace.receipts:
        row = asdict(r)
        row["date"] = to_text(r.date)
        receipts.append(row)

    contractors = []
    for c in workspace.contractors:
        contractors.append(asdict(c))

    return {
        "company": company,
        "contractors": contractors,
        "transactions": transactions,
        "receipts": receipts,
    }


def data_to_workspace(data):
    company_data = dict(data["company"])
    company_data["demo_date"] = to_day(company_data.get("demo_date"))
    company = Company(**company_data)

    contractors = []
    for row in data["contractors"]:
        contractors.append(Contractor(**row))

    transactions = []
    for row in data["transactions"]:
        row = dict(row)
        row["date"] = to_day(row["date"])
        transactions.append(Transaction(**row))

    receipts = []
    for row in data["receipts"]:
        row = dict(row)
        row["date"] = to_day(row["date"])
        receipts.append(Receipt(**row))

    return Workspace(company=company, contractors=contractors,
                     transactions=transactions, receipts=receipts)
