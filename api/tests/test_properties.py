"""Property tests: rules that must hold for any input, not just the demo numbers."""

from dataclasses import replace
from datetime import date

from hypothesis import given
from hypothesis import strategies as st

from engine.equipment import check_purchase, section_179_cap
from engine.money import dollars, percent_of
from engine.records import Company, Transaction
from engine.rules import load_ruleset

RULES = load_ruleset(2026)
COMPANY = Company("Test Co", "s_corporation", "CA", 12000000, True)

cents = st.integers(min_value=0, max_value=10_000_000_00)
prices = st.integers(min_value=1, max_value=50_000_00)
quantities = st.integers(min_value=1, max_value=50)
incomes = st.integers(min_value=0, max_value=1_000_000_00)


def equipment(amounts):
    rows = []
    for number, amount in enumerate(amounts):
        rows.append(Transaction(f"t{number}", date(2026, 3, 1), "Vendor", amount,
                                "equipment", "confirmed"))
    return rows


@given(cents, st.sampled_from([0, 24, 50, 100]))
def test_percent_of_stays_in_range(amount, percent):
    result = percent_of(amount, percent)
    assert 0 <= result <= amount


@given(cents)
def test_dollars_round_trips(amount):
    text = dollars(amount).replace("$", "").replace(",", "")
    whole, fraction = text.split(".")
    assert int(whole) * 100 + int(fraction) == amount


@given(cents, incomes)
def test_179_cap_never_negative_or_over_the_limit(bought, income):
    rule = RULES.rule("ca_section_179")
    cap = section_179_cap(rule, bought, income)
    assert 0 <= cap <= rule["limit_cents"]


@given(prices, quantities, st.lists(prices, max_size=6), incomes, st.booleans())
def test_purchase_check_adds_up(price, quantity, earlier, income, election):
    company = replace(COMPANY, expected_net_income_cents=income, small_item_election=election)
    result = check_purchase(price, quantity, date(2026, 12, 10), date(2026, 11, 19),
                            equipment(earlier), RULES, company)
    total = result["total_cents"]

    for side in ("federal", "california"):
        now = result[side]["this_year_cents"]
        later = result[side]["later_cents"]
        assert now >= 0 and later >= 0
        assert now + later == total

    # California can never write off more than the room it had,
    # unless the purchase used the small-item rule instead.
    if result["california"]["how"] == "section_179":
        assert result["california"]["this_year_cents"] <= result["california_room_before_cents"]
    assert result["california_room_after_cents"] >= 0
    # Federal is never less generous than California here.
    assert result["federal"]["this_year_cents"] >= result["california"]["this_year_cents"]
