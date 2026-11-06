"""Does the answer to a question change anything? Plain code decides, not the AI.

If two categories are treated the same way (same deduction, same limits, same forms),
asking the owner which one it was wastes their time. If they're treated differently,
or we don't know how one of them is treated, the question is worth asking.
"""

from engine.meals import MEAL_RULES

# Deducted in full on both returns, and not counted toward any limit or form we track.
ORDINARY = {"office_supplies", "software", "travel", "advertising", "rent_utilities"}

# Each of these feeds its own limit, count or schedule, so it's never the same as anything else.
OWN_TREATMENT = {
    "equipment": "California equipment room",
    "contractor": "1099 and DE 542 counts",
    "research_us": "research, deducted now",
    "research_offshore": "research, spread over 15 years federally",
}


def treatment(category, ruleset):
    """How the engine treats a category, as a value that can be compared. None means not known.

    "other" is None on purpose: it holds fees and insurance (deducted in full) but also gifts
    (limited) and fines (not deductible), so we can't say how it's treated without asking.
    """
    if category in ORDINARY:
        return "ordinary"
    if category in OWN_TREATMENT:
        return category
    if category in MEAL_RULES:
        federal_id, california_id = MEAL_RULES[category]
        federal = ruleset.value(federal_id, "percent")
        california = ruleset.value(california_id, "percent")
        if federal is None or california is None:
            return None
        return ("meal", federal, california)
    return None


def same_treatment(first, second, ruleset):
    known = treatment(first, ruleset)
    return known is not None and known == treatment(second, ruleset)


def worth_asking(options, ruleset):
    """The two choices to ask about, or [] when no question is needed.

    `options` is most likely first. The question pairs the most likely category with the
    next one that would be treated differently. If every option is treated the same,
    no question: the most likely one is used.
    """
    if len(options) < 2:
        return []
    first = options[0]
    for other in options[1:]:
        if not same_treatment(first, other, ruleset):
            return [first, other]
    return []
