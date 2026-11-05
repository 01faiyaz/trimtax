"""The fixed list of categories a purchase can be sorted into.

The AI picks from this list (or abstains). Nothing outside it is allowed.
"""

CATEGORIES = {
    "equipment": "Equipment",
    "team_meal_office": "Team meal at the office",
    "client_meal": "Meal with a client",
    "client_entertainment": "Client entertainment",
    "snacks_coffee": "Office snacks and coffee",
    "contractor": "Contractor payment",
    "research_us": "Research, US",
    "research_offshore": "Research, outside the US",
    "office_supplies": "Office supplies",
    "software": "Software",
    "travel": "Travel",
    "advertising": "Advertising",
    "rent_utilities": "Rent and utilities",
    "other": "Other",
}


def is_category(name):
    return name in CATEGORIES


def label(name):
    return CATEGORIES.get(name, name)
