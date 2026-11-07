from engine.categories import CATEGORIES
from engine.treatment import same_treatment, treatment, worth_asking


def test_every_category_is_handled(rules_2026):
    for category in CATEGORIES:
        treatment(category, rules_2026)  # never raises


def test_ordinary_costs_are_treated_the_same(rules_2026):
    assert same_treatment("software", "advertising", rules_2026)
    assert same_treatment("rent_utilities", "travel", rules_2026)


def test_equipment_contractors_and_research_are_never_the_same_as_anything(rules_2026):
    assert not same_treatment("equipment", "office_supplies", rules_2026)
    assert not same_treatment("contractor", "research_us", rules_2026)
    assert not same_treatment("research_us", "research_offshore", rules_2026)
    assert not same_treatment("research_us", "software", rules_2026)


def test_other_is_unknown_so_never_the_same(rules_2026):
    assert treatment("other", rules_2026) is None
    assert not same_treatment("other", "other", rules_2026)
    assert not same_treatment("travel", "other", rules_2026)


def test_meals_compare_by_their_rules(rules_2026, rules_2025):
    # 2026: team meal 0% federal / 100% California, client meal 50% / 50%
    assert not same_treatment("team_meal_office", "client_meal", rules_2026)
    # 2025: still different, because California is 100% vs 50%
    assert not same_treatment("team_meal_office", "client_meal", rules_2025)
    assert not same_treatment("client_meal", "client_entertainment", rules_2026)


def test_snacks_are_treated_like_team_meals_in_2026(rules_2026):
    # 0% federal, 100% California, like team meals at the office; not like supplies
    assert treatment("snacks_coffee", rules_2026) == ("meal", 0, 100)
    assert same_treatment("snacks_coffee", "team_meal_office", rules_2026)
    assert not same_treatment("snacks_coffee", "office_supplies", rules_2026)


def test_no_question_when_every_option_is_treated_the_same(rules_2026):
    assert worth_asking(["software", "advertising"], rules_2026) == []
    assert worth_asking(["travel", "rent_utilities", "software"], rules_2026) == []


def test_question_pairs_the_top_pick_with_the_next_one_that_differs(rules_2026):
    assert worth_asking(["team_meal_office", "client_meal"], rules_2026) == ["team_meal_office", "client_meal"]
    assert worth_asking(["software", "advertising", "equipment"], rules_2026) == ["software", "equipment"]
    assert worth_asking(["office_supplies", "equipment"], rules_2026) == ["office_supplies", "equipment"]


def test_one_option_or_none_needs_no_question(rules_2026):
    assert worth_asking(["software"], rules_2026) == []
    assert worth_asking([], rules_2026) == []
