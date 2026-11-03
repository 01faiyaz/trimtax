"""Money helpers. All money in TrimTax is whole cents (int), never float."""


def percent_of(cents, percent):
    """Return `percent`% of an amount in cents, rounded to the nearest cent.

    percent_of(41200, 50) -> 20600
    """
    return (cents * percent + 50) // 100


def dollars(cents):
    """Format cents for display: 418000 -> "$4,180.00"."""
    sign = ""
    if cents < 0:
        sign = "-"
        cents = -cents
    return "%s$%s.%02d" % (sign, "{:,}".format(cents // 100), cents % 100)
