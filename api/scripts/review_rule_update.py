"""List, approve or reject proposed rule updates. From the repo root:

    python api/scripts/review_rule_update.py list
    python api/scripts/review_rule_update.py approve upd_001 --by "Faiyaz Mashrafi"
    python api/scripts/review_rule_update.py reject upd_002 --by "Faiyaz Mashrafi" --why "Wrong section"

Only approve after reading the quoted sentence in the source file yourself. Approving a
change edits rules/<year>.yaml (value, source, approver, date) and bumps its version.
"""

import argparse
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "api"))

from app.rule_log import find, load_log, save_log  # noqa: E402
from engine.rule_updates import approve_update  # noqa: E402
from engine.rules import RULES_DIR, load_ruleset  # noqa: E402


def show(update):
    decided = f"{update['status']} by {update['decided_by']} on {update['decided_on']}" if update["decided_by"] else update["status"]
    print(f"{update['id']}  {update['year']}  {update['rule_id']}.{update['field']}: "
          f"{update['from']} -> {update['to']}  [{decided}]")
    print(f"        \"{update['quote']}\"  ({update['source']['cite']})")


def approve(update, approver):
    rules_path = RULES_DIR / f"{update['year']}.yaml"
    new_text, outcome = approve_update(rules_path.read_text(), update, approver, date.today())
    if outcome == "changed":
        rules_path.write_text(new_text)
    update["status"] = "approved"
    update["decided_by"] = approver
    update["decided_on"] = date.today()
    update["outcome"] = outcome
    update["ruleset_version"] = load_ruleset(update["year"]).version
    if outcome == "changed":
        print(f"Changed {update['rule_id']}.{update['field']} in {rules_path.name}; now ruleset {update['ruleset_version']}.")
        print("Now update that rule's plain_words (and note, if it mentions the old value) by hand.")
    else:
        print(f"{rules_path.name} already has this value; recorded the approval only (ruleset {update['ruleset_version']}).")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["list", "approve", "reject"])
    parser.add_argument("update_id", nargs="?")
    parser.add_argument("--by")
    parser.add_argument("--why", default="")
    args = parser.parse_args()

    updates = load_log()
    if args.action == "list":
        for update in updates:
            show(update)
        return
    if not args.update_id or not args.by:
        parser.error("approve and reject need an update id and --by")

    update = find(updates, args.update_id)
    if update["status"] != "proposed":
        parser.error(f"{update['id']} is already {update['status']}")
    if args.action == "approve":
        approve(update, args.by)
    else:
        update["status"] = "rejected"
        update["decided_by"] = args.by
        update["decided_on"] = date.today()
        update["reason_rejected"] = args.why
        print(f"Rejected {update['id']}.")
    save_log(updates)


if __name__ == "__main__":
    main()
