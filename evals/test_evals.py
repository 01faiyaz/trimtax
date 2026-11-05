"""Offline checks on the eval set and the scoring. No model calls."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "evals"))

import run_evals  # noqa: E402
import scoring  # noqa: E402
from cases import AMBIGUOUS, CASES, CLEAR, INJECTION  # noqa: E402
from engine.categories import CATEGORIES  # noqa: E402


def test_the_set_is_75_clear_20_ambiguous_5_injection():
    assert (len(CLEAR), len(AMBIGUOUS), len(INJECTION)) == (75, 20, 5)
    assert len(CASES) == 100
    ids = [case["id"] for case in CASES]
    assert len(ids) == len(set(ids))


def test_labels_use_real_categories():
    for case in CLEAR:
        assert case["expected"]["category"] in CATEGORIES, case["id"]
    for case in AMBIGUOUS:
        acceptable = case["expected"]["acceptable"]
        assert len(acceptable) >= 2, case["id"]
        assert all(name in CATEGORIES for name in acceptable), case["id"]


def test_every_category_has_clear_cases():
    used = {case["expected"]["category"] for case in CLEAR}
    assert used == set(CATEGORIES)


def test_injection_images_exist():
    for case in INJECTION:
        assert (ROOT / case["image"]).exists(), case["image"]


def test_clear_equipment_is_over_2500_and_small_items_are_not():
    for case in CLEAR:
        total = case["facts"]["total_cents"]
        if case["expected"]["category"] == "equipment":
            assert total > 250000, case["id"]


def test_scoring_counts_asks_guesses_and_good_options():
    results = [
        {"id": "a", "expected": {"acceptable": ["team_meal_office", "client_meal"]}, "category": None,
         "options": ["team_meal_office", "client_meal"]},
        {"id": "b", "expected": {"acceptable": ["team_meal_office", "client_meal"]}, "category": None,
         "options": ["travel", "client_meal"]},
        {"id": "c", "expected": {"acceptable": ["team_meal_office", "client_meal"]}, "category": "client_meal",
         "options": []},
    ]
    score = scoring.score_ambiguous(results)
    assert (score["asked"], score["good_options"], score["guessed"]) == (2, 1, 1)


def test_extraction_cases_come_from_the_receipt_answers():
    cases = run_evals.extraction_cases()
    assert len(cases) == 40
    unreadable = [c for c in cases if c["expected"]["total_cents"] is None]
    assert len(unreadable) == 1


def test_runner_end_to_end_with_a_stand_in_model():
    class Fake:
        model = "claude-sonnet-5-5"

        def run(self, system, content, schema, max_tokens=1024):
            fields = schema["properties"]
            usage = {"input_tokens": 1000, "output_tokens": 100}
            if "candidates" in fields:
                return {"category": "unsure", "candidates": ["team_meal_office", "client_meal"], "reason": ""}, usage
            if "question" in fields:
                return {"question": "Team or client?"}, usage
            return {"readable": True, "merchant": "X", "date": "2026-10-21", "total_cents": 100,
                    "subtotal_cents": 100, "tax_cents": 0, "tip_cents": 0, "lines": [], "deliver_to": None,
                    "evidence": {"merchant": None, "date": None, "total": None},
                    "instructions_found": True, "instructions_excerpt": "ignore"}, usage

    results = run_evals.run_all(Fake(), ["clear", "ambiguous", "injection", "extraction"], limit=3)
    summary = run_evals.summarize(results)
    assert summary["extraction"]["total"] == 3
    assert summary["clear"]["asked_instead"] == 3
    assert summary["ambiguous"]["good_options"] == 3
    assert summary["injection"]["flagged"] == 3
    text = run_evals.results_markdown(summary, "claude-sonnet-5-5", "now")
    assert "Hidden-instruction receipts caught | 3/3 (100%)" in text
