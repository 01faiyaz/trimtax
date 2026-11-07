"""Approvals in the rules files stay honest.

A rule counts as approved only with a name and a date, and only if it was
checked against its source. Every number in the demo has to come from an
approved rule.
"""

from engine.meals import meals_summary

# Rules Sean reviewed and left open on Nov 6, 2026 (sources split).
STILL_OPEN_2026 = {"fed_snacks_coffee", "ca_snacks_coffee"}


def test_approved_rules_have_a_name_a_date_and_were_checked(rules_2025, rules_2026):
    for ruleset in (rules_2025, rules_2026):
        for rule in ruleset.rules.values():
            if rule["approved_by"]:
                assert rule["approved_on"], rule["id"]
                assert rule["check_status"] == "checked", rule["id"]


def test_only_the_expected_rules_are_still_open(rules_2026):
    open_rules = {rule_id for rule_id, rule in rules_2026.rules.items() if not rule["approved_by"]}
    assert open_rules == STILL_OPEN_2026


def test_california_team_meals_approved_at_100(rules_2026):
    rule = rules_2026.rule("ca_team_meals_office")
    assert rule["percent"] == 100
    assert rule["approved_by"] == "Faiyaz Mashrafi"
    assert "depends on the facts" in rule["note"]


def test_sean_approved_the_california_rules_he_checked(rules_2026):
    for rule_id in ("ca_bonus_depreciation", "ca_section_179", "ca_ftb_1099_threshold",
                    "ca_s_corp_tax", "ca_corp_q4_estimate"):
        rule = rules_2026.rule(rule_id)
        assert rule["approved_by"] == "Sean Zhou", rule_id
        assert rule["source"]["url"], rule_id


def test_every_meal_number_in_the_demo_uses_an_approved_rule(tidewell, rules_2026):
    for row in meals_summary(tidewell.transactions, rules_2026)["rows"]:
        for side in ("federal", "california"):
            rule = rules_2026.rule(row[side]["rule_id"])
            assert rule["approved_by"], rule["id"]
