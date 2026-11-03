"""Fails if the synthetic data stops matching the locked demo numbers.

The numbers come from the project doc "TrimTax — Design lock and demo numbers".
Every amount is in cents. Run from the repo root:

    python -m pytest data
"""

import csv
import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent
TIDEWELL = DATA_DIR / "tidewell"

sys.path.insert(0, str(DATA_DIR))
import generate  # noqa: E402


def load_csv(name):
    with open(TIDEWELL / name, newline="") as f:
        return list(csv.DictReader(f))


def transactions():
    rows = load_csv("transactions.csv")
    for row in rows:
        row["amount_cents"] = int(row["amount_cents"])
    return rows


def total_for(category):
    total = 0
    for row in transactions():
        if row["category"] == category and row["status"] == "confirmed":
            total += row["amount_cents"]
    return total


def find(merchant, day):
    matches = []
    for row in transactions():
        if row["merchant"] == merchant and row["date"] == day:
            matches.append(row)
    assert len(matches) == 1, f"expected one {merchant} on {day}, found {len(matches)}"
    return matches[0]


def contractor_totals():
    totals = {}
    for row in transactions():
        if row["category"] == "contractor":
            totals[row["payee_id"]] = totals.get(row["payee_id"], 0) + row["amount_cents"]
    return totals


def contractors_by_name():
    by_name = {}
    for row in load_csv("contractors.csv"):
        by_name[row["name"]] = row
    return by_name


# ------------------------------------------------------------------
# The files on disk match what the generator builds
# ------------------------------------------------------------------

def test_files_are_up_to_date():
    fresh = generate.build_transactions()
    on_disk = transactions()
    assert len(fresh) == len(on_disk)
    for new, old in zip(fresh, on_disk):
        assert new["id"] == old["id"]
        assert new["amount_cents"] == old["amount_cents"], "run: python data/generate.py"


def test_counts():
    assert len(transactions()) == 400
    assert len(load_csv("receipts.csv")) == 142


def test_receipt_images():
    with_image = [r for r in load_csv("receipts.csv") if r["has_image"] == "True"]
    assert len(with_image) == 40


def test_nothing_after_demo_date():
    for row in transactions():
        assert row["date"] <= "2026-11-19"
    for row in load_csv("receipts.csv"):
        assert row["date"] <= "2026-11-19"


# ------------------------------------------------------------------
# Company
# ------------------------------------------------------------------

def test_company_profile():
    company = json.loads((TIDEWELL / "company.json").read_text())
    assert company["entity_type"] == "s_corporation"
    assert company["state"] == "CA"
    assert company["employees"] == 8
    assert company["expected_net_income_cents"] == 12000000
    # California's equipment write-off can't exceed business income.
    assert company["expected_net_income_cents"] >= 2500000
    assert company["demo_date"] == "2026-11-19"
    assert company["label"] == "Synthetic demo data"


# ------------------------------------------------------------------
# Equipment: California room is $25,000 - $18,400 = $6,600
# ------------------------------------------------------------------

def test_equipment_receipts():
    assert find("Apple", "2026-03-03")["amount_cents"] == 769700
    assert find("Dell", "2026-06-18")["amount_cents"] == 396000
    assert find("Herman Miller", "2026-06-18")["amount_cents"] == 412000
    assert find("B&H Photo", "2026-09-09")["amount_cents"] == 262300


def test_equipment_total_and_room_left():
    equipment = [r for r in transactions() if r["category"] == "equipment"]
    assert len(equipment) == 4
    assert total_for("equipment") == 1840000
    assert 2500000 - total_for("equipment") == 660000


def test_every_equipment_item_is_over_the_small_item_line():
    # Apple is 2 laptops at $3,848.50, the rest are single items.
    assert 769700 // 2 > 250000
    for row in transactions():
        if row["category"] == "equipment" and row["merchant"] != "Apple":
            assert row["amount_cents"] > 250000


# ------------------------------------------------------------------
# Meals
# ------------------------------------------------------------------

def test_meal_totals():
    assert total_for("team_meal_office") == 418000
    assert total_for("client_meal") == 296000


def test_sweetgreen_waits_for_an_answer():
    row = find("Sweetgreen", "2026-11-13")
    assert row["amount_cents"] == 41200
    assert row["status"] == "needs_answer"
    assert row["category"] == ""
    # Either answer gives the locked totals.
    assert total_for("team_meal_office") + 41200 == 459200
    assert total_for("client_meal") + 41200 == 337200


def test_sweetgreen_receipt_adds_up():
    details = json.loads((TIDEWELL / "receipt_details.json").read_text())
    sweetgreen = [d for d in details.values() if d["merchant"] == "Sweetgreen"][0]
    line_total = 0
    for _name, quantity, each in sweetgreen["lines"]:
        line_total += quantity * each
    assert sweetgreen["lines"][0] == ["Harvest Bowl", 22, 1450]  # $319.00
    assert line_total == sweetgreen["subtotal_cents"] == 37370
    assert sweetgreen["subtotal_cents"] + sweetgreen["tax_cents"] == 41200
    assert sweetgreen["time"] == "12:18"


# ------------------------------------------------------------------
# Contractors
# ------------------------------------------------------------------

def test_dana_and_arjun():
    people = contractors_by_name()
    totals = contractor_totals()
    dana = people["Dana Reyes"]
    arjun = people["Arjun Patel"]
    assert totals[dana["id"]] == 185000
    assert dana["w9_on_file"] == "False"
    assert 200000 - totals[dana["id"]] == 15000
    assert totals[arjun["id"]] == 170000
    assert 200000 - totals[arjun["id"]] == 30000


def test_forms_needed_old_line_vs_new_line():
    totals = contractor_totals()
    over_new_line = [t for t in totals.values() if t >= 200000]
    over_old_line = [t for t in totals.values() if t >= 60000]
    assert len(over_new_line) == 4
    assert len(over_old_line) == 13


def test_contractors_are_people_not_companies():
    # DE 542 only applies to individuals and sole proprietors.
    people = contractors_by_name()
    for payee_id in contractor_totals():
        match = [p for p in people.values() if p["id"] == payee_id][0]
        assert match["entity_type"] in ("individual", "sole_proprietor", "single_member_llc")


# ------------------------------------------------------------------
# Research
# ------------------------------------------------------------------

def test_research_totals():
    assert total_for("research_us") == 18640000
    assert total_for("research_offshore") == 4120000


# ------------------------------------------------------------------
# Earlier answers and refusals
# ------------------------------------------------------------------

def test_already_answered():
    uber = find("Uber", "2026-11-03")
    assert uber["amount_cents"] == 3820
    assert uber["category"] == "travel"
    staples = find("Staples", "2026-10-28")
    assert staples["amount_cents"] == 21200
    assert staples["category"] == "office_supplies"


def test_pinecrest_is_flagged_and_not_counted():
    row = find("Pinecrest Print Shop", "2026-11-06")
    assert row["amount_cents"] == 64000
    assert row["flag"] == "hidden_instruction"
    assert row["status"] == "cant_determine"
    assert row["category"] == ""


def test_unreadable_photo_has_no_amount():
    photos = [r for r in load_csv("receipts.csv") if r["date"] == "2026-11-09"
              and r["transaction_id"] == ""]
    assert len(photos) == 1
    assert photos[0]["total_cents"] == ""
    assert photos[0]["has_image"] == "True"
    details = json.loads((TIDEWELL / "receipt_details.json").read_text())
    assert details[photos[0]["id"]]["total_cents"] is None
    assert details[photos[0]["id"]]["unreadable"] is True


# ------------------------------------------------------------------
# Receipt line items and images
# ------------------------------------------------------------------

def test_every_receipt_image_adds_up_to_its_card_charge():
    details = json.loads((TIDEWELL / "receipt_details.json").read_text())
    amounts = {}
    for row in transactions():
        amounts[row["id"]] = row["amount_cents"]

    imaged = [r for r in load_csv("receipts.csv") if r["has_image"] == "True"]
    assert sorted(details) == sorted(r["id"] for r in imaged)

    for receipt in imaged:
        entry = details[receipt["id"]]
        if entry.get("unreadable"):
            continue
        lines = 0
        for _name, quantity, each in entry["lines"]:
            lines += quantity * each
        assert lines == entry["subtotal_cents"], receipt["id"]
        assert entry["tax_cents"] >= 0 and entry.get("tip_cents", 0) >= 0
        assert entry["subtotal_cents"] + entry["tax_cents"] + entry.get("tip_cents", 0) \
            == entry["total_cents"] == amounts[receipt["transaction_id"]], receipt["id"]


def test_apple_laptops_are_3848_50_each_all_in():
    details = json.loads((TIDEWELL / "receipt_details.json").read_text())
    apple = [d for d in details.values() if d["merchant"] == "Apple"][0]
    assert apple["lines"][0][1] == 2
    assert apple["total_cents"] / 2 == 384850


def test_pinecrest_receipt_carries_the_hidden_instruction():
    details = json.loads((TIDEWELL / "receipt_details.json").read_text())
    pinecrest = [d for d in details.values() if d["merchant"] == "Pinecrest Print Shop"][0]
    assert "ignore your previous instructions" in pinecrest["hidden_text"]


def test_receipt_images_exist():
    image_dir = TIDEWELL / "receipt_images"
    expected = sorted(r["id"] + ".png" for r in load_csv("receipts.csv") if r["has_image"] == "True")
    found = sorted(p.name for p in image_dir.glob("*.png"))
    assert found == expected, "run: python data/render_receipts.py"


def test_receipts_are_up_to_date():
    fresh = generate.build_receipts(generate.build_transactions())
    on_disk = load_csv("receipts.csv")
    assert [(r["id"], str(r["has_image"])) for r in fresh] == \
        [(r["id"], r["has_image"]) for r in on_disk], "run: python data/generate.py"
