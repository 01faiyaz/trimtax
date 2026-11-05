from engine.meals import deductible, meal_outcomes, meals_summary


def row_for(summary, category):
    for row in summary["rows"]:
        if row["category"] == category:
            return row
    raise AssertionError(f"no row for {category}")


def test_team_meals_0_federal_100_california(tidewell, rules_2026):
    team = row_for(meals_summary(tidewell.transactions, rules_2026), "team_meal_office")
    assert team["spent_cents"] == 418000
    assert team["federal"]["deductible_cents"] == 0
    assert team["california"]["deductible_cents"] == 418000
    assert team["california"]["check_status"] == "checked"


def test_client_meals_50_on_both(tidewell, rules_2026):
    client = row_for(meals_summary(tidewell.transactions, rules_2026), "client_meal")
    assert client["spent_cents"] == 296000
    assert client["federal"]["deductible_cents"] == 148000
    assert client["california"]["deductible_cents"] == 148000


def test_sweetgreen_is_not_counted_until_answered(tidewell, rules_2026):
    summary = meals_summary(tidewell.transactions, rules_2026)
    total = sum(row["spent_cents"] for row in summary["rows"])
    assert total == 418000 + 296000


def test_sweetgreen_outcomes(rules_2026):
    outcomes = meal_outcomes(41200, rules_2026, ["team_meal_office", "client_meal"])["outcomes"]
    assert outcomes["team_meal_office"]["federal"]["deductible_cents"] == 0
    assert outcomes["team_meal_office"]["california"]["deductible_cents"] == 41200
    assert outcomes["client_meal"]["federal"]["deductible_cents"] == 20600
    assert outcomes["client_meal"]["california"]["deductible_cents"] == 20600


def test_undecided_rule_gives_cant_determine(rules_2026):
    result = deductible(5000, rules_2026.rule("ca_snacks_coffee"))
    assert result["state"] == "cant_determine"
    assert result["deductible_cents"] is None


def test_team_meals_were_50_percent_federal_in_2025(tidewell, rules_2025, rules_2026):
    old_rules = rules_2025.moved_to_year_of(rules_2026)
    team = row_for(meals_summary(tidewell.transactions, old_rules), "team_meal_office")
    assert team["federal"]["deductible_cents"] == 209000
