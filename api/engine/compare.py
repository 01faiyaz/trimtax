"""Compare two rulesets: which rules changed, and what that does to the numbers."""

from engine.contractors import contractor_watch
from engine.meals import meals_summary

# The fields that carry a rule's actual value. Deadlines change every year,
# so they're left out of the comparison.
VALUE_FIELDS = [
    "percent",
    "limit_cents",
    "phaseout_start_cents",
    "threshold_cents",
    "per_item_limit_cents",
    "unclear_band_cents",
    "treatment",
    "years",
]


def changed_rules(old, new):
    changes = []
    for rule_id, new_rule in new.rules.items():
        old_rule = old.rules.get(rule_id)
        if old_rule is None:
            changes.append({"rule_id": rule_id, "field": None, "before": None, "after": None,
                            "kind": "added", "source": new_rule["source"]})
            continue
        for field in VALUE_FIELDS:
            before = old_rule.get(field)
            after = new_rule.get(field)
            if before != after:
                changes.append({
                    "rule_id": rule_id,
                    "field": field,
                    "before": before,
                    "after": after,
                    "kind": "changed",
                    "plain_words": new_rule["plain_words"],
                    "source": new_rule["source"],
                })
    return changes


def federal_deductible(summary, category):
    for row in summary["rows"]:
        if row["category"] == category:
            return row["federal"]["deductible_cents"]
    return 0


def compare_years(workspace, old, new):
    """The same spending under last year's rules and this year's rules."""
    old_here = old.moved_to_year_of(new)
    old_watch = contractor_watch(workspace.transactions, workspace.contractors, old_here)
    new_watch = contractor_watch(workspace.transactions, workspace.contractors, new)
    old_meals = meals_summary(workspace.transactions, old_here)
    new_meals = meals_summary(workspace.transactions, new)

    return {
        "from_version": old.version,
        "to_version": new.version,
        "rule_changes": changed_rules(old, new),
        "forms_needed": {
            "before": old_watch["forms_needed"],
            "after": new_watch["forms_needed"],
        },
        "team_meals_federal_deductible": {
            "before": federal_deductible(old_meals, "team_meal_office"),
            "after": federal_deductible(new_meals, "team_meal_office"),
        },
    }
