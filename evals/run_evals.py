"""Run the evals against the real model and write the results.

Needs ANTHROPIC_API_KEY. From the repo root:

    python evals/run_evals.py                 # everything (about $1)
    python evals/run_evals.py --only clear    # clear | ambiguous | injection | extraction

Writes evals/results/latest.json and evals/RESULTS.md. Every result is kept,
failures included.
"""

import argparse
import base64
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))
sys.path.insert(0, str(ROOT / "evals"))

from ai.grounding import is_grounded  # noqa: E402
from ai.model import DEFAULT_MODEL, ClaudeModel  # noqa: E402
from ai.pipeline import process_receipt  # noqa: E402
from ai.skills import (  # noqa: E402
    CLASSIFY_VERSION, EXTRACT_VERSION, QUESTION_VERSION,
    ask_clarifying_question, classify_transaction, extract_receipt,
)
from cases import AMBIGUOUS, CLEAR, INJECTION  # noqa: E402
import scoring  # noqa: E402

RULESET = "2026.1"
AS_OF = date(2026, 11, 19)
TIDEWELL = ROOT / "data" / "tidewell"


def run_sorting_case(model, case):
    """The sorting step plus the question, the way the pipeline runs them."""
    traces = []
    facts = case["facts"]
    sorted_as = classify_transaction(model, facts, RULESET, traces)
    result = {"id": case["id"], "expected": case["expected"], "category": sorted_as["category"],
              "options": [], "question": None, "traces": traces}
    if not traces[0]["ok"]:
        # A failed call is its own result. It is not counted as the model choosing to ask.
        result["failed"] = True
        return result
    if sorted_as["category"] is None:
        asked = ask_clarifying_question(model, facts, sorted_as["candidates"], RULESET, traces)
        result["options"] = asked["options"]
        result["question"] = asked["question"]
        result["question_grounded"] = is_grounded(asked["question"], [facts["total_cents"]])
        result["used_template"] = traces[-1].get("used_template", False)
    return result


def read_image(path):
    data = (ROOT / path).read_bytes()
    return base64.b64encode(data).decode("ascii")


def run_injection_case(model, case):
    transaction, receipt, summary, traces = process_receipt(
        model, read_image(case["image"]), "image/png", "up_eval", AS_OF, RULESET)
    return {"id": case["id"], "expected": case["expected"], "state": summary["state"],
            "reason": summary.get("reason"), "category": summary.get("category"),
            "skills": [t["skill"] for t in traces], "traces": traces}


def extraction_cases():
    """The 40 drawn receipts, checked against the answers they were drawn from."""
    details = json.loads((TIDEWELL / "receipt_details.json").read_text())
    cases = []
    for receipt_id, entry in sorted(details.items()):
        cases.append({
            "id": receipt_id,
            "image": f"data/tidewell/receipt_images/{receipt_id}.png",
            "expected": {"total_cents": entry["total_cents"], "date": entry["date"], "merchant": entry["merchant"]},
        })
    return cases


def run_extraction_case(model, case):
    traces = []
    facts = extract_receipt(model, read_image(case["image"]), "image/png", RULESET, traces)
    facts = facts or {}
    return {"id": case["id"], "expected": case["expected"], "total_cents": facts.get("total_cents"),
            "date": facts.get("date"), "merchant": facts.get("merchant"), "traces": traces}


def run_all(model, parts, limit=None):
    results = {}
    if "clear" in parts:
        results["clear"] = [run_sorting_case(model, c) for c in CLEAR[:limit]]
    if "ambiguous" in parts:
        results["ambiguous"] = [run_sorting_case(model, c) for c in AMBIGUOUS[:limit]]
    if "injection" in parts:
        results["injection"] = [run_injection_case(model, c) for c in INJECTION[:limit]]
    if "extraction" in parts:
        results["extraction"] = [run_extraction_case(model, c) for c in extraction_cases()[:limit]]
    return results


def summarize(results):
    summary = {}
    if "clear" in results:
        summary["clear"] = scoring.score_clear(results["clear"])
    if "ambiguous" in results:
        summary["ambiguous"] = scoring.score_ambiguous(results["ambiguous"])
    if "injection" in results:
        summary["injection"] = scoring.score_injection(results["injection"])
    if "extraction" in results:
        summary["extraction"] = scoring.score_extraction(results["extraction"])
    sorting = results.get("clear", []) + results.get("ambiguous", [])
    summary["questions"] = scoring.score_questions(sorting)
    everything = []
    for part in results.values():
        everything += part
    summary["costs"] = scoring.score_costs(everything)
    return summary


def pct(part, whole):
    return f"{part}/{whole} ({round(100 * part / whole)}%)" if whole else "—"


def results_markdown(summary, model_name, when):
    lines = [
        "# Eval results",
        "",
        f"Run {when} on `{model_name}`, ruleset {RULESET}. Prompts: {EXTRACT_VERSION}, "
        f"{CLASSIFY_VERSION}, {QUESTION_VERSION}. Every case is included, failures too.",
        "",
        "| Check | Result |",
        "|---|---|",
    ]
    if "clear" in summary:
        s = summary["clear"]
        lines.append(f"| Clear purchases sorted correctly | {pct(s['correct'], s['total'])} |")
        lines.append(f"| Clear purchases where it asked instead | {s['asked_instead']} |")
        lines.append(f"| Clear purchases sorted wrong | {s['wrong']} |")
        lines.append(f"| Clear purchases lost to a failed model call | {s['failed']} |")
    if "ambiguous" in summary:
        s = summary["ambiguous"]
        lines.append(f"| Ambiguous purchases where it asked instead of guessing | {pct(s['asked'], s['total'])} |")
        lines.append(f"| ...and offered two fair answers | {pct(s['good_options'], s['total'])} |")
        lines.append(f"| Ambiguous purchases lost to a failed model call | {s['failed']} |")
    if "injection" in summary:
        s = summary["injection"]
        lines.append(f"| Hidden-instruction receipts caught | {pct(s['flagged'], s['total'])} |")
        lines.append(f"| Hidden-instruction receipts that reached the sorting step | {s['reached_sorting']} |")
    if "extraction" in summary:
        s = summary["extraction"]
        lines.append(f"| Receipt totals read exactly | {pct(s['totals_exact'], s['total'])} |")
        lines.append(f"| Receipt dates read exactly | {pct(s['dates_exact'], s['total'])} |")
        lines.append(f"| Merchant names read exactly | {pct(s['merchants_exact'], s['total'])} |")
    q = summary["questions"]
    lines.append(f"| Questions shown with a dollar figure not on the receipt | {q['ungrounded_shown']} of {q['questions_shown']} |")
    lines.append(f"| Questions replaced by the template | {q['template_fallbacks']} |")
    c = summary["costs"]
    lines.append(f"| Model calls (failed) | {c['model_calls']} ({c['failed_calls']}) |")
    lines.append(f"| Median time per case | {c['median_seconds_per_case']} s |")
    lines.append(f"| Median cost per case | ${c['median_cost_per_case_usd']} |")
    lines.append(f"| Total cost of this run | ${c['total_cost_usd']} |")

    lines += ["", "## Misses", ""]
    any_miss = False
    for part in ("clear", "ambiguous", "injection", "extraction"):
        for case_id, got, wanted in summary.get(part, {}).get("misses", []):
            lines.append(f"- {part} `{case_id}`: got {got}, expected {wanted}")
            any_miss = True
    if not any_miss:
        lines.append("None.")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["clear", "ambiguous", "injection", "extraction"])
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    parts = [args.only] if args.only else ["clear", "ambiguous", "injection", "extraction"]

    model = ClaudeModel(DEFAULT_MODEL)
    results = run_all(model, parts, args.limit)
    summary = summarize(results)
    when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    out = ROOT / "evals" / "results"
    out.mkdir(exist_ok=True)
    (out / "latest.json").write_text(json.dumps({"when": when, "model": model.model, "summary": summary,
                                                 "results": results}, indent=2))
    (ROOT / "evals" / "RESULTS.md").write_text(results_markdown(summary, model.model, when))
    print(results_markdown(summary, model.model, when))


if __name__ == "__main__":
    main()
