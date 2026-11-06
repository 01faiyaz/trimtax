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


# One line per category for the sorting step, so it sorts the same way the engine counts.
HINTS = {
    "equipment": "computers, machines, furniture: any single item over $2,500 that lasts more than a year",
    "team_meal_office": "food for the company's own team at the office, when the receipt says it was for the team",
    "client_meal": "a meal with a client or prospect, anywhere",
    "client_entertainment": "tickets, games, shows or outings with a client",
    "snacks_coffee": "snacks, drinks and coffee for the office kitchen",
    "contractor": "a payment to a person or one-person business for their work",
    "research_us": "software development work done in the US by an outside firm",
    "research_offshore": "software development work done outside the US by an outside firm",
    "office_supplies": "supplies, and small items costing $2,500 or less each (even small electronics)",
    "software": "software subscriptions and cloud services",
    "travel": "flights, hotels, rides, rental cars, parking",
    "advertising": "ads, sponsorships and printed marketing",
    "rent_utilities": "office rent, internet, power, phone",
    "other": "anything else: fees, insurance, gifts",
}


def is_category(name):
    return name in CATEGORIES


def label(name):
    return CATEGORIES.get(name, name)
