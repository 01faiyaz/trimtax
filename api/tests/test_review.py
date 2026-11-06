from datetime import date

from engine.compare import compare_years
from engine.overview import overview
from engine.review import flagged_documents, open_items, receipts_filed


def test_three_open_items(tidewell, rules_2026):
    items = open_items(tidewell, rules_2026)
    assert [item["kind"] for item in items] == ["question", "missing_w9", "de542_unclear"]
    assert items[0]["merchant"] == "Sweetgreen"
    assert items[0]["amount_cents"] == 41200
    assert items[0]["question"] == "Was this lunch for your team at the office, or a client?"
    assert items[1]["name"] == "Dana Reyes"


def test_flagged_documents(tidewell):
    flagged = flagged_documents(tidewell)
    kinds = [(f["kind"], f["date"]) for f in flagged]
    assert ("hidden_instruction", date(2026, 11, 6)) in kinds
    assert ("unreadable_total", date(2026, 11, 9)) in kinds
    assert len(flagged) == 2
    for item in flagged:
        assert item["state"] == "cant_determine"


def test_142_receipts_filed(tidewell, demo_date):
    assert receipts_filed(tidewell, demo_date) == 142


def test_rules_changed_2025_to_2026(tidewell, rules_2025, rules_2026):
    result = compare_years(tidewell, rules_2025, rules_2026)
    assert result["forms_needed"] == {"before": 13, "after": 4}
    assert result["team_meals_federal_deductible"] == {"before": 209000, "after": 0}

    changes = {(c["rule_id"], c["field"]): (c["before"], c["after"]) for c in result["rule_changes"]}
    assert changes[("fed_1099_nec_threshold", "threshold_cents")] == (60000, 200000)
    assert changes[("fed_team_meals_office", "percent")] == (50, 0)
    assert changes[("fed_section_179", "limit_cents")] == (250000000, 256000000)
    # Things that didn't change aren't listed.
    assert ("de_minimis_safe_harbor", "per_item_limit_cents") not in changes
    assert ("fed_client_meals", "percent") not in changes


def test_overview_has_every_demo_number(tidewell, rules_2026, demo_date):
    view = overview(tidewell, rules_2026, demo_date)
    assert view["clock"]["days_left"] == 42
    assert view["california_equipment"]["room_cents"] == 660000
    assert view["contractors"]["forms_needed"] == 4
    assert len(view["open_items"]) == 3
    assert view["receipts_filed"] == 142
    assert view["ruleset_version"] == "2026.1"
