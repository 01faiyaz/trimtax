"""Turn the accountant packet into rows for a CSV (and the PDF).

Formatting only. Every number here comes from the packet, which comes from the engine.
"""

import csv
import io
from pathlib import Path

from engine.categories import label

PACKET_COLUMNS = ["section", "date", "merchant", "what", "amount", "federal", "california",
                  "status", "rule", "source", "receipt"]

MEAL_LABELS = {
    "team_meal_office": "Team meals at the office",
    "client_meal": "Client meals",
    "client_entertainment": "Client entertainment",
    "snacks_coffee": "Snacks and coffee",
}

STATE_LABELS = {"confirmed": "Confirmed", "needs_answer": "Needs one answer", "cant_determine": "Can't determine"}


def money(cents):
    """Plain dollars a spreadsheet can read: 1234.5 -> "1234.50". Blank when there's no number."""
    if cents is None:
        return ""
    sign = "-" if cents < 0 else ""
    cents = abs(cents)
    return f"{sign}{cents // 100}.{cents % 100:02d}"


def row(section, **fields):
    line = {column: "" for column in PACKET_COLUMNS}
    line["section"] = section
    line.update(fields)
    return line


def rule_fields(ruleset, *rule_ids):
    """The rule's citation and source link, for one or more rules."""
    rules = [ruleset.rule(rule_id) for rule_id in rule_ids]
    return {
        "rule": "; ".join(rule["source"]["cite"] for rule in rules),
        "source": " ".join(rule["source"]["url"] for rule in rules),
    }


def receipts_by_transaction(workspace):
    receipts = {}
    for receipt in workspace.receipts:
        receipts.setdefault(receipt.transaction_id, []).append(receipt.id)
    return receipts


def open_item_rows(packet, workspace, ruleset):
    questions = {t.id: t.question for t in workspace.transactions}
    receipts = receipts_by_transaction(workspace)
    rows = []
    for item in packet["open_items"]:
        if item["kind"] == "question":
            rows.append(row("Open item", date=item["date"], merchant=item["merchant"],
                            what=questions.get(item["transaction_id"]) or "Needs one answer",
                            amount=money(item["amount_cents"]), status="Waiting on your answer",
                            receipt=" ".join(receipts.get(item["transaction_id"], []))))
        elif item["kind"] == "missing_w9":
            rows.append(row("Open item", merchant=item["name"],
                            what=f"No W-9 on file. {money(item['cents_to_line'])} from the 1099 line.",
                            amount=money(item["paid_cents"]),
                            status="W-9 requested" if item["w9_requested"] else "W-9 needed",
                            **rule_fields(ruleset, "fed_1099_nec_threshold", "fed_backup_withholding")))
        elif item["kind"] == "de542_unclear":
            rows.append(row("Open item",
                            what=(f"California DE 542 report unclear for 2026: {item['count']} contractors paid "
                                  f"$600 to $1,999 ({', '.join(item['names'])})"),
                            status="Ask your accountant", **rule_fields(ruleset, "ca_de542_report")))
    return rows


def purchase_rows(packet, ruleset):
    rows = []
    for saved in packet["purchases"]:
        given, result = saved["input"], saved["result"]
        later = result["california"]["later_cents"]
        rows.append(row("Planned purchase (not bought)",
                        what=(f"{given['quantity']} at {money(result['price_each_cents'])} each, in use by "
                              f"{given['in_use_by']}" + (f". California spreads {money(later)} over later years" if later else "")),
                        amount=money(result["price_each_cents"] * given["quantity"]),
                        federal=money(result["federal"]["this_year_cents"]),
                        california=money(result["california"]["this_year_cents"]),
                        status="Estimate", **rule_fields(ruleset, "fed_bonus_depreciation", "ca_section_179")))
    return rows


def flagged_rows(packet):
    rows = []
    for item in packet["flagged"]:
        if item["kind"] == "hidden_instruction":
            what = "Hidden text told the AI to mark it 100% deductible. Ignored and logged."
        else:
            what = "Total unreadable, so no number is shown."
        rows.append(row("Flagged, nothing counted", date=item["date"] or "", merchant=item["merchant"],
                        what=what, status="Can't determine",
                        receipt=Path(item["image"]).stem if item.get("image") else ""))
    return rows


def summary_rows(packet, ruleset):
    summary = packet["summary"]
    room = summary["california_equipment"]
    federal_equipment = summary["federal_equipment"]
    contractors = summary["contractors"]
    rows = [
        row("Where things stand", what="Equipment in use this year",
            amount=money(federal_equipment["bought_cents"]),
            federal=money(federal_equipment["written_off_this_year_cents"]), california=money(room["used_cents"]),
            status="Confirmed", **rule_fields(ruleset, "fed_bonus_depreciation", "ca_section_179")),
        row("Where things stand", what="California equipment room left",
            california=money(room["room_cents"]), status="Confirmed", **rule_fields(ruleset, "ca_section_179")),
        row("Where things stand",
            what=f"1099 forms needed: {contractors['forms_needed']} at the federal {money(contractors['line_cents'])} line",
            status="Confirmed", **rule_fields(ruleset, "fed_1099_nec_threshold")),
    ]
    for meal in summary["meals"]["rows"]:
        rows.append(row("Where things stand", what=MEAL_LABELS.get(meal["category"], meal["category"]),
                        amount=money(meal["spent_cents"]),
                        federal=money(meal["federal"]["deductible_cents"]),
                        california=money(meal["california"]["deductible_cents"]),
                        status=STATE_LABELS.get(meal["federal"]["state"], meal["federal"]["state"]),
                        **rule_fields(ruleset, meal["federal"]["rule_id"], meal["california"]["rule_id"])))
    for research in summary["research"]["rows"]:
        where = "US" if research["where"] == "us" else "outside the US"
        rows.append(row("Where things stand", what=f"Research, {where} (deducted this year)",
                        amount=money(research["spent_cents"]),
                        federal=money(research["federal"]["this_year_cents"]),
                        california=money(research["california"]["this_year_cents"]),
                        status="Confirmed",
                        **rule_fields(ruleset, research["federal"]["rule_id"], research["california"]["rule_id"])))
    return rows


def transaction_rows(workspace):
    receipts = receipts_by_transaction(workspace)
    rows = []
    for t in sorted(workspace.transactions, key=lambda t: (t.date, t.id)):
        rows.append(row("Transaction", date=t.date.isoformat(), merchant=t.merchant,
                        what=label(t.category) if t.category else "Not sorted yet",
                        amount=money(t.amount_cents), status=STATE_LABELS.get(t.status, t.status),
                        receipt=" ".join(receipts.get(t.id, []))))
    return rows


def packet_rows(packet, workspace, ruleset):
    return (open_item_rows(packet, workspace, ruleset) + purchase_rows(packet, ruleset)
            + flagged_rows(packet) + summary_rows(packet, ruleset) + transaction_rows(workspace))


def packet_csv(packet, workspace, ruleset):
    out = io.StringIO()
    out.write(f"# {packet['company']}, accountant packet, as of {packet['as_of']}, "
              f"ruleset {packet['ruleset_version']}. {packet['note']}\n")
    writer = csv.DictWriter(out, fieldnames=PACKET_COLUMNS)
    writer.writeheader()
    writer.writerows(packet_rows(packet, workspace, ruleset))
    return out.getvalue()
