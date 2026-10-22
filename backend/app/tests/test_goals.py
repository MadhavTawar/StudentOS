from datetime import datetime, timezone, timedelta


def test_goal_milestones_link_to_tasks_and_progress_updates(client, auth_headers):
    goal = client.post("/api/v1/goals/", json={
        "title": "Prepare for placements",
        "category": "Placement Preparation",
        "target_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "weekly_minutes": 300,
    }, headers=auth_headers)
    assert goal.status_code == 201
    goal_id = goal.json()["id"]

    milestone = client.post(f"/api/v1/goals/{goal_id}/milestones", json={
        "title": "Finish two mock interviews",
        "create_task": True,
    }, headers=auth_headers)
    assert milestone.status_code == 201
    milestone_id = milestone.json()["id"]
    task_id = milestone.json()["task_id"]
    assert task_id

    listed = client.get("/api/v1/goals/", headers=auth_headers).json()[0]
    assert listed["progress_percent"] == 0
    assert listed["total_milestones"] == 1

    completed = client.patch(f"/api/v1/goals/milestones/{milestone_id}", json={
        "status": "Completed",
    }, headers=auth_headers)
    assert completed.status_code == 200
    assert completed.json()["task_completed"] is True

    listed_after = client.get("/api/v1/goals/", headers=auth_headers).json()[0]
    assert listed_after["progress_percent"] == 100


def test_goals_are_user_scoped(client, auth_headers, second_auth_headers):
    goal = client.post("/api/v1/goals/", json={"title": "Private goal"}, headers=auth_headers)
    goal_id = goal.json()["id"]
    assert client.get("/api/v1/goals/", headers=second_auth_headers).json() == []
    assert client.put(f"/api/v1/goals/{goal_id}", json={"title": "Changed"}, headers=second_auth_headers).status_code == 404
