"""Reading a transactions CSV into a "Start fresh" company.

Columns, in any order: date, merchant, amount. Optional: category, memo, payee.
- A row with a category TrimTax knows is counted right away.
- A row without one waits for the owner to pick, the same question a receipt
  gets when it can't be sorted.
- Contractor payments need a payee (the person's name) to count toward 1099s.

No tax math happens here. This only turns rows into transactions and says
plainly which rows it skipped and why.
"""

import csv
import io
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from ai.pipeline import PICK_A_CATEGORY
from engine.categories import CATEGORIES
from engine.records import Contractor, Transaction

MAX_ROWS = 5000
REQUIRED = ["date", "merchant", "amount"]
DATE_FORMATS = ["%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"]
TAX_YEAR = 2026


class BadFile(ValueError):
    """The file can't be read at all. The message says why, in plain words."""


def read_rows(text):
    """The rows as dicts with lower-case column names."""
    reader = csv.DictReader(io.StringIO(text.lstrip("﻿")))
    if not reader.fieldnames:
        raise BadFile("The file is empty.")
    columns = [name.strip().lower() for name in reader.fieldnames]
    missing = [name for name in REQUIRED if name not in columns]
    if missing:
        raise BadFile("The file needs these columns: " + ", ".join(missing) + ".")
    rows = []
    for raw in reader:
        rows.append({name.strip().lower(): (value or "").strip() for name, value in raw.items() if name})
        if len(rows) > MAX_ROWS:
            raise BadFile(f"That's more than {MAX_ROWS:,} rows. Split the file and import it in parts.")
    return rows


def parse_date(text):
    for pattern in DATE_FORMATS:
        try:
            return datetime.strptime(text, pattern).date()
        except ValueError:
            pass
    return None


def parse_cents(text):
    """'$1,234.56' or '1234.56' to 123456. Negative for '-12.00' or '(12.00)'. None if unreadable."""
    cleaned = text.replace("$", "").replace(",", "").replace(" ", "")
    negative = cleaned.startswith("(") and cleaned.endswith(")")
    cleaned = cleaned.strip("()")
    try:
        amount = Decimal(cleaned)
    except InvalidOperation:
        return None
    cents = amount * 100
    if cents != cents.to_integral_value():
        return None  # more than two decimal places
    return int(-cents if negative else cents)


def find_category(text):
    """Accepts the category key ('client_meal') or its label ('Meal with a client')."""
    wanted = text.strip().lower()
    for key, label in CATEGORIES.items():
        if wanted in (key, label.lower()):
            return key
    return ""


def contractor_for(name, contractors):
    """The contractor with this name, added if they're new. We don't know their
    entity type or W-9 yet, so they start as unknown with no W-9 on file."""
    for contractor in contractors:
        if contractor.name.lower() == name.lower():
            return contractor
    contractor = Contractor(id=f"ctr_imp_{len(contractors) + 1:03d}", name=name,
                            entity_type="unknown", w9_on_file=False, country="US")
    contractors.append(contractor)
    return contractor


def import_transactions(text, workspace, today):
    """Adds the file's rows to the workspace. Returns counts and the skipped rows."""
    rows = read_rows(text)
    already = sum(1 for t in workspace.transactions if t.id.startswith("imp_"))
    # Rows from an earlier import. Two identical rows in one file can be real (two coffees), so
    # only earlier imports count as duplicates.
    seen = {(t.date, t.merchant, t.amount_cents) for t in workspace.transactions if t.id.startswith("imp_")}
    added = []
    skipped = []
    warnings = []

    for line, row in enumerate(rows, start=2):  # line 1 is the header
        day = parse_date(row.get("date", ""))
        cents = parse_cents(row.get("amount", ""))
        merchant = row.get("merchant", "")
        if day is None:
            skipped.append({"line": line, "reason": "The date isn't YYYY-MM-DD or MM/DD/YYYY."})
            continue
        if day.year != TAX_YEAR:
            skipped.append({"line": line, "reason": f"Not in {TAX_YEAR}."})
            continue
        if day > today:
            skipped.append({"line": line, "reason": "Dated in the future."})
            continue
        if cents is None:
            skipped.append({"line": line, "reason": "The amount isn't a number."})
            continue
        if cents <= 0:
            skipped.append({"line": line, "reason": "Refunds and credits aren't counted yet."})
            continue
        if not merchant:
            skipped.append({"line": line, "reason": "No merchant."})
            continue
        if (day, merchant, cents) in seen:
            skipped.append({"line": line, "reason": "Already imported."})
            continue

        category = find_category(row.get("category", ""))
        transaction = Transaction(id=f"imp_{already + len(added) + 1:04d}", date=day, merchant=merchant,
                                  amount_cents=cents, category=category, status="confirmed",
                                  memo=row.get("memo", ""))
        if not category:
            transaction.status = "needs_answer"
            transaction.question = PICK_A_CATEGORY
            transaction.options = "|".join(CATEGORIES)
        if category == "contractor":
            payee = row.get("payee", "")
            if payee:
                transaction.payee_id = contractor_for(payee, workspace.contractors).id
            else:
                warnings.append({"line": line, "reason": "Contractor payment with no payee, so it won't count toward a 1099."})
        added.append(transaction)

    workspace.transactions.extend(added)
    return {
        "added": len(added),
        "needs_category": sum(1 for t in added if t.status == "needs_answer"),
        "skipped": len(skipped),
        "problems": sorted(skipped + warnings, key=lambda p: p["line"])[:20],  # enough to fix the file
    }
