"""What happens to an uploaded receipt, start to finish.

1. extract_receipt reads it.
2. Plain code checks it: hidden instructions? readable total? do the amounts add up?
3. classify_transaction sorts it, or says it's unsure.
4. If unsure, ask_clarifying_question writes one question with two answers.

The result is always one of three states: confirmed, needs_answer, cant_determine.
"""

from datetime import date

from ai.skills import ask_clarifying_question, classify_transaction, extract_receipt
from engine.records import Receipt, Transaction


def read_date(text, fallback):
    try:
        return date.fromisoformat(text)
    except (TypeError, ValueError):
        return fallback


def process_receipt(model, file_base64, media_type, upload_id, as_of, ruleset_version):
    """Returns (transaction or None, receipt, summary, traces). Nothing is saved here."""
    traces = []
    facts = extract_receipt(model, file_base64, media_type, ruleset_version, traces)

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

    sorted_as = classify_transaction(model, facts, ruleset_version, traces)
    if sorted_as["category"]:
        transaction.category = sorted_as["category"]
        return transaction, receipt, {"state": "confirmed", "category": transaction.category}, traces

    asked = ask_clarifying_question(model, facts, sorted_as["candidates"], ruleset_version, traces)
    transaction.status = "needs_answer"
    transaction.question = asked["question"]
    transaction.options = "|".join(asked["options"])
    return transaction, receipt, {"state": "needs_answer", "question": asked["question"]}, traces
