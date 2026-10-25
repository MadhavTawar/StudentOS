from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import or_, and_, desc, asc
from sqlalchemy.orm import Session
from backend.app.models.deadline import Deadline
from backend.app.schemas.deadline import DeadlineCreate, DeadlineUpdate, DeadlineDuplicateWarning
from backend.app.core.security import ensure_utc


class DeadlineService:
    @staticmethod
    def get_deadline(db: Session, user_id: str, deadline_id: str) -> Deadline:
        deadline = db.query(Deadline).filter(Deadline.id == deadline_id, Deadline.user_id == user_id).first()
        if not deadline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deadline not found or access denied."
            )
        return deadline

    @staticmethod
    def check_duplicate(db: Session, user_id: str, title: str, due_date: datetime) -> DeadlineDuplicateWarning:
        """Detect potential duplicate deadlines within 24 hours with matching title."""
        start_window = due_date - timedelta(hours=24)
        end_window = due_date + timedelta(hours=24)

        existing = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.due_date >= start_window,
            Deadline.due_date <= end_window,
            Deadline.title.ilike(f"%{title.strip()}%")
        ).first()

        if existing:
            return DeadlineDuplicateWarning(
                is_duplicate=True,
                existing_deadline_id=existing.id,
                existing_title=existing.title,
                message=f"Possible duplicate: '{existing.title}' is already scheduled on {existing.due_date.strftime('%Y-%m-%d %H:%M')}."
            )
        return DeadlineDuplicateWarning(is_duplicate=False)

    @staticmethod
    def list_deadlines(
        db: Session,
        user_id: str,
        event_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        upcoming_only: bool = False,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Deadline], int]:
        now = datetime.now(timezone.utc)
        query = db.query(Deadline).filter(Deadline.user_id == user_id)

        if event_type:
            query = query.filter(Deadline.event_type == event_type)

        if upcoming_only:
            query = query.filter(Deadline.due_date >= now, Deadline.status != "Completed")

        # Fetch candidates; effective status (Overdue / Due Soon) is computed
        # below so that status_filter matches the computed value, not the
        # potentially-stale stored status column.
        deadlines = query.order_by(asc(Deadline.due_date)).all()

        effective: List[Deadline] = []
        for d in deadlines:
            due_dt = ensure_utc(d.due_date)
            if d.status != "Completed" and due_dt and due_dt < now:
                d.status = "Overdue"
            elif d.status != "Completed" and due_dt and due_dt <= (now + timedelta(hours=48)):
                d.status = "Due Soon"
            effective.append(d)

        if status_filter:
            effective = [d for d in effective if d.status == status_filter]

        total = len(effective)
        return effective[offset:offset + limit], total

    @staticmethod
    def create_deadline(db: Session, user_id: str, deadline_in: DeadlineCreate) -> Deadline:
        now = datetime.now(timezone.utc)
        status_val = deadline_in.status
        due_dt = ensure_utc(deadline_in.due_date)
        if status_val != "Completed" and due_dt:
            if due_dt < now:
                status_val = "Overdue"
            elif due_dt <= (now + timedelta(hours=48)):
                status_val = "Due Soon"
            else:
                status_val = "Upcoming"

        deadline_data = deadline_in.model_dump()
        deadline_data["status"] = status_val

        deadline = Deadline(
            user_id=user_id,
            **deadline_data
        )
        db.add(deadline)
        db.commit()
        db.refresh(deadline)
        return deadline

    @staticmethod
    def update_deadline(db: Session, user_id: str, deadline_id: str, deadline_in: DeadlineUpdate) -> Deadline:
        deadline = DeadlineService.get_deadline(db, user_id, deadline_id)
        update_data = deadline_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(deadline, field, value)

        now = datetime.now(timezone.utc)
        due_dt = ensure_utc(deadline.due_date)
        if deadline.status != "Completed" and due_dt:
            if due_dt < now:
                deadline.status = "Overdue"
            elif due_dt <= (now + timedelta(hours=48)):
                deadline.status = "Due Soon"

        deadline.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(deadline)
        return deadline

    @staticmethod
    def delete_deadline(db: Session, user_id: str, deadline_id: str):
        deadline = DeadlineService.get_deadline(db, user_id, deadline_id)
        db.delete(deadline)
        db.commit()
