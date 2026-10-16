import pytest
from datetime import datetime, timezone, timedelta


def test_create_and_list_deadlines(client, auth_headers):
    due = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    res = client.post("/api/v1/deadlines/", json={
        "title": "Machine Learning Term Paper Submission",
        "event_type": "Assignment",
        "due_date": due,
        "is_ambiguous": False
    }, headers=auth_headers)
    assert res.status_code == 201
    deadline_id = res.json()["id"]

    list_res = client.get("/api/v1/deadlines/", headers=auth_headers)
    assert list_res.status_code == 200
    deadlines = list_res.json()
    assert len(deadlines) >= 1
    assert any(d["id"] == deadline_id for d in deadlines)


def test_deadline_duplicate_detection(client, auth_headers):
    due = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    # Create initial deadline
    client.post("/api/v1/deadlines/", json={
        "title": "Database Systems Quiz",
        "event_type": "Examination",
        "due_date": due
    }, headers=auth_headers)

    # Check duplicate check endpoint
    dup_res = client.post("/api/v1/deadlines/check-duplicate", json={
        "title": "Database Systems Quiz",
        "event_type": "Examination",
        "due_date": due
    }, headers=auth_headers)
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["is_duplicate"] is True
    assert "Database Systems Quiz" in dup_data["existing_title"]
