from datetime import date

from engine.clock import tax_year_clock, upcoming_deadlines


def test_nov_19_has_42_days_left(rules_2026, demo_date):
    clock = tax_year_clock(demo_date, rules_2026)
    assert clock["days_left"] == 42
    assert clock["days_gone"] == 322
    assert clock["day_of_year"] == 323
    assert clock["days_in_year"] == 365
    assert clock["percent_gone"] == 88.2
    assert clock["ruleset_version"] == "2026.1"


def test_first_and_last_day(rules_2026):
    assert tax_year_clock(date(2026, 1, 1), rules_2026)["days_left"] == 364
    assert tax_year_clock(date(2026, 12, 31), rules_2026)["days_left"] == 0


def test_after_the_year_ends_nothing_is_left(rules_2026):
    clock = tax_year_clock(date(2027, 1, 5), rules_2026)
    assert clock["days_left"] == 0
    assert clock["days_gone"] == 365


def test_deadlines_from_nov_19(rules_2026, demo_date):
    deadlines = upcoming_deadlines(demo_date, rules_2026)
    summary = [(d["rule_id"], d["date"], d["days_until"]) for d in deadlines]
    assert summary == [
        ("ca_corp_q4_estimate", date(2026, 12, 15), 26),
        ("placed_in_service_deadline", date(2026, 12, 31), 42),
        ("owners_q4_estimate", date(2027, 1, 15), 57),
        ("fed_1099_nec_due", date(2027, 2, 1), 74),
    ]


def test_past_deadlines_are_dropped(rules_2026):
    deadlines = upcoming_deadlines(date(2027, 1, 20), rules_2026)
    assert [d["rule_id"] for d in deadlines] == ["fed_1099_nec_due"]
