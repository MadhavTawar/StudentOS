from datetime import datetime, timezone, timedelta


def test_dashboard_prioritizes_urgent_and_limits_deadlines_to_next_week(client, auth_headers):
    now = datetime.now(timezone.utc)
    task_res = client.post("/api/v1/tasks/", json={
        "title": "Urgent placement application",
        "priority": "Urgent",
        "due_date": (now + timedelta(days=5)).isoformat(),
    }, headers=auth_headers)
    assert task_res.status_code == 201

    client.post("/api/v1/tasks/", json={
        "title": "Low priority reading",
        "priority": "Low",
        "due_date": (now + timedelta(days=1)).isoformat(),
    }, headers=auth_headers)
    client.post("/api/v1/deadlines/", json={
        "title": "Next week assignment",
        "event_type": "Assignment",
        "due_date": (now + timedelta(days=6)).isoformat(),
    }, headers=auth_headers)
    client.post("/api/v1/deadlines/", json={
        "title": "Far future assignment",
        "event_type": "Assignment",
        "due_date": (now + timedelta(days=8)).isoformat(),
    }, headers=auth_headers)

    response = client.get("/api/v1/dashboard/overview", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["daily_priorities"][0]["task"]["title"] == "Urgent placement application"
    assert "urgent priority" in data["daily_priorities"][0]["reason"]
    assert [d["title"] for d in data["upcoming_deadlines"]] == ["Next week assignment"]
