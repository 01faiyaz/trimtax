"""Contractors: who needs a 1099, who's missing a W-9, and California's DE 542.

Plain words:
- Pay one contractor $2,000 or more in 2026 and you owe them a 1099-NEC
  (it was $600 before 2026). Corporations generally don't get one.
- Get their W-9 (tax ID) before paying, or you may have to hold back 24%.
- California's DE 542 report: the EDD still lists $600 but only applies when
  a federal 1099 is required, so $600 to $1,999 is unclear for 2026.
"""

# A contractor this close to the 1099 line gets a heads-up before the next payment.
NEAR_LINE_CENTS = 50000  # $500


def paid_by_contractor(transactions, ruleset):
    """Total confirmed contractor payments in the tax year, by contractor id."""
    totals = {}
    for t in transactions:
        if t.category != "contractor" or t.status != "confirmed" or not t.payee_id:
            continue
        if not ruleset.covers(t.date):
            continue
        totals[t.payee_id] = totals.get(t.payee_id, 0) + t.amount_cents
    return totals


def needs_1099(paid_cents, line_cents, contractor):
    if contractor.entity_type == "corporation":
        return "exempt"
    if paid_cents >= line_cents:
        return "required"
    return "not_yet"


def de542_status(paid_cents, contractor, rule):
    """California DE 542: not_applicable, not_needed, unclear or required."""
    if contractor.entity_type not in rule["applies_to"]:
        return "not_applicable"
    if paid_cents < rule["threshold_cents"]:
        return "not_needed"
    band = rule.get("unclear_band_cents")
    if band and band[0] <= paid_cents <= band[1]:
        return "unclear"
    return "required"


def contractor_watch(transactions, contractors, ruleset):
    line_rule = ruleset.rule("fed_1099_nec_threshold")
    line = line_rule["threshold_cents"]
    old_line = line_rule.get("previous_threshold_cents")
    de542_rule = ruleset.rule("ca_de542_report")
    totals = paid_by_contractor(transactions, ruleset)

    rows = []
    for contractor in contractors:
        paid = totals.get(contractor.id, 0)
        if paid == 0:
            continue
        status = needs_1099(paid, line, contractor)
        cents_to_line = max(line - paid, 0)
        rows.append({
            "id": contractor.id,
            "name": contractor.name,
            "entity_type": contractor.entity_type,
            "paid_cents": paid,
            "w9_on_file": contractor.w9_on_file,
            "federal_1099": status,
            "cents_to_line": cents_to_line,
            "near_line": status == "not_yet" and cents_to_line <= NEAR_LINE_CENTS,
            "california_de542": de542_status(paid, contractor, de542_rule),
        })
    rows.sort(key=lambda row: row["paid_cents"], reverse=True)

    forms_needed = 0
    forms_under_old_line = 0
    missing_w9 = []
    de542_unclear = []
    for row in rows:
        if row["federal_1099"] == "required":
            forms_needed += 1
        if old_line is not None and row["federal_1099"] != "exempt" and row["paid_cents"] >= old_line:
            forms_under_old_line += 1
        if not row["w9_on_file"]:
            missing_w9.append(row["name"])
        if row["california_de542"] == "unclear":
            de542_unclear.append(row["name"])

    return {
        "line_cents": line,
        "old_line_cents": old_line,
        "forms_needed": forms_needed,
        "forms_under_old_line": forms_under_old_line if old_line is not None else None,
        "missing_w9": missing_w9,
        "de542_unclear": de542_unclear,
        "contractors": rows,
        "ruleset_version": ruleset.version,
    }
