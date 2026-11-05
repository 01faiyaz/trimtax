"""Number-grounding check: AI text may only mention dollar amounts we already know.

Every "$1,234.56" in the text has to match an amount from the engine or the
receipt. If one doesn't, the text is thrown away and a template is used.
"""

import re

DOLLAR = re.compile(r"\$\s?(\d[\d,]*)(?:\.(\d{2}))?")


def dollar_amounts(text):
    """All dollar amounts in a piece of text, in cents."""
    amounts = []
    for match in DOLLAR.finditer(text):
        whole = int(match.group(1).replace(",", ""))
        cents = int(match.group(2) or 0)
        amounts.append(whole * 100 + cents)
    return amounts


def is_grounded(text, allowed_cents):
    allowed = set(allowed_cents)
    for amount in dollar_amounts(text):
        if amount not in allowed:
            return False
    return True
