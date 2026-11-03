"""Build the synthetic Tidewell Labs data set.

Tidewell Labs is a fictional company. Every name, amount and receipt here is
made up for the demo. Run from the repo root:

    python data/generate.py

It writes five files to data/tidewell/:
    company.json          the company profile
    contractors.csv       people and firms Tidewell pays for services
    transactions.csv      400 card and bill payments, Jan 1 to Nov 19, 2026
    receipts.csv          142 receipt records (40 of them get images later)
    receipt_details.json  line items for receipts that need them

Money is always whole cents. The output is the same every run (fixed seed),
and data/test_locked_numbers.py fails if any demo number drifts.
"""

import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

OUT_DIR = Path(__file__).parent / "tidewell"
DEMO_DATE = date(2026, 11, 19)
YEAR_START = date(2026, 1, 1)
TOTAL_TRANSACTIONS = 400
TOTAL_RECEIPTS = 142
TOTAL_RECEIPT_IMAGES = 40
SEED = 2026

COMPANY = {
    "name": "Tidewell Labs",
    "label": "Synthetic demo data",
    "entity_type": "s_corporation",
    "state": "CA",
    "employees": 8,
    "industry": "software",
    "tax_year": 2026,
    "expected_net_income_cents": 12000000,  # $120,000 before the laptop decision
    "small_item_election": True,  # expensing policy in place since Jan 1
    "has_audited_financials": False,
    "demo_date": DEMO_DATE.isoformat(),
}


# ------------------------------------------------------------------
# The story transactions. These are the ones the demo numbers come from.
# ------------------------------------------------------------------

EQUIPMENT = [
    # (date, merchant, cents, memo)
    ("2026-03-03", "Apple", 769700, "2 MacBook Pro at $3,848.50"),
    ("2026-06-18", "Dell", 396000, "1 PowerEdge server"),
    ("2026-06-18", "Herman Miller", 412000, "1 conference table"),
    ("2026-09-09", "B&H Photo", 262300, "1 camera kit"),
]

# Office team lunches. Adds up to $4,180.00.
TEAM_MEALS = [
    ("2026-01-16", "Pho Garden Catering", 38600),
    ("2026-02-12", "Tartine Catering", 41250),
    ("2026-03-19", "Pho Garden Catering", 39800),
    ("2026-04-23", "Souvla", 44150),
    ("2026-05-14", "Tartine Catering", 40500),
    ("2026-06-11", "Pho Garden Catering", 42700),
    ("2026-07-16", "Souvla", 43900),
    ("2026-08-13", "Tartine Catering", 39600),
    ("2026-09-17", "Pho Garden Catering", 43200),
    ("2026-10-15", "Souvla", 44300),
]

# Meals with clients. Adds up to $2,960.00.
CLIENT_MEALS = [
    ("2026-01-28", "Zuni Cafe", 31800),
    ("2026-03-05", "Kokkari", 42600),
    ("2026-04-09", "Nopa", 28700),
    ("2026-05-21", "Zuni Cafe", 36400),
    ("2026-07-08", "Kokkari", 45900),
    ("2026-08-20", "Nopa", 33300),
    ("2026-09-24", "Zuni Cafe", 39100),
    ("2026-10-22", "Kokkari", 38200),
]

# Contractors Tidewell pays directly. Totals are what was paid by Nov 19.
CONTRACTORS = [
    # (id, name, entity_type, w9_on_file, total_cents, number_of_payments)
    ("ctr_01", "Maya Lindqvist", "individual", True, 480000, 4),
    ("ctr_02", "Tomas Ferreira", "sole_proprietor", True, 325000, 3),
    ("ctr_03", "Priya Raman", "individual", True, 260000, 2),
    ("ctr_04", "Leo Okafor", "single_member_llc", True, 215000, 2),
    ("ctr_05", "Dana Reyes", "individual", False, 185000, 3),
    ("ctr_06", "Arjun Patel", "individual", True, 170000, 2),
    ("ctr_07", "Hana Kobayashi", "individual", True, 140000, 2),
    ("ctr_08", "Sam Whitfield", "sole_proprietor", True, 120000, 2),
    ("ctr_09", "Elena Marsh", "individual", True, 98000, 1),
    ("ctr_10", "Jonah Brandt", "individual", True, 85000, 1),
    ("ctr_11", "Ruth Adeyemi", "individual", True, 76000, 1),
    ("ctr_12", "Felix Moreau", "single_member_llc", True, 70000, 1),
    ("ctr_13", "Ivy Chen", "individual", True, 62500, 1),
    ("ctr_14", "Marco Bellini", "individual", True, 45000, 1),
    ("ctr_15", "Nora Quinn", "individual", True, 38000, 1),
    ("ctr_16", "Oscar Delgado", "individual", True, 30000, 1),
    ("ctr_17", "Wren Albright", "individual", True, 24000, 1),
    ("ctr_18", "Theo Lang", "individual", True, 15000, 1),
]

# Research spending, paid to two development firms (both corporations,
# so no 1099s). US work: $186,400. Offshore work: $41,200.
RESEARCH_FIRMS = [
    # (id, name, entity_type, country)
    ("ctr_19", "Brightline Dev Studio Inc.", "corporation", "US"),
    ("ctr_20", "Vistula Code Sp. z o.o.", "corporation", "PL"),
]
US_RESEARCH_PAYMENTS = 10  # monthly, Jan to Oct, $18,640 each
US_RESEARCH_EACH = 1864000
OFFSHORE_RESEARCH_PAYMENTS = 4  # quarterly-ish, $10,300 each
OFFSHORE_RESEARCH_EACH = 1030000

SWEETGREEN = {
    "date": "2026-11-13",
    "time": "12:18",
    "merchant": "Sweetgreen",
    "order_number": "4471",
    "deliver_to": "Tidewell Labs office 3F",
    "lines": [
        ("Harvest Bowl", 22, 1450),
        ("Delivery", 1, 1495),
        ("Service fee", 1, 3975),
    ],
    "subtotal_cents": 37370,
    "tax_cents": 3830,
    "total_cents": 41200,
}


# ------------------------------------------------------------------
# Filler: ordinary spending that doesn't touch any demo number.
# ------------------------------------------------------------------

MONTHLY_BILLS = [
    # (merchant, category, low_cents, high_cents, day_of_month)
    ("GitHub", "software", 4400, 4400, 2),
    ("Linear", "software", 6400, 6400, 3),
    ("Figma", "software", 9000, 9000, 4),
    ("Google Workspace", "software", 16800, 16800, 5),
    ("AWS", "software", 61000, 148000, 6),
    ("Vercel", "software", 2000, 2000, 7),
    ("Notion", "software", 8000, 8000, 8),
    ("Slack", "software", 7000, 7000, 9),
    ("Comcast Business", "rent_utilities", 18900, 18900, 10),
    ("Mission Street Workspace", "rent_utilities", 640000, 640000, 1),
    ("PG&E", "rent_utilities", 21000, 38000, 15),
]

RANDOM_SPEND = [
    # (merchant, category, low_cents, high_cents)
    ("Staples", "office_supplies", 1800, 24000),
    ("Amazon Business", "office_supplies", 1500, 32000),
    ("Uber", "travel", 1400, 6800),
    ("Lyft", "travel", 1300, 5900),
    ("United Airlines", "travel", 21000, 68000),
    ("Hilton", "travel", 18000, 52000),
    ("LinkedIn Ads", "advertising", 25000, 150000),
    ("Google Ads", "advertising", 20000, 120000),
    ("USPS", "office_supplies", 900, 6500),
    ("FedEx", "office_supplies", 1600, 9800),
]


# ------------------------------------------------------------------
# Small helpers
# ------------------------------------------------------------------

def split_evenly(total_cents, parts):
    """Split a total into parts that add up exactly. Extra cents go first."""
    base = total_cents // parts
    extra = total_cents % parts
    amounts = []
    for i in range(parts):
        if i < extra:
            amounts.append(base + 1)
        else:
            amounts.append(base)
    return amounts


def payment_dates(count, first, last):
    """Spread payment dates evenly between two dates."""
    if count == 1:
        return [last]
    gap = (last - first).days / (count - 1)
    dates = []
    for i in range(count):
        dates.append(first + timedelta(days=round(gap * i)))
    return dates


def random_date(rng):
    days = (DEMO_DATE - YEAR_START).days
    return YEAR_START + timedelta(days=rng.randint(0, days))


def make_transaction(day, merchant, cents, category, status="confirmed",
                     memo="", payee_id="", flag=""):
    return {
        "date": day if isinstance(day, str) else day.isoformat(),
        "merchant": merchant,
        "amount_cents": cents,
        "category": category,
        "status": status,
        "memo": memo,
        "payee_id": payee_id,
        "flag": flag,
    }


# ------------------------------------------------------------------
# Build each group
# ------------------------------------------------------------------

def equipment_transactions():
    rows = []
    for day, merchant, cents, memo in EQUIPMENT:
        rows.append(make_transaction(day, merchant, cents, "equipment", memo=memo))
    return rows


def meal_transactions():
    rows = []
    for day, merchant, cents in TEAM_MEALS:
        rows.append(make_transaction(day, merchant, cents, "team_meal_office",
                                     memo="Team lunch at the office"))
    for day, merchant, cents in CLIENT_MEALS:
        rows.append(make_transaction(day, merchant, cents, "client_meal",
                                     memo="Lunch with a client"))
    return rows


def sweetgreen_transaction():
    # Not sorted yet: the AI asks who the lunch was for.
    return make_transaction(SWEETGREEN["date"], SWEETGREEN["merchant"],
                            SWEETGREEN["total_cents"], "", status="needs_answer",
                            memo="Catering order #" + SWEETGREEN["order_number"])


def contractor_transactions():
    rows = []
    first = date(2026, 2, 1)
    for index, contractor in enumerate(CONTRACTORS):
        payee_id, name, _type, _w9, total, count = contractor
        # Stagger the last payment so everyone isn't paid on the same day.
        last = date(2026, 11, 2) - timedelta(days=11 * index)
        amounts = split_evenly(total, count)
        days = payment_dates(count, first, last)
        for day, cents in zip(days, amounts):
            rows.append(make_transaction(day, name, cents, "contractor",
                                         memo="Contract work", payee_id=payee_id))
    return rows


def research_transactions():
    rows = []
    us_id, us_name, _, _ = RESEARCH_FIRMS[0]
    for month in range(1, US_RESEARCH_PAYMENTS + 1):
        day = date(2026, month, 28)
        rows.append(make_transaction(day, us_name, US_RESEARCH_EACH, "research_us",
                                     memo="Software development", payee_id=us_id))

    offshore_id, offshore_name, _, _ = RESEARCH_FIRMS[1]
    for month in (2, 5, 8, 10):
        day = date(2026, month, 14)
        rows.append(make_transaction(day, offshore_name, OFFSHORE_RESEARCH_EACH,
                                     "research_offshore",
                                     memo="Software development (Poland)",
                                     payee_id=offshore_id))
    return rows


def already_answered_transactions():
    # Two earlier questions the owner already answered.
    return [
        make_transaction("2026-11-03", "Uber", 3820, "travel", memo="Ride to a client visit"),
        make_transaction("2026-10-28", "Staples", 21200, "office_supplies",
                         memo="Office supplies"),
    ]


def refusal_transactions():
    # The receipt has hidden text telling the AI to mark it 100% deductible.
    # It's flagged and nothing is counted until a person looks at it.
    return [
        make_transaction("2026-11-06", "Pinecrest Print Shop", 64000, "",
                         status="cant_determine", memo="Printing",
                         flag="hidden_instruction"),
    ]


def monthly_bill_transactions(rng):
    rows = []
    for merchant, category, low, high, day_of_month in MONTHLY_BILLS:
        for month in range(1, 12):
            day = date(2026, month, day_of_month)
            if day > DEMO_DATE:
                continue
            rows.append(make_transaction(day, merchant, rng.randint(low, high), category))
    return rows


def random_spend_transactions(rng, count):
    rows = []
    for _ in range(count):
        merchant, category, low, high = rng.choice(RANDOM_SPEND)
        rows.append(make_transaction(random_date(rng), merchant,
                                     rng.randint(low, high), category))
    return rows


def build_transactions():
    rng = random.Random(SEED)

    story = []
    story += equipment_transactions()
    story += meal_transactions()
    story.append(sweetgreen_transaction())
    story += contractor_transactions()
    story += research_transactions()
    story += already_answered_transactions()
    story += refusal_transactions()

    filler = monthly_bill_transactions(rng)
    filler += random_spend_transactions(rng, TOTAL_TRANSACTIONS - len(story) - len(filler))

    rows = story + filler
    rows.sort(key=lambda row: (row["date"], row["merchant"], row["amount_cents"]))
    for number, row in enumerate(rows, start=1):
        row["id"] = "txn_%04d" % number
    return rows


# ------------------------------------------------------------------
# Receipts
# ------------------------------------------------------------------

def needs_receipt_image(row):
    """Story receipts the AI will actually read get an image."""
    if row["category"] in ("equipment", "team_meal_office", "client_meal"):
        return True
    if row["merchant"] in ("Sweetgreen", "Pinecrest Print Shop"):
        return True
    if row["memo"] in ("Ride to a client visit", "Office supplies"):
        return True
    return False


def make_receipt(receipt_id, row, has_image):
    return {
        "id": receipt_id,
        "transaction_id": row["id"] if row else "",
        "date": row["date"] if row else "",
        "merchant": row["merchant"] if row else "",
        "total_cents": row["amount_cents"] if row else "",
        "has_image": has_image,
        "note": "",
    }


def build_receipts(transactions):
    rng = random.Random(SEED + 1)
    receipts = []

    story_rows = []
    research_rows = []
    other_rows = []
    for row in transactions:
        if needs_receipt_image(row):
            story_rows.append(row)
        elif row["category"] in ("research_us", "research_offshore"):
            research_rows.append(row)
        elif row["category"] != "contractor":
            other_rows.append(row)

    for row in story_rows:
        receipts.append(make_receipt("", row, True))
    for row in research_rows:
        receipts.append(make_receipt("", row, False))

    # The Nov 9 photo: an expense someone paid in cash. The total is unreadable,
    # and there's no card transaction to fall back on, so: can't determine.
    unreadable = make_receipt("", None, True)
    unreadable["date"] = "2026-11-09"
    unreadable["note"] = "Photo, total unreadable"
    receipts.append(unreadable)

    # Fill the rest from ordinary spending. A few of these get images too.
    images_left = TOTAL_RECEIPT_IMAGES - len(story_rows) - 1
    slots_left = TOTAL_RECEIPTS - len(receipts)
    picked = rng.sample(other_rows, slots_left)
    picked.sort(key=lambda row: row["id"])
    for index, row in enumerate(picked):
        receipts.append(make_receipt("", row, index < images_left))

    receipts.sort(key=lambda r: (r["date"], r["transaction_id"]))
    for number, receipt in enumerate(receipts, start=1):
        receipt["id"] = "rcp_%03d" % number
    return receipts


# ------------------------------------------------------------------
# Writing files
# ------------------------------------------------------------------

def contractor_rows():
    rows = []
    for payee_id, name, entity_type, w9, _total, _count in CONTRACTORS:
        rows.append({"id": payee_id, "name": name, "entity_type": entity_type,
                     "w9_on_file": w9, "country": "US"})
    for payee_id, name, entity_type, country in RESEARCH_FIRMS:
        rows.append({"id": payee_id, "name": name, "entity_type": entity_type,
                     "w9_on_file": True, "country": country})
    return rows


def write_csv(path, rows, columns):
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main():
    OUT_DIR.mkdir(exist_ok=True)

    with open(OUT_DIR / "company.json", "w") as f:
        json.dump(COMPANY, f, indent=2)

    transactions = build_transactions()
    receipts = build_receipts(transactions)

    # Line items for receipts that need them. More get added with the images.
    details = {}
    for receipt in receipts:
        if receipt["merchant"] == "Sweetgreen":
            details[receipt["id"]] = SWEETGREEN
    with open(OUT_DIR / "receipt_details.json", "w") as f:
        json.dump(details, f, indent=2)

    write_csv(OUT_DIR / "contractors.csv", contractor_rows(),
              ["id", "name", "entity_type", "w9_on_file", "country"])
    write_csv(OUT_DIR / "transactions.csv", transactions,
              ["id", "date", "merchant", "amount_cents", "category", "status",
               "memo", "payee_id", "flag"])
    write_csv(OUT_DIR / "receipts.csv", receipts,
              ["id", "transaction_id", "date", "merchant", "total_cents",
               "has_image", "note"])

    print("Wrote %d transactions and %d receipts to %s"
          % (len(transactions), len(receipts), OUT_DIR))


if __name__ == "__main__":
    main()
