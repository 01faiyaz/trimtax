"""Research spending (building software counts as research).

Plain words: federal deducts US research now and spreads offshore research
over 15 years. California deducts both now.
"""


def spent_on(category, transactions, ruleset):
    total = 0
    for t in transactions:
        if t.category == category and t.status == "confirmed" and ruleset.covers(t.date):
            total += t.amount_cents
    return total


def this_year_amount(total_cents, rule):
    """How much of a research cost is deducted in the year it's paid."""
    if rule["treatment"] == "deduct_now":
        return total_cents
    # Amortized: the clock starts at the middle of the year, so year one
    # gets half a year's share (1/30 of the cost over 15 years).
    half_years = rule["years"] * 2
    return (total_cents + rule["years"]) // half_years


def research_summary(transactions, ruleset):
    us = spent_on("research_us", transactions, ruleset)
    offshore = spent_on("research_offshore", transactions, ruleset)

    federal_us = ruleset.rule("fed_research_us")
    federal_offshore = ruleset.rule("fed_research_foreign")
    california = ruleset.rule("ca_research_all")

    rows = []
    for label, spent, federal_rule in (("us", us, federal_us), ("offshore", offshore, federal_offshore)):
        federal_now = this_year_amount(spent, federal_rule)
        california_now = this_year_amount(spent, california)
        rows.append({
            "where": label,
            "spent_cents": spent,
            "federal": {
                "treatment": federal_rule["treatment"],
                "years": federal_rule.get("years"),
                "this_year_cents": federal_now,
                "later_cents": spent - federal_now,
                "rule_id": federal_rule["id"],
            },
            "california": {
                "treatment": california["treatment"],
                "this_year_cents": california_now,
                "later_cents": spent - california_now,
                "rule_id": california["id"],
            },
        })
    return {"rows": rows, "ruleset_version": ruleset.version}
