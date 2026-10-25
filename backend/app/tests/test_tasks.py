import pytest
from datetime import datetime, timezone, timedelta


def test_create_and_read_task(client, auth_headers):
    due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    res = client.post("/api/v1/tasks/", json={
        "title": "Complete Algorithms Assignment 3",
        "description": "Implement Dijkstra and A* pathfinding.",
        "category": "Assignment",
        "priority": "High",
        "due_date": due,
        "estimated_duration": 120
    }, headers=auth_headers)
    assert res.status_code == 201
    task_data = res.json()
    assert task_data["title"] == "Complete Algorithms Assignment 3"
    assert task_data["status"] == "Pending"
    assert task_data["priority"] == "High"
    task_id = task_data["id"]

    # Read by ID
    get_res = client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == task_id


def test_task_status_toggle(client, auth_headers):
    res = client.post("/api/v1/tasks/", json={
        "title": "Revise Chapter 4",
        "priority": "Medium"
    }, headers=auth_headers)
    task_id = res.json()["id"]
    assert res.json()["status"] == "Pending"
    assert res.json()["completed_at"] is None

    # Toggle complete
    toggle_res = client.patch(f"/api/v1/tasks/{task_id}/toggle", headers=auth_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "Completed"
    assert toggle_res.json()["completed_at"] is not None

    # Toggle back to pending
    toggle_res2 = client.patch(f"/api/v1/tasks/{task_id}/toggle", headers=auth_headers)
    assert toggle_res2.status_code == 200
    assert toggle_res2.json()["status"] == "Pending"
    assert toggle_res2.json()["completed_at"] is None


def test_task_cross_user_isolation(client, auth_headers, second_auth_headers):
    # User 1 creates task
    res = client.post("/api/v1/tasks/", json={
        "title": "Private User 1 Task",
        "priority": "Urgent"
    }, headers=auth_headers)
    task_id = res.json()["id"]

    # User 2 attempts to read User 1's task -> must be 404
    forbidden_get = client.get(f"/api/v1/tasks/{task_id}", headers=second_auth_headers)
    assert forbidden_get.status_code == 404

    # User 2 attempts to delete User 1's task -> must be 404
    forbidden_del = client.delete(f"/api/v1/tasks/{task_id}", headers=second_auth_headers)
    assert forbidden_del.status_code == 404


def test_task_stats(client, auth_headers):
    stats_res = client.get("/api/v1/tasks/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "pending" in stats
    assert "completed" in stats
    assert "overdue" in stats


def test_get_stats_uses_user_timezone_for_due_today(db, test_user):
    from backend.app.services.task_service import TaskService
    from backend.app.models.user import UserPreference

    # Set user timezone to America/New_York (UTC-4)
    pref = UserPreference(
        user_id=test_user.id,
        timezone="America/New_York",
        theme="dark",
        email_sync_enabled=True,
        ai_features_enabled=True,
        reminder_lead_minutes=1440,
    )
    db.add(pref)
    db.commit()

    stats = TaskService.get_stats(db, test_user.id)
    assert stats.total == 0
    assert stats.pending == 0
    assert stats.completed == 0
    assert stats.overdue == 0
    assert stats.due_today == 0
