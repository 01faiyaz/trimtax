"""Approving a proposed rule update: edit the rules file, record who approved it.

The rules files are written by hand and have comments, so approving edits only the lines
that change (the value, the source, who approved it and when, and the ruleset version)
and leaves everything else exactly as it was. Text in, text out; no files are read here.
"""

import copy
import re

import yaml

from engine.rules import Ruleset


class StaleUpdate(Exception):
    """The rule's current value is neither the proposal's "from" nor its "to"."""


def next_version(version):
    """ "2026.1" -> "2026.2" """
    year, number = version.split(".")
    return f"{year}.{int(number) + 1}"


def show_value(field, value):
    """A value in plain words, like "$2,000", "50%" or "15 years"."""
    if value is None:
        return "not decided"
    if field.endswith("_cents"):
        return f"${value // 100:,}" + (f".{value % 100:02d}" if value % 100 else "")
    if field == "percent":
        return f"{value}%"
    return f"{value} years"


def rule_block(lines, rule_id):
    """(first, last) line numbers of one rule in the file. last is exclusive."""
    first = None
    for number, line in enumerate(lines):
        if re.match(rf"^\s*- id: {re.escape(rule_id)}\s*$", line):
            first = number
            break
    if first is None:
        raise KeyError(rule_id)
    last = first + 1
    while last < len(lines) and not re.match(r"^\s*- id: ", lines[last]) and not lines[last].lstrip().startswith("# ---"):
        last += 1
    return first, last


def set_line(lines, first, last, key, new_text):
    """Replace "key: ..." inside a block, keeping its indentation. The key must be there."""
    for number in range(first, last):
        found = re.match(rf"^(\s*){re.escape(key)}:", lines[number])
        if found:
            lines[number] = f"{found.group(1)}{key}: {new_text}"
            return
    raise KeyError(key)


def quoted(text):
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def approve_update(rules_text, update, approver, day):
    """Apply an approved update to one rules file.

    Returns (new_text, outcome). outcome is "changed" when the value moved (the ruleset
    version goes up by one), or "already_matches" when the file already has the new value
    (nothing in the file changes; the approval is only recorded in the update log).
    """
    ruleset = Ruleset(yaml.safe_load(rules_text))
    current = ruleset.value(update["rule_id"], update["field"])
    if current == update["to"]:
        return rules_text, "already_matches"
    if current != update["from"]:
        raise StaleUpdate(f"{update['rule_id']}.{update['field']} is {current}, but the proposal "
                          f"expected {update['from']}. Propose it again against the current rules.")

    lines = rules_text.split("\n")
    first, last = rule_block(lines, update["rule_id"])
    value_line = f"{update['to']}  # {show_value(update['field'], update['to'])}"
    set_line(lines, first, last, update["field"], value_line)
    set_line(lines, first, last, "cite", quoted(update["source"]["cite"]))
    set_line(lines, first, last, "url", quoted(update["source"]["url"]))
    set_line(lines, first, last, "check_status", "checked")
    set_line(lines, first, last, "approved_by", quoted(approver))
    set_line(lines, first, last, "approved_on", day.isoformat())

    for number, line in enumerate(lines):
        if line.startswith("ruleset_version:"):
            lines[number] = f"ruleset_version: {quoted(next_version(ruleset.version))}"
            break
    return "\n".join(lines), "changed"


def with_demo_changes(ruleset, changes):
    """The ruleset with one demo copy's approved changes on top. The rules files are never touched.

    Each change is a proposal someone approved in that demo copy. The version shows it, like
    "2026.1+demo.1", so every result made with these rules says they aren't the real ruleset.
    """
    if not changes:
        return ruleset
    data = copy.deepcopy(ruleset.data)
    rules = {rule["id"]: rule for rule in data["rules"]}
    for change in changes:
        rule = rules[change["rule_id"]]
        rule[change["field"]] = change["to"]
        rule["source"] = {"cite": change["source"]["cite"], "url": change["source"]["url"]}
        rule["check_status"] = "checked"
        rule["approved_by"] = change["decided_by"]
        rule["approved_on"] = change["decided_on"]
        rule["demo_change"] = f"{show_value(change['field'], change['from'])} \u2192 {show_value(change['field'], change['to'])}"
    data["ruleset_version"] = f"{ruleset.version}+demo.{len(changes)}"
    return Ruleset(data)
