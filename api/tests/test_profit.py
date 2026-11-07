from dataclasses import replace

from engine.profit import california_s_corp_tax, tax_on_profit


def test_one_and_a_half_percent_with_an_800_floor(rules_2026):
    assert california_s_corp_tax(12000000, rules_2026) == 180000  # $120,000 -> $1,800
    assert california_s_corp_tax(4000000, rules_2026) == 80000    # $40,000 -> $600, so $800
    assert california_s_corp_tax(-500000, rules_2026) == 80000    # a loss still owes $800


def test_tidewell_with_and_without_the_laptops(tidewell, rules_2026):
    plain = tax_on_profit(tidewell.company, rules_2026)
    assert plain["profit_cents"] == 12000000
    assert plain["california_tax_cents"] == 180000
    assert plain["with_purchase"] is None

    laptops = tax_on_profit(tidewell.company, rules_2026, 660000)
    assert laptops["with_purchase"]["california_tax_cents"] == 170100
    assert laptops["with_purchase"]["change_cents"] == -9900


def test_only_for_s_corporations(tidewell, rules_2026):
    other = replace(tidewell.company, entity_type="c_corporation")
    assert tax_on_profit(other, rules_2026) is None
