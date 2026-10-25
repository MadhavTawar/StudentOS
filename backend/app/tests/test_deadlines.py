import pytest
from datetime import datetime, timezone, timedelta

from backend.app.models.deadline import Deadline


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


def test_list_deadlines_status_filter_overdue_matches_effective_status(
    db, test_user
):
    from backend.app.services.deadline_service import DeadlineService

    past_due = datetime.now(timezone.utc) - timedelta(hours=2)
    # Stored status is "Upcoming" even though it is past due.
    d = Deadline(
        user_id=test_user.id,
        title="Past deadline stored as Upcoming",
        event_type="Assignment",
        due_date=past_due,
        status="Upcoming",
    )
    db.add(d)
    db.commit()

    results, total = DeadlineService.list_deadlines(db, test_user.id, status_filter="Overdue")
    assert total == 1
    assert len(results) == 1
    assert results[0].id == d.id
    assert results[0].status == "Overdue"


def test_list_deadlines_status_filter_due_soon_matches_effective_status(
    db, test_user
):
    from backend.app.services.deadline_service import DeadlineService

    soon = datetime.now(timezone.utc) + timedelta(hours=5)
    d = Deadline(
        user_id=test_user.id,
        title="Due soon stored as Upcoming",
        event_type="Assignment",
        due_date=soon,
        status="Upcoming",
    )
    db.add(d)
    db.commit()

    results, total = DeadlineService.list_deadlines(db, test_user.id, status_filter="Due Soon")
    assert total == 1
    assert len(results) == 1
    assert results[0].id == d.id
    assert results[0].status == "Due Soon"


def test_list_deadlines_status_filter_upcoming_excludes_past_due(
    db, test_user
):
    from backend.app.services.deadline_service import DeadlineService

    past_due = datetime.now(timezone.utc) - timedelta(hours=2)
    d = Deadline(
        user_id=test_user.id,
        title="Past deadline stored as Upcoming",
        event_type="Assignment",
        due_date=past_due,
        status="Upcoming",
    )
    db.add(d)
    db.commit()

    results, total = DeadlineService.list_deadlines(db, test_user.id, status_filter="Upcoming")
    assert total == 0
    assert len(results) == 0


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
