"""The API end to end, using the real Tidewell data and a throwaway database."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("TRIMTAX_SQLITE_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def demo(client):
    return client.post("/workspaces/demo").json()["workspace_id"]


def test_overview_shows_the_demo_numbers(client, demo):
    view = client.get(f"/workspaces/{demo}/overview").json()
    assert view["as_of"] == "2026-11-19"
    assert view["clock"]["days_left"] == 42
    assert view["california_equipment"]["room_cents"] == 660000
    assert view["contractors"]["forms_needed"] == 4
    assert len(view["open_items"]) == 3
    assert view["receipts_filed"] == 142
    assert view["is_demo"] is True


def test_check_purchase(client, demo):
    body = {"price_each_cents": 289900, "quantity": 3, "in_use_by": "2026-12-10"}
    result = client.post(f"/workspaces/{demo}/check-purchase", json=body).json()
    assert result["federal"]["this_year_cents"] == 869700
    assert result["california"]["this_year_cents"] == 660000
    assert result["california"]["later_cents"] == 209700


def test_check_purchase_adds_sales_tax(client, demo):
    body = {"price_each_cents": 239900, "quantity": 3, "in_use_by": "2026-12-10",
            "sales_tax_percent": "7.25"}
    result = client.post(f"/workspaces/{demo}/check-purchase", json=body).json()
    assert result["price_each_cents"] == 257293
    assert result["small_item"]["qualifies"] is False


def test_bad_inputs_are_refused(client, demo):
    zero = {"price_each_cents": 0, "quantity": 3, "in_use_by": "2026-12-10"}
    assert client.post(f"/workspaces/{demo}/check-purchase", json=zero).status_code == 422
    words = {"price_each_cents": 100, "quantity": 1, "in_use_by": "2026-12-10",
             "sales_tax_percent": "lots"}
    assert client.post(f"/workspaces/{demo}/check-purchase", json=words).status_code == 422
    assert client.get("/workspaces/nope/overview").status_code == 404


def test_answering_sweetgreen_moves_it_into_team_meals(client, demo):
    questions = client.get(f"/workspaces/{demo}/questions").json()["questions"]
    assert len(questions) == 1
    sweetgreen = questions[0]
    assert sweetgreen["merchant"] == "Sweetgreen"
    team = [o for o in sweetgreen["options"] if o["category"] == "team_meal_office"][0]
    assert team["outcome"]["federal"]["deductible_cents"] == 0
    assert team["outcome"]["california"]["deductible_cents"] == 41200

    url = f"/workspaces/{demo}/questions/{sweetgreen['transaction_id']}"
    assert client.post(url + "/answer", json={"category": "team_meal_office"}).status_code == 200

    view = client.get(f"/workspaces/{demo}/overview").json()
    team_row = [r for r in view["meals"]["rows"] if r["category"] == "team_meal_office"][0]
    assert team_row["spent_cents"] == 459200
    assert len(view["open_items"]) == 2

    client.post(url + "/undo")
    view = client.get(f"/workspaces/{demo}/overview").json()
    assert len(view["open_items"]) == 3


def test_an_answer_outside_the_options_is_refused(client, demo):
    question = client.get(f"/workspaces/{demo}/questions").json()["questions"][0]
    url = f"/workspaces/{demo}/questions/{question['transaction_id']}/answer"
    assert client.post(url, json={"category": "equipment"}).status_code == 400


def test_two_visitors_dont_share_answers(client, demo):
    other = client.post("/workspaces/demo").json()["workspace_id"]
    question = client.get(f"/workspaces/{demo}/questions").json()["questions"][0]
    client.post(f"/workspaces/{demo}/questions/{question['transaction_id']}/answer",
                json={"category": "client_meal"})
    assert len(client.get(f"/workspaces/{demo}/overview").json()["open_items"]) == 2
    assert len(client.get(f"/workspaces/{other}/overview").json()["open_items"]) == 3


def test_reset_puts_the_demo_back(client, demo):
    question = client.get(f"/workspaces/{demo}/questions").json()["questions"][0]
    client.post(f"/workspaces/{demo}/questions/{question['transaction_id']}/answer",
                json={"category": "client_meal"})
    client.post(f"/workspaces/{demo}/reset")
    assert len(client.get(f"/workspaces/{demo}/overview").json()["open_items"]) == 3


def test_start_fresh_is_empty_and_uses_today(client):
    profile = {"name": "My Co", "expected_net_income_cents": 5000000}
    workspace = client.post("/workspaces", json=profile).json()["workspace_id"]
    view = client.get(f"/workspaces/{workspace}/overview").json()
    assert view["company"] == "My Co"
    assert view["california_equipment"]["room_cents"] == 2500000
    assert view["open_items"] == []
    assert view["is_demo"] is False
    assert client.post(f"/workspaces/{workspace}/reset").status_code == 400


def test_rules_switch(client, demo):
    result = client.get(f"/workspaces/{demo}/compare").json()
    assert result["forms_needed"] == {"before": 13, "after": 4}
    rules = client.get("/rules/2026").json()
    assert rules["version"] == "2026.1"
    assert client.get("/rules/2024").status_code == 404


def test_packet_says_it_is_not_a_filing(client, demo):
    packet = client.get(f"/workspaces/{demo}/packet").json()
    assert "not a tax filing" in packet["note"]
    assert len(packet["open_items"]) == 3
    assert len(packet["flagged"]) == 2


def test_receipt_images_are_served(client):
    response = client.get("/receipt-images/rcp_140.png")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"


def test_request_w9_shows_on_the_open_item(client, demo):
    view = client.get(f"/workspaces/{demo}/overview").json()
    dana = [i for i in view["open_items"] if i["kind"] == "missing_w9"][0]
    assert dana["w9_requested"] is False

    client.post(f"/workspaces/{demo}/contractors/{dana['contractor_id']}/request-w9")
    view = client.get(f"/workspaces/{demo}/overview").json()
    dana = [i for i in view["open_items"] if i["kind"] == "missing_w9"][0]
    assert dana["w9_requested"] is True
    # Still an open item: asking isn't the same as having it.
    assert len(view["open_items"]) == 3

    client.post(f"/workspaces/{demo}/contractors/{dana['contractor_id']}/request-w9?undo=true")
    view = client.get(f"/workspaces/{demo}/overview").json()
    assert [i for i in view["open_items"] if i["kind"] == "missing_w9"][0]["w9_requested"] is False


def test_answers_and_w9_requests_dont_erase_each_other(client, demo):
    view = client.get(f"/workspaces/{demo}/overview").json()
    dana_id = [i for i in view["open_items"] if i["kind"] == "missing_w9"][0]["contractor_id"]
    client.post(f"/workspaces/{demo}/contractors/{dana_id}/request-w9")
    question = client.get(f"/workspaces/{demo}/questions").json()["questions"][0]
    client.post(f"/workspaces/{demo}/questions/{question['transaction_id']}/answer",
                json={"category": "client_meal"})
    view = client.get(f"/workspaces/{demo}/overview").json()
    assert [i for i in view["open_items"] if i["kind"] == "missing_w9"][0]["w9_requested"] is True


def test_add_purchase_to_packet(client, demo):
    body = {"price_each_cents": 289900, "quantity": 3, "in_use_by": "2026-12-10"}
    saved = client.post(f"/workspaces/{demo}/packet/purchases", json=body).json()
    assert saved[0]["result"]["california"]["this_year_cents"] == 660000
    packet = client.get(f"/workspaces/{demo}/packet").json()
    assert packet["purchases"][0]["input"]["in_use_by"] == "2026-12-10"
    # Adding a purchase to the packet doesn't record it as bought.
    view = client.get(f"/workspaces/{demo}/overview").json()
    assert view["california_equipment"]["room_cents"] == 660000

    client.post(f"/workspaces/{demo}/packet/purchases/clear")
    assert client.get(f"/workspaces/{demo}/packet").json()["purchases"] == []


def test_reset_clears_w9_requests_and_purchases(client, demo):
    body = {"price_each_cents": 289900, "quantity": 3, "in_use_by": "2026-12-10"}
    client.post(f"/workspaces/{demo}/packet/purchases", json=body)
    client.post(f"/workspaces/{demo}/reset")
    assert client.get(f"/workspaces/{demo}/packet").json()["purchases"] == []


def test_questions_and_flagged_items_point_to_their_receipt_images(client, demo):
    question = client.get(f"/workspaces/{demo}/questions").json()["questions"][0]
    assert question["image"] == "receipt-images/rcp_140.png"
    flagged = client.get(f"/workspaces/{demo}/overview").json()["flagged"]
    images = sorted(f["image"] for f in flagged)
    assert images == ["receipt-images/rcp_137.png", "receipt-images/rcp_139.png"]
    for name in images:
        assert client.get(f"/{name}").status_code == 200
