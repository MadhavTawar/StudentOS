from datetime import datetime, timezone, timedelta

from backend.app.ai.tools import goal_progress
from backend.app.models.goal import Goal, GoalMilestone
from backend.app.models.workspace import WorkspaceMembership


def test_goal_progress_returns_user_goal_milestone_progress(db, test_user):
    membership = db.query(WorkspaceMembership).filter_by(user_id=test_user.id).first()
    goal = Goal(
        user_id=test_user.id,
        title="Prepare for placements",
        target_date=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(goal)
    db.flush()
    db.add_all([
        GoalMilestone(goal_id=goal.id, title="Complete mock interview", status="Completed"),
        GoalMilestone(goal_id=goal.id, title="Review resume", status="Pending"),
    ])
    db.commit()

    result = goal_progress(db, test_user.id, membership.workspace_id)

    assert len(result) == 1
    assert result[0]["title"] == "Prepare for placements"
    assert result[0]["progress_percent"] == 50
    assert result[0]["completed_milestones"] == 1
    assert result[0]["total_milestones"] == 2
    assert [item["status"] for item in result[0]["milestones"]] == ["Completed", "Pending"]
