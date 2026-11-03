from engine.research import research_summary


def row_for(summary, where):
    for row in summary["rows"]:
        if row["where"] == where:
            return row
    raise AssertionError(f"no row for {where}")


def test_us_research_deducted_now_on_both(tidewell, rules_2026):
    us = row_for(research_summary(tidewell.transactions, rules_2026), "us")
    assert us["spent_cents"] == 18640000
    assert us["federal"]["this_year_cents"] == 18640000
    assert us["california"]["this_year_cents"] == 18640000


def test_offshore_research_spread_federal_deducted_california(tidewell, rules_2026):
    offshore = row_for(research_summary(tidewell.transactions, rules_2026), "offshore")
    assert offshore["spent_cents"] == 4120000
    assert offshore["federal"]["treatment"] == "amortize"
    assert offshore["federal"]["years"] == 15
    # Year one gets half a year's share: $41,200 / 30 = $1,373.33.
    assert offshore["federal"]["this_year_cents"] == 137333
    assert offshore["federal"]["later_cents"] == 4120000 - 137333
    assert offshore["california"]["this_year_cents"] == 4120000
