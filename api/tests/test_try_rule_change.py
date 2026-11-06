"""Try it: a visitor pastes text, the AI proposes, and an approval changes only that demo copy."""

import pytest
from fastapi.testclient import TestClient

from app import main
from engine.rules import RULES_DIR

TEXT = ("For taxable years beginning in 2026, the aggregate cost of property that may be expensed "
        "shall not exceed $30,000 for California purposes. This is a made-up passage for a test.")
QUOTE = "the aggregate cost of property that may be expensed shall not exceed $30,000 for California purposes."


class Fake:
    model = "claude-sonnet-5-5"

    def __init__(self, changes):
        self.changes = changes

    def run(self, system, content, schema, max_tokens=1024):
        return {"changes": self.changes, "note": ""}, {"input_tokens": 3000, "output_tokens": 150}


CA_CAP = {"rule_id": "ca_section_179", "field": "limit_cents", "figure": "$30,000", "quote": QUOTE,
          "reason": "California's cap goes up."}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("TRIMTAX_SQLITE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setattr(main, "make_model", lambda: Fake([CA_CAP]))
    with TestClient(main.app) as test_client:
        yield test_client


def new_demo(client):
    return client.post("/workspaces/demo").json()["workspace_id"]


def propose(client, workspace):
    return client.post(f"/workspaces/{workspace}/rule-proposals",
                       json={"text": TEXT, "cite": "Test passage"}).json()


def test_a_proposal_changes_nothing_until_approved(client):
    demo = new_demo(client)
    result = propose(client, demo)
    [proposal] = result["proposals"]
    assert (proposal["from_text"], proposal["to_text"]) == ("$25,000", "$30,000")
    assert proposal["status"] == "proposed"
    view = client.get(f"/workspaces/{demo}/overview").json()
    assert view["california_equipment"]["room_cents"] == 660000
    assert view["ruleset_version"] == "2026.1"


def test_approving_changes_this_demo_copy_and_says_so(client):
    demo = new_demo(client)
    proposal = propose(client, demo)["proposals"][0]
    approved = client.post(f"/workspaces/{demo}/rule-proposals/{proposal['id']}/approve", json={"name": "A judge"}).json()
    assert (approved["status"], approved["decided_by"], approved["outcome"]) == ("approved", "A judge", "changed")

    view = client.get(f"/workspaces/{demo}/overview").json()
    assert view["california_equipment"]["room_cents"] == 1160000  # $30,000 - $18,400
    assert view["ruleset_version"] == "2026.1+demo.1"

    rules = client.get(f"/workspaces/{demo}/rules/2026").json()
    rule = next(r for r in rules["rules"] if r["id"] == "ca_section_179")
    assert rule["limit_cents"] == 3000000
    assert rule["demo_change"] is True
    assert rule["approved_by"] == "A judge"
    assert len(rules["demo_changes"]) == 1


def test_other_demo_copies_and_the_real_rules_never_change(client):
    rules_file_before = (RULES_DIR / "2026.yaml").read_text()
    demo, other = new_demo(client), new_demo(client)
    proposal = propose(client, demo)["proposals"][0]
    client.post(f"/workspaces/{demo}/rule-proposals/{proposal['id']}/approve", json={"name": "A judge"})

    assert client.get(f"/workspaces/{other}/overview").json()["california_equipment"]["room_cents"] == 660000
    real = client.get("/rules/2026").json()
    assert real["version"] == "2026.1"
    assert next(r for r in real["rules"] if r["id"] == "ca_section_179")["limit_cents"] == 2500000
    assert (RULES_DIR / "2026.yaml").read_text() == rules_file_before


def test_rejecting_changes_nothing_and_a_decision_is_final(client):
    demo = new_demo(client)
    proposal = propose(client, demo)["proposals"][0]
    url = f"/workspaces/{demo}/rule-proposals/{proposal['id']}"
    assert client.post(f"{url}/reject", json={"name": "A judge"}).json()["status"] == "rejected"
    assert client.get(f"/workspaces/{demo}/overview").json()["ruleset_version"] == "2026.1"
    assert client.post(f"{url}/approve", json={"name": "A judge"}).status_code == 409


def test_a_stale_proposal_is_refused(client):
    demo = new_demo(client)
    first = propose(client, demo)["proposals"][0]
    second = propose(client, demo)["proposals"][0]
    client.post(f"/workspaces/{demo}/rule-proposals/{first['id']}/approve", json={"name": "A judge"})
    # The cap is already $30,000 now, so the same proposal is recorded as already matching.
    again = client.post(f"/workspaces/{demo}/rule-proposals/{second['id']}/approve", json={"name": "A judge"}).json()
    assert again["outcome"] == "already_matches"
    assert client.get(f"/workspaces/{demo}/overview").json()["ruleset_version"] == "2026.1+demo.1"


def test_undo_and_reset_put_the_real_rules_back(client):
    demo = new_demo(client)
    proposal = propose(client, demo)["proposals"][0]
    client.post(f"/workspaces/{demo}/rule-proposals/{proposal['id']}/approve", json={"name": "A judge"})
    client.post(f"/workspaces/{demo}/rule-changes/clear")
    assert client.get(f"/workspaces/{demo}/overview").json()["ruleset_version"] == "2026.1"

    proposal = propose(client, demo)["proposals"][0]
    client.post(f"/workspaces/{demo}/rule-proposals/{proposal['id']}/approve", json={"name": "A judge"})
    client.post(f"/workspaces/{demo}/reset")
    assert client.get(f"/workspaces/{demo}/overview").json()["ruleset_version"] == "2026.1"
    assert client.get(f"/workspaces/{demo}/rule-proposals").json() == []


def test_a_rejected_check_comes_back_with_its_reason(client, monkeypatch):
    made_up = dict(CA_CAP, quote="The cap is now $99,000.", figure="$99,000")
    monkeypatch.setattr(main, "make_model", lambda: Fake([made_up]))
    result = propose(client, new_demo(client))
    assert result["proposals"] == []
    assert result["rejected"][0]["why"] == "the quoted sentence isn't in the text"


def test_proposals_are_limited_per_demo_copy(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_PROPOSALS_PER_WORKSPACE", 2)
    demo = new_demo(client)
    propose(client, demo)
    propose(client, demo)
    response = client.post(f"/workspaces/{demo}/rule-proposals", json={"text": TEXT})
    assert response.status_code == 429


def test_each_proposal_call_is_traced(client):
    demo = new_demo(client)
    propose(client, demo)
    traces = client.get(f"/workspaces/{demo}/traces").json()["traces"]
    assert any(t["skill"] == "propose_rule_update" for t in traces)
