from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.goal import Goal, GoalMilestone
from backend.app.models.task import Task
from backend.app.schemas.goal import GoalCreate, GoalUpdate, MilestoneCreate, MilestoneUpdate


class GoalService:
    @staticmethod
    def get_goal(db: Session, user_id: str, goal_id: str) -> Goal:
        goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found or access denied.")
        return goal

    @staticmethod
    def create_goal(db: Session, user_id: str, data: GoalCreate) -> Goal:
        goal = Goal(user_id=user_id, **data.model_dump())
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def update_goal(db: Session, user_id: str, goal_id: str, data: GoalUpdate) -> Goal:
        goal = GoalService.get_goal(db, user_id, goal_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(goal, field, value)
        goal.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def delete_goal(db: Session, user_id: str, goal_id: str) -> None:
        goal = GoalService.get_goal(db, user_id, goal_id)
        db.delete(goal)
        db.commit()

    @staticmethod
    def add_milestone(db: Session, user_id: str, goal_id: str, data: MilestoneCreate) -> GoalMilestone:
        goal = GoalService.get_goal(db, user_id, goal_id)
        milestone = GoalMilestone(goal_id=goal.id, title=data.title, target_date=data.target_date)
        db.add(milestone)
        db.flush()
        if data.create_task:
            task = Task(
                user_id=user_id,
                title=data.title,
                category=goal.category,
                priority="Medium",
                due_date=data.target_date,
                source_type="manual",
            )
            db.add(task)
            db.flush()
            milestone.task_id = task.id
        db.commit()
        db.refresh(milestone)
        return milestone

    @staticmethod
    def update_milestone(db: Session, user_id: str, milestone_id: str, data: MilestoneUpdate) -> GoalMilestone:
        milestone = (
            db.query(GoalMilestone).join(Goal).filter(
                GoalMilestone.id == milestone_id, Goal.user_id == user_id
            ).first()
        )
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found or access denied.")
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(milestone, field, value)
        if milestone.task and "status" in updates:
            milestone.task.status = "Completed" if updates["status"] == "Completed" else "Pending"
        milestone.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(milestone)
        return milestone

    @staticmethod
    def delete_milestone(db: Session, user_id: str, milestone_id: str) -> None:
        milestone = (
            db.query(GoalMilestone).join(Goal).filter(
                GoalMilestone.id == milestone_id, Goal.user_id == user_id
            ).first()
        )
        if not milestone:
            raise HTTPException(status_code=404, detail="Milestone not found or access denied.")
        db.delete(milestone)
        db.commit()
