"""Score a saved eval run again with the current labels, without calling the model.

Used after a label change (see LABEL_CHANGES.md). The model's answers stay exactly as
they were; only the expected answers and the summary change. Run from the repo root:

    python evals/rescore.py                                  (evals/results/latest.json)
    python evals/rescore.py evals/results/run4_2026-11-05.json
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "evals"))

from cases import CASES  # noqa: E402
from run_evals import results_markdown, summarize  # noqa: E402


def rescore(run):
    labels = {case["id"]: case["expected"] for case in CASES}
    for group in ("clear", "ambiguous"):
        for result in run["results"].get(group, []):
            result["expected"] = labels[result["id"]]
    run["summary"] = summarize(run["results"])
    run["rescored"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return run


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "evals" / "results" / "latest.json"
    run = rescore(json.loads(path.read_text()))
    path.write_text(json.dumps(run, indent=2))

    report = results_markdown(run["summary"], run["model"], run["when"])
    report += (f"\nRe-scored {run['rescored']} with the current labels (see evals/LABEL_CHANGES.md). "
               "The model's answers are unchanged.\n")
    if path.name == "latest.json":
        (ROOT / "evals" / "RESULTS.md").write_text(report)
    print(report)


if __name__ == "__main__":
    main()
