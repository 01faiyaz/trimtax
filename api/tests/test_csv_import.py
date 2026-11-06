"""Importing a transactions CSV into a "Start fresh" company."""

from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.csv_import import BadFile, find_category, import_transactions, parse_cents, parse_date, read_rows
from app.main import app
from engine.records import Company, Workspace


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("TRIMTAX_SQLITE_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as test_client:
        yield test_client


def empty_company():
    company = Company(name="Test Co", entity_type="s_corporation", state="CA",
                      expected_net_income_cents=5_000_000, small_item_election=True)
    return Workspace(company=company, contractors=[], transactions=[], receipts=[])


def start_fresh(client):
    response = client.post("/workspaces", json={"name": "Test Co", "expected_net_income_cents": 5_000_000})
    return response.json()["workspace_id"]


def upload(client, workspace_id, text):
    return client.post(f"/workspaces/{workspace_id}/transactions", files={"file": ("t.csv", text.encode("utf-8"), "text/csv")})


def test_amounts_are_read_exactly():
    assert parse_cents("$1,234.56") == 123456
    assert parse_cents("19.9") == 1990
    assert parse_cents("(12.00)") == -1200
    assert parse_cents("-5") == -500
    assert parse_cents("1.005") is None
    assert parse_cents("about ten") is None


def test_dates_in_two_formats():
    assert parse_date("2026-03-04") == date(2026, 3, 4)
    assert parse_date("03/04/2026") == date(2026, 3, 4)
    assert parse_date("March 4") is None


def test_category_by_key_or_label():
    assert find_category("client_meal") == "client_meal"
    assert find_category("Meal with a client") == "client_meal"
    assert find_category("Food") == ""


def test_missing_columns_are_named():
    with pytest.raises(BadFile, match="amount"):
        read_rows("date,merchant\n2026-01-02,GitHub\n")


def test_rows_are_sorted_into_counted_waiting_and_skipped():
    workspace = empty_company()
    text = (
        "Date,Merchant,Amount,Category,Payee\n"
        "2026-01-02,GitHub,$44.00,software,\n"
        "2026-02-10,Sweetgreen,412.00,,\n"
        "2026-03-01,Dana Reyes,\"1,850.00\",contractor,Dana Reyes\n"
        "2026-03-15,Dana Reyes,150.00,Contractor payment,dana reyes\n"
        "2026-04-01,Mystery Vendor,99.00,contractor,\n"
        "2025-12-30,Old Vendor,10.00,software,\n"
        "2026-12-01,Future Vendor,10.00,software,\n"
        "2026-05-01,Refund Shop,-20.00,office_supplies,\n"
        "soon,Bad Date,10.00,software,\n"
    )
    result = import_transactions(text, workspace, today=date(2026, 11, 6))

    assert result["added"] == 5
    assert result["needs_category"] == 1
    assert result["skipped"] == 4
    reasons = {p["line"]: p["reason"] for p in result["problems"]}
    assert reasons[6] == "Contractor payment with no payee, so it won't count toward a 1099."
    assert reasons[7] == "Not in 2026."
    assert reasons[8] == "Dated in the future."
    assert reasons[9] == "Refunds and credits aren't counted yet."
    assert "date" in reasons[10]

    waiting = [t for t in workspace.transactions if t.status == "needs_answer"]
    assert [t.merchant for t in waiting] == ["Sweetgreen"]
    # Both of Dana's payments go to one contractor, matched by name.
    assert len(workspace.contractors) == 1
    assert workspace.contractors[0].w9_on_file is False


def test_importing_the_same_file_twice_adds_nothing(client):
    workspace_id = start_fresh(client)
    text = "date,merchant,amount,category\n2026-01-02,GitHub,44.00,software\n2026-01-02,GitHub,44.00,software\n"
    first = upload(client, workspace_id, text).json()
    second = upload(client, workspace_id, text).json()
    assert first["added"] == 2  # two identical rows in one file can both be real
    assert second["added"] == 0
    assert second["problems"][0]["reason"] == "Already imported."


def test_an_uncategorized_row_becomes_a_question_you_can_answer(client):
    workspace_id = start_fresh(client)
    upload(client, workspace_id, "date,merchant,amount\n2026-02-10,Sweetgreen,412.00\n")
    questions = client.get(f"/workspaces/{workspace_id}/questions").json()["questions"]
    assert len(questions) == 1
    transaction_id = questions[0]["transaction_id"]
    answered = client.post(f"/workspaces/{workspace_id}/questions/{transaction_id}/answer", json={"category": "client_meal"})
    assert answered.status_code == 200
    after = client.get(f"/workspaces/{workspace_id}/questions").json()["questions"][0]
    assert (after["status"], after["category"]) == ("confirmed", "client_meal")


def test_contractor_payments_count_toward_the_1099_line(client):
    workspace_id = start_fresh(client)
    upload(client, workspace_id, "date,merchant,amount,category,payee\n2026-03-01,Dana,1850.00,contractor,Dana Reyes\n")
    contractors = client.get(f"/workspaces/{workspace_id}/overview").json()["contractors"]
    assert "Dana Reyes" in str(contractors)


def test_the_demo_company_cant_import(client):
    demo_id = client.post("/workspaces/demo").json()["workspace_id"]
    response = upload(client, demo_id, "date,merchant,amount\n2026-01-02,GitHub,44.00\n")
    assert response.status_code == 400


def test_a_bad_file_says_why(client):
    workspace_id = start_fresh(client)
    response = upload(client, workspace_id, "when,where,how much\n")
    assert response.status_code == 400
    assert "date, merchant, amount" in response.json()["detail"]
