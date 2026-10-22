from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.goal import Goal, GoalMilestone
from backend.app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, MilestoneCreate, MilestoneUpdate, MilestoneResponse
from backend.app.services.goal_service import GoalService

router = APIRouter()


def serialize_milestone(milestone: GoalMilestone) -> MilestoneResponse:
    return MilestoneResponse(
        **{field: getattr(milestone, field) for field in ("id", "goal_id", "title", "target_date", "status", "task_id", "created_at", "updated_at")},
        task_completed=bool(milestone.task and milestone.task.status == "Completed"),
    )


def serialize_goal(goal: Goal) -> GoalResponse:
    milestones = [serialize_milestone(item) for item in goal.milestones]
    completed = sum(1 for item in milestones if item.status == "Completed" or item.task_completed)
    total = len(milestones)
    return GoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        description=goal.description,
        category=goal.category,
        target_date=goal.target_date,
        weekly_minutes=goal.weekly_minutes,
        status=goal.status,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        milestones=milestones,
        progress_percent=round(completed * 100 / total) if total else 0,
        completed_milestones=completed,
        total_milestones=total,
    )


@router.get("/", response_model=List[GoalResponse])
def list_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [serialize_goal(goal) for goal in db.query(Goal).filter(Goal.user_id == current_user.id).order_by(Goal.target_date.asc()).all()]


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(data: GoalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_goal(GoalService.create_goal(db, current_user.id, data))


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: str, data: GoalUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_goal(GoalService.update_goal(db, current_user.id, goal_id, data))


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    GoalService.delete_goal(db, current_user.id, goal_id)


@router.post("/{goal_id}/milestones", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def add_milestone(goal_id: str, data: MilestoneCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_milestone(GoalService.add_milestone(db, current_user.id, goal_id, data))


@router.patch("/milestones/{milestone_id}", response_model=MilestoneResponse)
def update_milestone(milestone_id: str, data: MilestoneUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_milestone(GoalService.update_milestone(db, current_user.id, milestone_id, data))


@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(milestone_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    GoalService.delete_milestone(db, current_user.id, milestone_id)
