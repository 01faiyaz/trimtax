"""Ask the AI to propose rule changes from a passage of official text. Changes nothing yet.

Needs ANTHROPIC_API_KEY. Paste the passage from the official page into a text file in
rules/sources/, then from the repo root:

    python api/scripts/propose_rule_update.py rules/sources/obbba_70433.txt \\
        --cite "OBBBA (Pub. L. 119-21) sec. 70433" \\
        --url "https://www.congress.gov/bill/119th-congress/house-bill/1/text" \\
        --base 2025 --year 2026

--base is the ruleset the AI compares against; --year is the ruleset the change goes into.
Proposals are added to rules/updates.yaml as "proposed". Approve or reject each one with
api/scripts/review_rule_update.py.
"""

import argparse
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "api"))

from ai.model import ClaudeModel  # noqa: E402
from ai.rule_updates import PROPOSE_VERSION, propose_rule_update  # noqa: E402
from app.rule_log import load_log, next_id, save_log  # noqa: E402
from engine.rules import load_ruleset  # noqa: E402


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("text_file")
    parser.add_argument("--cite", required=True)
    parser.add_argument("--url", required=True)
    parser.add_argument("--base", type=int, required=True)
    parser.add_argument("--year", type=int, required=True)
    args = parser.parse_args()

    text_file = Path(args.text_file).resolve()
    source_text = text_file.read_text(encoding="utf-8")
    base = load_ruleset(args.base)
    model = ClaudeModel()
    traces = []
    result = propose_rule_update(model, source_text, base, traces, target_year=args.year)

    if result["failed"]:
        print(f"The model call failed ({traces[-1].get('error')}). Nothing was proposed.")
        return
    if result["instructions_found"]:
        print("Warning: the text contains something that looks like instructions to an AI. Check the file.")

    updates = load_log()
    for proposal in result["proposals"]:
        entry = {
            "id": next_id(updates),
            "year": args.year,
            **proposal,
            "source": {"cite": args.cite, "url": args.url, "file": str(text_file.relative_to(ROOT))},
            "base_version": base.version,
            "proposed_by": f"{PROPOSE_VERSION} on {model.model}",
            "proposed_on": date.today(),
            "status": "proposed",
            "decided_by": None,
            "decided_on": None,
            "outcome": None,
            "ruleset_version": None,
        }
        updates.append(entry)
        print(f"{entry['id']}  {entry['rule_id']}.{entry['field']}: {entry['from']} -> {entry['to']}")
        print(f"        \"{entry['quote']}\"")
    save_log(updates)

    for rejected in result["rejected"]:
        print(f"Not proposed ({rejected['why']}): {rejected['rule_id']}.{rejected['field']} = {rejected['figure']!r}")
    if result["note"]:
        print(f"Model note: {result['note']}")
    cost = sum(t.get("cost_nanodollars", 0) for t in traces) / 1e9
    print(f"{len(result['proposals'])} proposed, {len(result['rejected'])} not proposed. Cost ${cost:.4f}.")


if __name__ == "__main__":
    main()
