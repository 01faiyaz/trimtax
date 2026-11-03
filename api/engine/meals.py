"""Meals: how much of each kind of meal spending is deductible, federal vs California."""

from engine.money import percent_of

# Each meal category and the federal and California rules that apply to it.
MEAL_RULES = {
    "team_meal_office": ("fed_team_meals_office", "ca_team_meals_office"),
    "client_meal": ("fed_client_meals", "ca_client_meals"),
    "client_entertainment": ("fed_client_entertainment", "ca_client_entertainment"),
    "snacks_coffee": ("fed_snacks_coffee", "ca_snacks_coffee"),
}


def deductible(cents, rule):
    """Apply one percentage rule. A rule with no percent means "not decided"."""
    percent = rule.get("percent")
    if percent is None:
        return {
            "state": "cant_determine",
            "percent": None,
            "deductible_cents": None,
            "rule_id": rule["id"],
            "check_status": rule["check_status"],
        }
    return {
        "state": "confirmed",
        "percent": percent,
        "deductible_cents": percent_of(cents, percent),
        "rule_id": rule["id"],
        "check_status": rule["check_status"],
    }


def spent_on(category, transactions, ruleset):
    total = 0
    for t in transactions:
        if t.category == category and t.status == "confirmed" and ruleset.covers(t.date):
            total += t.amount_cents
    return total


def meals_summary(transactions, ruleset):
    """One row per meal category that has spending."""
    rows = []
    for category, (federal_id, california_id) in MEAL_RULES.items():
        spent = spent_on(category, transactions, ruleset)
        if spent == 0:
            continue
        rows.append({
            "category": category,
            "spent_cents": spent,
            "federal": deductible(spent, ruleset.rule(federal_id)),
            "california": deductible(spent, ruleset.rule(california_id)),
        })
    return {"rows": rows, "ruleset_version": ruleset.version}


def meal_outcomes(amount_cents, ruleset, categories=None):
    """For a meal waiting on an answer: what each possible answer would mean.

    Sweetgreen $412: team meal -> $0 federal, $412 California;
    client meal -> $206 federal, $206 California.
    """
    if categories is None:
        categories = list(MEAL_RULES)
    outcomes = {}
    for category in categories:
        federal_id, california_id = MEAL_RULES[category]
        outcomes[category] = {
            "federal": deductible(amount_cents, ruleset.rule(federal_id)),
            "california": deductible(amount_cents, ruleset.rule(california_id)),
        }
    return {"amount_cents": amount_cents, "outcomes": outcomes, "ruleset_version": ruleset.version}
