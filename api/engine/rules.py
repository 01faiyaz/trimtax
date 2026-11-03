"""Load a ruleset from rules/<year>.yaml and look up rules by id."""

from pathlib import Path

import yaml

RULES_DIR = Path(__file__).resolve().parents[2] / "rules"


class Ruleset:
    def __init__(self, data):
        self.data = data
        self.version = data["ruleset_version"]
        self.tax_year = data["tax_year"]
        self.year_start = data["tax_year_start"]
        self.year_end = data["tax_year_end"]
        self.rules = {}
        for rule in data["rules"]:
            self.rules[rule["id"]] = rule

    def rule(self, rule_id):
        return self.rules[rule_id]

    def value(self, rule_id, field):
        """One field of one rule, or None if the rule doesn't have it."""
        return self.rules[rule_id].get(field)

    def covers(self, day):
        """True if a date falls inside this ruleset's tax year."""
        return self.year_start <= day <= self.year_end

    def moved_to_year_of(self, other):
        """These rule values, read against another ruleset's tax year.

        Used for "what if last year's rules still applied to this year's spending?"
        """
        data = dict(self.data)
        data["tax_year"] = other.tax_year
        data["tax_year_start"] = other.year_start
        data["tax_year_end"] = other.year_end
        return Ruleset(data)

    def deadline_rules(self):
        found = []
        for rule in self.rules.values():
            if "deadline" in rule:
                found.append(rule)
        return found


def load_ruleset(year, rules_dir=RULES_DIR):
    path = Path(rules_dir) / f"{year}.yaml"
    with open(path) as f:
        return Ruleset(yaml.safe_load(f))
