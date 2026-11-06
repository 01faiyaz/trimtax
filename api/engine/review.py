"""What still needs a person: open questions, flagged documents, receipts filed."""

from engine.contractors import contractor_watch


def open_items(workspace, ruleset):
    """Items for the accountant packet that still need an answer.

    For the demo: the Sweetgreen question, Dana Reyes's missing W-9, and the
    California DE 542 question. That's 3.
    """
    items = []

    for t in workspace.transactions:
        if t.status == "needs_answer":
            items.append({
                "kind": "question",
                "transaction_id": t.id,
                "merchant": t.merchant,
                "date": t.date,
                "amount_cents": t.amount_cents,
                "question": t.question,
            })

    watch = contractor_watch(workspace.transactions, workspace.contractors, ruleset)
    for row in watch["contractors"]:
        if not row["w9_on_file"]:
            items.append({
                "kind": "missing_w9",
                "contractor_id": row["id"],
                "name": row["name"],
                "paid_cents": row["paid_cents"],
                "cents_to_line": row["cents_to_line"],
            })

    if watch["de542_unclear"]:
        items.append({
            "kind": "de542_unclear",
            "names": watch["de542_unclear"],
            "count": len(watch["de542_unclear"]),
        })

    return items


def flagged_documents(workspace):
    """Documents the engine refused to count: hidden instructions, unreadable totals."""
    flagged = []
    for t in workspace.transactions:
        if t.flag:
            flagged.append({
                "kind": t.flag,
                "transaction_id": t.id,
                "merchant": t.merchant,
                "date": t.date,
                "state": t.status,
            })
    for r in workspace.receipts:
        if r.total_cents is None:
            flagged.append({
                "kind": "unreadable_total",
                "receipt_id": r.id,
                "merchant": r.merchant,
                "date": r.date,
                "state": "cant_determine",
            })
    return flagged


def receipts_filed(workspace, as_of):
    count = 0
    for r in workspace.receipts:
        if r.date is not None and r.date <= as_of:
            count += 1
    return count
