"""Read one receipt with the real model and print what happened.

Needs ANTHROPIC_API_KEY. From the api/ folder:

    python scripts/try_receipt.py ../data/tidewell/receipt_images/rcp_140.png
"""

import base64
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai.model import ClaudeModel  # noqa: E402
from ai.pipeline import process_receipt  # noqa: E402
from engine.rules import load_ruleset  # noqa: E402

MEDIA_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf"}


def main(path):
    file = Path(path)
    file_base64 = base64.b64encode(file.read_bytes()).decode("ascii")
    transaction, receipt, summary, traces = process_receipt(
        ClaudeModel(), file_base64, MEDIA_TYPES[file.suffix.lower()], "up_try", date(2026, 11, 19), load_ruleset(2026))
    print("Result:", json.dumps(summary, indent=2))
    if transaction:
        print(f"Transaction: {transaction.merchant}, {transaction.amount_cents} cents, "
              f"category={transaction.category or '-'}, status={transaction.status}")
        if transaction.question:
            print("Question:", transaction.question, "| options:", transaction.options)
    print("Receipt note:", receipt.note or "-")
    for trace in traces:
        print("Trace:", json.dumps(trace))


if __name__ == "__main__":
    main(sys.argv[1])
