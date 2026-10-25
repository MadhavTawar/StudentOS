from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import HTTPException, status
from sqlalchemy import or_, and_, desc, asc
from sqlalchemy.orm import Session
from backend.app.models.task import Task
from backend.app.schemas.task import TaskCreate, TaskUpdate, TaskStats
from backend.app.core.security import ensure_utc


class TaskService:
    @staticmethod
    def get_daily_priorities(
        db: Session,
        user_id: str,
        user_timezone: str = "UTC",
        limit: int = 5,
    ) -> List[Tuple[Task, str]]:
        """Return active tasks ordered by transparent, deterministic urgency signals."""
        try:
            local_zone = ZoneInfo(user_timezone or "UTC")
        except ZoneInfoNotFoundError:
            local_zone = timezone.utc

        now = datetime.now(timezone.utc)
        local_now = now.astimezone(local_zone)
        local_today = local_now.date()
        priority_weight = {"Urgent": 40, "High": 30, "Medium": 20, "Low": 10}
        active_tasks = (
            db.query(Task)
            .filter(Task.user_id == user_id, Task.status.in_(["Pending", "In Progress"]))
            .all()
        )

        ranked = []
        for task in active_tasks:
            due = ensure_utc(task.due_date) if task.due_date else None
            local_due = due.astimezone(local_zone) if due else None
            is_overdue = bool(due and due < now)
            is_today = bool(local_due and local_due.date() == local_today and not is_overdue)
            due_soon = bool(due and not is_overdue and due <= now + timedelta(days=2))

            score = priority_weight.get(task.priority, 2)
            reason_parts = []
            if is_overdue:
                score += 100
                reason_parts.append("overdue")
            elif is_today:
                score += 50
                reason_parts.append("due today")
            elif due_soon:
                score += 25
                reason_parts.append("due within 48 hours")
            if task.priority in {"Urgent", "High"}:
                reason_parts.append(f"{task.priority.lower()} priority")
            if not reason_parts:
                reason_parts.append("highest remaining priority")

            ranked.append((score, due or datetime.max.replace(tzinfo=timezone.utc), task.created_at, task, ", ".join(reason_parts)))

        ranked.sort(key=lambda item: (-item[0], item[1], item[2]))
        return [(item[3], item[4]) for item in ranked[:limit]]

    @staticmethod
    def get_task(db: Session, user_id: str, task_id: str) -> Task:
        """Fetch task ensuring strict ownership validation."""
        task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or access denied."
            )
        return task

    @staticmethod
    def list_tasks(
        db: Session,
        user_id: str,
        status_filter: Optional[str] = None,
        priority_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        sort_by: str = "due_date",
        sort_order: str = "asc",
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Task], int]:
        query = db.query(Task).filter(Task.user_id == user_id)

        if status_filter:
            if status_filter == "Active":
                query = query.filter(Task.status.in_(["Pending", "In Progress"]))
            else:
                query = query.filter(Task.status == status_filter)

        if priority_filter:
            query = query.filter(Task.priority == priority_filter)

        if category_filter:
            query = query.filter(Task.category == category_filter)

        if search_query:
            term = f"%{search_query.strip()}%"
            query = query.filter(
                or_(Task.title.ilike(term), Task.description.ilike(term))
            )

        total = query.count()

        # Sorting
        sort_col = getattr(Task, sort_by, Task.due_date)
        if sort_order == "desc":
            query = query.order_by(desc(sort_col).nullslast())
        else:
            query = query.order_by(asc(sort_col).nullslast())

        tasks = query.offset(offset).limit(limit).all()
        return tasks, total

    @staticmethod
    def create_task(db: Session, user_id: str, task_in: TaskCreate) -> Task:
        task_data = task_in.model_dump()
        completed_at = datetime.now(timezone.utc) if task_data.get("status") == "Completed" else None
        
        task = Task(
            user_id=user_id,
            completed_at=completed_at,
            **task_data
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def update_task(db: Session, user_id: str, task_id: str, task_in: TaskUpdate) -> Task:
        task = TaskService.get_task(db, user_id, task_id)
        update_data = task_in.model_dump(exclude_unset=True)

        if "status" in update_data:
            new_status = update_data["status"]
            if new_status == "Completed" and task.status != "Completed":
                task.completed_at = datetime.now(timezone.utc)
            elif new_status != "Completed" and task.status == "Completed":
                task.completed_at = None

        for field, value in update_data.items():
            setattr(task, field, value)

        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def toggle_complete(db: Session, user_id: str, task_id: str) -> Task:
        task = TaskService.get_task(db, user_id, task_id)
        if task.status == "Completed":
            task.status = "Pending"
            task.completed_at = None
        else:
            task.status = "Completed"
            task.completed_at = datetime.now(timezone.utc)

        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def delete_task(db: Session, user_id: str, task_id: str):
        task = TaskService.get_task(db, user_id, task_id)
        db.delete(task)
        db.commit()

    @staticmethod
    def get_stats(db: Session, user_id: str) -> TaskStats:
        now = datetime.now(timezone.utc)

        # Resolve the user's timezone so "today" is evaluated in local time.
        from backend.app.models.user import UserPreference
        pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        user_tz = pref.timezone if pref and pref.timezone else "UTC"
        try:
            local_zone = ZoneInfo(user_tz)
        except ZoneInfoNotFoundError:
            local_zone = timezone.utc

        local_now = now.astimezone(local_zone)
        local_today = local_now.date()

        tasks = db.query(Task).filter(Task.user_id == user_id).all()
        total = len(tasks)
        pending = sum(1 for t in tasks if t.status == "Pending")
        in_progress = sum(1 for t in tasks if t.status == "In Progress")
        completed = sum(1 for t in tasks if t.status == "Completed")

        overdue = sum(
            1 for t in tasks
            if t.status in ["Pending", "In Progress"] and t.due_date and ensure_utc(t.due_date) < now
        )

        due_today = sum(
            1 for t in tasks
            if t.status in ["Pending", "In Progress"] and t.due_date
            and ensure_utc(t.due_date).astimezone(local_zone).date() == local_today
        )

        return TaskStats(
            total=total,
            pending=pending,
            in_progress=in_progress,
            completed=completed,
            overdue=overdue,
            due_today=due_today
        )
