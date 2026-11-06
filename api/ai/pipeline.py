"""What happens to an uploaded receipt, start to finish.

1. extract_receipt reads it.
2. Plain code checks it: hidden instructions? readable total? do the amounts add up?
3. classify_transaction sorts it and lists any other categories it could be.
4. Plain code checks whether those categories are treated differently. Only if they
   are does ask_clarifying_question write one question with two answers.

The result is always one of three states: confirmed, needs_answer, cant_determine.
"""

from datetime import date

from ai.skills import ask_clarifying_question, classify_transaction, extract_receipt
from engine.categories import label
from engine.records import Receipt, Transaction
from engine.treatment import worth_asking


def read_date(text, fallback):
    try:
        return date.fromisoformat(text)
    except (TypeError, ValueError):
        return fallback


def possible_categories(sorted_as):
    """The model's pick first, then the other categories it listed, without repeats."""
    possible = []
    if sorted_as["category"]:
        possible.append(sorted_as["category"])
    for name in sorted_as["candidates"]:
        if name not in possible:
            possible.append(name)
    return possible


def sort_purchase(model, facts, ruleset, traces):
    """Sort one purchase, and ask the owner only if the answer would change something.

    Returns {"category", "same_as", "question", "options", "failed"}. Either category is
    set (no question), or question and options are set (the owner picks one).
    same_as lists categories that were possible but are treated the same as the one used.
    """
    sorted_as = classify_transaction(model, facts, ruleset.version, traces)
    result = {"category": None, "same_as": [], "question": None, "options": [], "failed": sorted_as["failed"]}
    possible = possible_categories(sorted_as)

    if possible:
        choices = worth_asking(possible, ruleset)
        if not choices:
            result["category"] = possible[0]
            result["same_as"] = possible[1:]
            return result
    else:
        choices = []

    asked = ask_clarifying_question(model, facts, choices, ruleset.version, traces)
    result["question"] = asked["question"]
    result["options"] = asked["options"]
    return result


def process_receipt(model, file_base64, media_type, upload_id, as_of, ruleset):
    """Returns (transaction or None, receipt, summary, traces). Nothing is saved here."""
    traces = []
    facts = extract_receipt(model, file_base64, media_type, ruleset.version, traces)

    receipt = Receipt(id=upload_id, transaction_id="", date=None, merchant="",
                      total_cents=None, has_image=True)

    # The model call failed: keep the file, show no number.
    if facts is None:
        receipt.note = "Couldn't be read (the AI call failed)"
        return None, receipt, {"state": "cant_determine", "reason": "read_failed"}, traces

    receipt.merchant = facts.get("merchant") or ""
    receipt.date = read_date(facts.get("date"), None)
    day = receipt.date or as_of

    # Hidden instructions: record the charge if the total is readable, count nothing.
    if facts["injection_flagged"]:
        transaction = None
        if facts.get("total_cents"):
            transaction = Transaction(id="t_" + upload_id, date=day, merchant=receipt.merchant,
                                      amount_cents=facts["total_cents"], category="",
                                      status="cant_determine", memo="Uploaded receipt",
                                      flag="hidden_instruction")
            receipt.transaction_id = transaction.id
            receipt.total_cents = facts["total_cents"]
        receipt.note = "Hidden instructions found and ignored"
        return transaction, receipt, {"state": "cant_determine", "reason": "hidden_instruction"}, traces

    # No readable total: no number, no transaction.
    if not facts["readable"] or facts.get("total_cents") is None:
        receipt.note = "Total unreadable"
        return None, receipt, {"state": "cant_determine", "reason": "unreadable_total"}, traces

    receipt.total_cents = facts["total_cents"]
    transaction = Transaction(id="t_" + upload_id, date=day, merchant=receipt.merchant,
                              amount_cents=facts["total_cents"], category="", status="confirmed",
                              memo="Uploaded receipt")
    receipt.transaction_id = transaction.id
    if facts["adds_up"] is False:
        receipt.note = "The printed lines don't add up to the total; the total was used"

    sorted_as = sort_purchase(model, facts, ruleset, traces)
    if sorted_as["category"]:
        transaction.category = sorted_as["category"]
        if sorted_as["same_as"]:
            others = ", ".join(label(name) for name in sorted_as["same_as"])
            add_note(receipt, f"Sorted as {label(transaction.category)}. It could also be {others}, "
                              "which is treated the same, so no question was asked")
        return transaction, receipt, {"state": "confirmed", "category": transaction.category}, traces

    transaction.status = "needs_answer"
    transaction.question = sorted_as["question"]
    transaction.options = "|".join(sorted_as["options"])
    return transaction, receipt, {"state": "needs_answer", "question": sorted_as["question"]}, traces


def add_note(receipt, text):
    receipt.note = f"{receipt.note}. {text}" if receipt.note else text
