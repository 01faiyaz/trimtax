"""The rule update log, rules/updates.yaml: every change the AI proposed and what a person decided.

The scripts in api/scripts write to it. The API only reads it.
"""

from pathlib import Path

import yaml

from engine.rules import RULES_DIR

LOG_PATH = RULES_DIR / "updates.yaml"

HEADER = """# Rule update log for TrimTax.
#
# Each entry is a rule change the AI proposed (propose_rule_update) from a passage of
# official text, with the exact sentence it relied on. A person then approves or rejects it.
# Written by api/scripts/propose_rule_update.py and api/scripts/review_rule_update.py.
# Don't edit by hand.
#
# outcome: "changed" = the value in rules/<year>.yaml moved and its version went up;
#          "already_matches" = the file already had this value, so only the approval is recorded.

"""


def load_log(path=None):
    path = Path(path or LOG_PATH)
    if not path.exists():
        return []
    data = yaml.safe_load(path.read_text()) or {}
    return data.get("updates", [])


def save_log(updates, path=None):
    text = yaml.safe_dump({"updates": updates}, sort_keys=False, allow_unicode=True, width=100)
    Path(path or LOG_PATH).write_text(HEADER + text)


def next_id(updates):
    numbers = [int(u["id"].split("_")[1]) for u in updates]
    return f"upd_{max(numbers, default=0) + 1:03d}"


def find(updates, update_id):
    for update in updates:
        if update["id"] == update_id:
            return update
    raise KeyError(f"No update with id {update_id}")


def updates_for_year(year, path=None):
    return [u for u in load_log(path) if u["year"] == year]
