"""Tax on profit: the part the company itself pays.

Plain words:
- A California S corporation pays 1.5% of its net income each year, at least $800.
- It pays no federal income tax itself. The profit passes to the owners, who pay
  federal and California income tax on their share on their own returns. That
  depends on their other income, which TrimTax doesn't have, so it stays with the
  accountant.
"""


def california_s_corp_tax(net_income_cents, ruleset):
    rule = ruleset.rule("ca_s_corp_tax")
    by_rate = max(net_income_cents, 0) * rule["rate_basis_points"] // 10000
    return max(by_rate, rule["minimum_cents"])


def tax_on_profit(company, ruleset, written_off_cents=0):
    """The company's California tax on its expected profit, and what a planned purchase
    written off in California this year would change.

    Example (the demo): $120,000 expected profit, so $1,800. With the 3 laptops
    ($6,600 written off in California this year): $1,701, which is $99 less.
    """
    if company.entity_type != "s_corporation":
        return None
    rule = ruleset.rule("ca_s_corp_tax")
    profit = company.expected_net_income_cents
    tax = california_s_corp_tax(profit, ruleset)
    result = {
        "profit_cents": profit,
        "california_tax_cents": tax,
        "rate_basis_points": rule["rate_basis_points"],
        "minimum_cents": rule["minimum_cents"],
        "approved": bool(rule["approved_by"]),
        "with_purchase": None,
    }
    if written_off_cents > 0:
        after = california_s_corp_tax(profit - written_off_cents, ruleset)
        result["with_purchase"] = {
            "written_off_cents": written_off_cents,
            "california_tax_cents": after,
            "change_cents": after - tax,
        }
    return result
