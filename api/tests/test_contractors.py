from datetime import date

from engine.contractors import contractor_watch, de542_status
from engine.records import Contractor, Transaction


def row_for(watch, name):
    for row in watch["contractors"]:
        if row["name"] == name:
            return row
    raise AssertionError(f"no row for {name}")


def test_four_forms_now_thirteen_under_the_old_line(tidewell, rules_2026):
    watch = contractor_watch(tidewell.transactions, tidewell.contractors, rules_2026)
    assert watch["line_cents"] == 200000
    assert watch["forms_needed"] == 4
    assert watch["forms_under_old_line"] == 13


def test_dana_reyes(tidewell, rules_2026):
    watch = contractor_watch(tidewell.transactions, tidewell.contractors, rules_2026)
    dana = row_for(watch, "Dana Reyes")
    assert dana["paid_cents"] == 185000
    assert dana["w9_on_file"] is False
    assert dana["cents_to_line"] == 15000
    assert dana["near_line"] is True
    assert dana["federal_1099"] == "not_yet"
    assert dana["california_de542"] == "unclear"
    assert watch["missing_w9"] == ["Dana Reyes"]


def test_arjun_patel(tidewell, rules_2026):
    watch = contractor_watch(tidewell.transactions, tidewell.contractors, rules_2026)
    arjun = row_for(watch, "Arjun Patel")
    assert arjun["paid_cents"] == 170000
    assert arjun["cents_to_line"] == 30000
    assert arjun["near_line"] is True


def test_de542_unclear_for_everyone_between_600_and_1999(tidewell, rules_2026):
    watch = contractor_watch(tidewell.transactions, tidewell.contractors, rules_2026)
    assert len(watch["de542_unclear"]) == 9
    for row in watch["contractors"]:
        if 60000 <= row["paid_cents"] < 200000:
            assert row["california_de542"] == "unclear"
        elif row["paid_cents"] >= 200000:
            assert row["california_de542"] == "required"
        else:
            assert row["california_de542"] == "not_needed"


def test_2025_rules_need_thirteen_forms(tidewell, rules_2025, rules_2026):
    old_rules = rules_2025.moved_to_year_of(rules_2026)
    watch = contractor_watch(tidewell.transactions, tidewell.contractors, old_rules)
    assert watch["forms_needed"] == 13
    assert watch["de542_unclear"] == []


def test_corporations_dont_get_1099s(rules_2026):
    firm = Contractor("c1", "Big Firm Inc.", "corporation", True, "US")
    payment = Transaction("t1", date(2026, 3, 1), "Big Firm Inc.", 900000,
                          "contractor", "confirmed", payee_id="c1")
    watch = contractor_watch([payment], [firm], rules_2026)
    assert watch["forms_needed"] == 0
    assert watch["contractors"][0]["federal_1099"] == "exempt"
    assert watch["contractors"][0]["california_de542"] == "not_applicable"


def test_de542_exactly_2000_is_required(rules_2026):
    person = Contractor("c2", "Pat", "individual", True, "US")
    rule = rules_2026.rule("ca_de542_report")
    assert de542_status(199999, person, rule) == "unclear"
    assert de542_status(200000, person, rule) == "required"
    assert de542_status(59999, person, rule) == "not_needed"
