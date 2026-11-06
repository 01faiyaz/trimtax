"""Approving a rule update edits only the lines that change, in the real rules files."""

from datetime import date

import pytest
import yaml

from engine.rule_updates import StaleUpdate, approve_update, next_version
from engine.rules import RULES_DIR, Ruleset

TEXT_2025 = (RULES_DIR / "2025.yaml").read_text()
TEXT_2026 = (RULES_DIR / "2026.yaml").read_text()
DAY = date(2026, 11, 6)


def update(**fields):
    base = {
        "rule_id": "fed_1099_nec_threshold",
        "field": "threshold_cents",
        "from": 60000,
        "to": 200000,
        "source": {"cite": "OBBBA (Pub. L. 119-21) sec. 70433", "url": "https://www.congress.gov/bill/119th-congress/house-bill/1/text"},
    }
    base.update(fields)
    return base


def test_a_change_edits_the_value_source_approval_and_version():
    text, outcome = approve_update(TEXT_2025, update(), "Faiyaz Mashrafi", DAY)
    assert outcome == "changed"
    rules = Ruleset(yaml.safe_load(text))
    rule = rules.rule("fed_1099_nec_threshold")
    assert rule["threshold_cents"] == 200000
    assert rule["source"]["cite"] == "OBBBA (Pub. L. 119-21) sec. 70433"
    assert (rule["approved_by"], rule["approved_on"], rule["check_status"]) == ("Faiyaz Mashrafi", DAY, "checked")
    assert rules.version == next_version(Ruleset(yaml.safe_load(TEXT_2025)).version)
    assert "threshold_cents: 200000  # $2,000" in text


def test_a_change_leaves_every_other_rule_and_every_comment_alone():
    text, _ = approve_update(TEXT_2025, update(), "Faiyaz Mashrafi", DAY)
    before = Ruleset(yaml.safe_load(TEXT_2025)).rules
    after = Ruleset(yaml.safe_load(text)).rules
    for rule_id in before:
        if rule_id != "fed_1099_nec_threshold":
            assert after[rule_id] == before[rule_id], rule_id
    comment_lines = lambda t: [line for line in t.split("\n") if line.lstrip().startswith("#")]
    assert comment_lines(text) == comment_lines(TEXT_2025)
    assert len(text.split("\n")) == len(TEXT_2025.split("\n"))


def test_a_proposal_the_file_already_matches_changes_nothing():
    text, outcome = approve_update(TEXT_2026, update(), "Faiyaz Mashrafi", DAY)
    assert outcome == "already_matches"
    assert text == TEXT_2026


def test_a_stale_proposal_is_refused():
    with pytest.raises(StaleUpdate):
        approve_update(TEXT_2026, update(**{"from": 50000, "to": 300000}), "Faiyaz Mashrafi", DAY)


def test_percent_changes_get_a_percent_comment():
    meals = update(rule_id="fed_team_meals_office", field="percent", **{"from": 50, "to": 0})
    text, outcome = approve_update(TEXT_2025, meals, "Faiyaz Mashrafi", DAY)
    assert outcome == "changed"
    assert "percent: 0  # 0%" in text


def test_next_version():
    assert next_version("2026.1") == "2026.2"
    assert next_version("2026.9") == "2026.10"


def test_the_log_saves_loads_and_numbers_entries(tmp_path):
    from app.rule_log import find, load_log, next_id, save_log, updates_for_year
    path = tmp_path / "updates.yaml"
    assert load_log(path) == []
    assert next_id([]) == "upd_001"
    entries = [{"id": "upd_001", "year": 2026, "proposed_on": DAY}, {"id": "upd_002", "year": 2027, "proposed_on": DAY}]
    save_log(entries, path)
    assert path.read_text().startswith("# Rule update log")
    assert load_log(path) == entries
    assert next_id(entries) == "upd_003"
    assert find(entries, "upd_002")["year"] == 2027
    assert [u["id"] for u in updates_for_year(2026, path)] == ["upd_001"]
