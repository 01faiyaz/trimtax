"""The tax-year clock and upcoming deadlines.

`as_of` is always passed in. The engine never reads the computer's clock,
so the demo can be pinned to Nov 19, 2026.
"""


def tax_year_clock(as_of, ruleset):
    """How much of the tax year is gone and how much is left.

    On Nov 19, 2026: 322 full days are behind us (Jan 1 to Nov 18),
    today is day 323, and 42 days are left after today (Nov 20 to Dec 31).
    """
    days_in_year = (ruleset.year_end - ruleset.year_start).days + 1
    days_gone = (as_of - ruleset.year_start).days
    days_left = (ruleset.year_end - as_of).days

    days_gone = min(max(days_gone, 0), days_in_year)
    days_left = min(max(days_left, 0), days_in_year)

    return {
        "as_of": as_of,
        "tax_year": ruleset.tax_year,
        "days_in_year": days_in_year,
        "days_gone": days_gone,
        "day_of_year": days_gone + 1,
        "days_left": days_left,
        "percent_gone": round(days_gone * 100 / days_in_year, 1),
        "ruleset_version": ruleset.version,
    }


def upcoming_deadlines(as_of, ruleset):
    """Deadlines from the rules file that haven't passed yet, soonest first."""
    deadlines = []
    for rule in ruleset.deadline_rules():
        days_until = (rule["deadline"] - as_of).days
        if days_until < 0:
            continue
        deadlines.append({
            "rule_id": rule["id"],
            "date": rule["deadline"],
            "days_until": days_until,
            "plain_words": rule["plain_words"],
        })
    deadlines.sort(key=lambda item: item["date"])
    return deadlines
