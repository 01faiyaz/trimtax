"""Equipment: California room left, and the "check before you buy" math.

Plain words:
- Federal lets you write off 100% of equipment in year one (bonus depreciation).
- California has no bonus depreciation. It allows up to $25,000 a year
  (Section 179); the rest is depreciated over several years.
- Anything costing $2,500 or less per item can skip all of that and be
  written off like a supply, on both returns, if the company made the
  small-item election.
"""

from engine.money import percent_of


def equipment_bought(transactions, ruleset):
    """Total confirmed equipment bought in the tax year, in cents."""
    total = 0
    for t in transactions:
        if t.category == "equipment" and t.status == "confirmed" and ruleset.covers(t.date):
            total += t.amount_cents
    return total


def section_179_cap(rule, total_bought_cents, business_income_cents):
    """The Section 179 limit after the phase-out and the business-income limit."""
    cap = rule["limit_cents"]
    over_phaseout = total_bought_cents - rule["phaseout_start_cents"]
    if over_phaseout > 0:
        cap -= over_phaseout
    if rule.get("limited_to_business_income"):
        cap = min(cap, business_income_cents)
    return max(cap, 0)


def california_room(transactions, ruleset, company, planned_cents=0):
    """How much of California's Section 179 limit is used and how much is left.

    `planned_cents` is a purchase being considered. It counts toward the
    phase-out but hasn't used any room yet.
    """
    rule = ruleset.rule("ca_section_179")
    bought = equipment_bought(transactions, ruleset)
    cap = section_179_cap(rule, bought + planned_cents, company.expected_net_income_cents)
    used = min(bought, cap)
    return {
        "limit_cents": rule["limit_cents"],
        "cap_cents": cap,
        "used_cents": used,
        "room_cents": cap - used,
        "rule_id": rule["id"],
        "ruleset_version": ruleset.version,
    }


def federal_equipment(transactions, ruleset):
    """Federal view: everything bought this year is written off this year."""
    bonus = ruleset.rule("fed_bonus_depreciation")
    limit_179 = ruleset.rule("fed_section_179")
    bought = equipment_bought(transactions, ruleset)
    return {
        "bought_cents": bought,
        "written_off_this_year_cents": percent_of(bought, bonus["percent"]),
        "bonus_percent": bonus["percent"],
        "section_179_limit_cents": limit_179["limit_cents"],
        "ruleset_version": ruleset.version,
    }


def small_item_check(price_each_cents, ruleset, company):
    """Does one item fit under the $2,500 small-item line?

    The price should be all-in: tax, shipping and setup on the same invoice count.
    """
    rule = ruleset.rule("de_minimis_safe_harbor")
    line = rule["per_item_limit_cents"]
    return {
        "line_cents": line,
        "qualifies": company.small_item_election and price_each_cents <= line,
        "election_made": company.small_item_election,
        "over_line_cents": max(price_each_cents - line, 0),
        "under_line_cents": max(line - price_each_cents, 0),
        "california_follows": rule["california_follows"],
    }


def federal_this_year(total_cents, purchase_date, ruleset, company, total_bought_cents):
    """Federal write-off this year for equipment that's in use in time."""
    bonus = ruleset.rule("fed_bonus_depreciation")
    if purchase_date > bonus["acquired_after"]:
        bonus_percent = bonus["percent"]
    else:
        bonus_percent = bonus.get("percent_if_acquired_earlier", 0)

    if bonus_percent == 100:
        return total_cents, "bonus_depreciation"

    # Section 179 goes first, then bonus depreciation on what's left.
    cap = section_179_cap(ruleset.rule("fed_section_179"), total_bought_cents,
                          company.expected_net_income_cents)
    by_179 = min(total_cents, cap)
    by_bonus = percent_of(total_cents - by_179, bonus_percent)
    return by_179 + by_bonus, "section_179_and_bonus"


def check_purchase(price_each_cents, quantity, in_use_by, purchase_date,
                   transactions, ruleset, company):
    """What a planned equipment purchase does to this year's write-offs.

    Example (the demo): 3 laptops at $2,899, in use by Dec 10.
    Federal: $8,697 this year. California: $6,600 this year (all the room
    left), $2,097 spread over the following years.
    """
    if price_each_cents <= 0 or quantity <= 0:
        raise ValueError("price and quantity must be positive")

    total = price_each_cents * quantity
    in_time = ruleset.covers(in_use_by)
    small = small_item_check(price_each_cents, ruleset, company)
    room_before = california_room(transactions, ruleset, company)["room_cents"]

    result = {
        "price_each_cents": price_each_cents,
        "quantity": quantity,
        "total_cents": total,
        "in_use_by": in_use_by,
        "in_use_in_time": in_time,
        "deadline": ruleset.value("placed_in_service_deadline", "deadline"),
        "small_item": small,
        "california_room_before_cents": room_before,
        "state": "confirmed",
        "ruleset_version": ruleset.version,
    }

    if not in_time:
        # Not in use by Dec 31: nothing counts for this year.
        result["federal"] = {"this_year_cents": 0, "later_cents": total, "how": "next_year"}
        result["california"] = {"this_year_cents": 0, "later_cents": total, "how": "next_year"}
        result["california_room_after_cents"] = room_before
        return result

    if small["qualifies"]:
        result["federal"] = {"this_year_cents": total, "later_cents": 0, "how": "small_item"}
        result["california"] = {"this_year_cents": total, "later_cents": 0, "how": "small_item"}
        result["california_room_after_cents"] = room_before
        return result

    bought = equipment_bought(transactions, ruleset)
    federal_now, federal_how = federal_this_year(total, purchase_date, ruleset, company,
                                                 bought + total)
    room = california_room(transactions, ruleset, company, planned_cents=total)["room_cents"]
    california_now = min(total, room)

    result["federal"] = {
        "this_year_cents": federal_now,
        "later_cents": total - federal_now,
        "how": federal_how,
    }
    result["california"] = {
        "this_year_cents": california_now,
        # Depreciated over the following years. Regular depreciation may
        # allow a small part of this in year one too; we don't count it.
        "later_cents": total - california_now,
        "how": "section_179",
    }
    result["california_room_after_cents"] = room - california_now
    return result
