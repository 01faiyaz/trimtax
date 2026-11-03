from dataclasses import replace
from datetime import date

import pytest

from engine.equipment import (
    california_room,
    check_purchase,
    federal_equipment,
    section_179_cap,
    small_item_check,
)
from engine.records import Transaction

IN_USE_BY = date(2026, 12, 10)


def check(price_each, quantity, workspace, ruleset, demo_date, in_use_by=IN_USE_BY, company=None):
    return check_purchase(price_each, quantity, in_use_by, demo_date,
                          workspace.transactions, ruleset, company or workspace.company)


def test_california_room_is_6600(tidewell, rules_2026):
    room = california_room(tidewell.transactions, rules_2026, tidewell.company)
    assert room["limit_cents"] == 2500000
    assert room["used_cents"] == 1840000
    assert room["room_cents"] == 660000


def test_federal_writes_off_all_equipment(tidewell, rules_2026):
    federal = federal_equipment(tidewell.transactions, rules_2026)
    assert federal["bought_cents"] == 1840000
    assert federal["written_off_this_year_cents"] == 1840000
    assert federal["section_179_limit_cents"] == 256000000


def test_three_laptops_at_2899(tidewell, rules_2026, demo_date):
    result = check(289900, 3, tidewell, rules_2026, demo_date)
    assert result["total_cents"] == 869700
    assert result["small_item"]["qualifies"] is False
    assert result["small_item"]["over_line_cents"] == 39900
    assert result["federal"]["this_year_cents"] == 869700
    assert result["federal"]["how"] == "bonus_depreciation"
    assert result["california"]["this_year_cents"] == 660000
    assert result["california"]["later_cents"] == 209700
    assert result["california_room_before_cents"] == 660000
    assert result["california_room_after_cents"] == 0
    assert result["state"] == "confirmed"
    assert result["ruleset_version"] == "2026.1"


def test_three_laptops_at_2399(tidewell, rules_2026, demo_date):
    result = check(239900, 3, tidewell, rules_2026, demo_date)
    assert result["total_cents"] == 719700
    assert result["small_item"]["qualifies"] is True
    assert result["small_item"]["under_line_cents"] == 10100
    assert result["federal"]["this_year_cents"] == 719700
    assert result["california"]["this_year_cents"] == 719700
    assert result["california"]["how"] == "small_item"
    # Small items don't use California's equipment room.
    assert result["california_room_after_cents"] == 660000


def test_exactly_2500_qualifies_but_one_cent_more_does_not(tidewell, rules_2026):
    assert small_item_check(250000, rules_2026, tidewell.company)["qualifies"] is True
    assert small_item_check(250001, rules_2026, tidewell.company)["qualifies"] is False


def test_no_small_item_election_means_equipment(tidewell, rules_2026, demo_date):
    no_election = replace(tidewell.company, small_item_election=False)
    result = check(239900, 3, tidewell, rules_2026, demo_date, company=no_election)
    assert result["small_item"]["qualifies"] is False
    assert result["california"]["how"] == "section_179"
    assert result["california"]["this_year_cents"] == 660000
    assert result["california"]["later_cents"] == 59700


def test_not_in_use_by_dec_31_counts_next_year(tidewell, rules_2026, demo_date):
    result = check(289900, 3, tidewell, rules_2026, demo_date, in_use_by=date(2027, 1, 4))
    assert result["in_use_in_time"] is False
    assert result["federal"]["this_year_cents"] == 0
    assert result["california"]["this_year_cents"] == 0
    assert result["california_room_after_cents"] == 660000


def test_rejects_zero_quantity(tidewell, rules_2026, demo_date):
    with pytest.raises(ValueError):
        check(289900, 0, tidewell, rules_2026, demo_date)


def test_california_phaseout_shrinks_the_cap(rules_2026):
    rule = rules_2026.rule("ca_section_179")
    # $210,000 bought is $10,000 over the $200,000 line, so the cap drops to $15,000.
    assert section_179_cap(rule, 21000000, 12000000) == 1500000
    # $225,000 or more bought: no California Section 179 at all.
    assert section_179_cap(rule, 22500000, 12000000) == 0


def test_california_cap_is_limited_to_business_income(rules_2026):
    rule = rules_2026.rule("ca_section_179")
    assert section_179_cap(rule, 1000000, 1800000) == 1800000


def test_bonus_depreciation_before_jan_20_2025_uses_179_first(tidewell, rules_2025):
    # Under the 2025 rules, equipment bought before Jan 20, 2025 got 40% bonus,
    # with Section 179 used first. Plenty of 179 room here, so it's all this year.
    early = Transaction("t", date(2025, 1, 10), "Dell", 100000, "equipment", "confirmed")
    result = check_purchase(300000, 1, date(2025, 3, 1), date(2025, 1, 10),
                            [early], rules_2025, tidewell.company)
    assert result["federal"]["how"] == "section_179_and_bonus"
    assert result["federal"]["this_year_cents"] == 300000
