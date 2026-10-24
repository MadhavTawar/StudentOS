from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.task import Task
from backend.app.models.deadline import Deadline
from backend.app.models.ai_candidate import AIExtractionCandidate
from backend.app.models.reminder import InAppNotification
from backend.app.schemas.task import TaskResponse, TaskStats
from backend.app.schemas.deadline import DeadlineResponse
from backend.app.schemas.ai import AICandidateResponse
from backend.app.schemas.gmail import EmailMessageSummary
from backend.app.services.task_service import TaskService
from backend.app.services.deadline_service import DeadlineService
from backend.app.services.gmail_service import GmailService
from backend.app.core.security import ensure_utc

router = APIRouter()


@router.get("/overview")
def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Consolidated dashboard API endpoint backed by real database records.
    Never returns hardcoded mockup statistics.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Real task statistics
    task_stats = TaskService.get_stats(db, user_id=current_user.id)
    
    # 2. Upcoming deadlines (next 7 days, up to 5)
    upcoming_deadlines, _ = DeadlineService.list_deadlines(
        db,
        user_id=current_user.id,
        upcoming_only=True,
        limit=100
    )
    upcoming_deadlines = [
        deadline for deadline in upcoming_deadlines
        if deadline.due_date and ensure_utc(deadline.due_date) <= now + timedelta(days=7)
    ][:5]

    # Next big date: the soonest deadline beyond 7 days (for far-future exams)
    next_big_date = None
    all_upcoming, _ = DeadlineService.list_deadlines(
        db,
        user_id=current_user.id,
        upcoming_only=True,
        limit=100
    )
    far = [d for d in all_upcoming if d.due_date and ensure_utc(d.due_date) > now + timedelta(days=7)]
    if far:
        next_big_date = min(far, key=lambda d: ensure_utc(d.due_date))

    # 3. Pending/Active tasks
    pending_tasks, _ = TaskService.list_tasks(
        db,
        user_id=current_user.id,
        status_filter="Active",
        limit=5
    )

    daily_priorities = TaskService.get_daily_priorities(
        db,
        user_id=current_user.id,
        user_timezone=current_user.preference.timezone if current_user.preference else "UTC",
    )

    # 4. Overdue tasks
    overdue_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status.in_(["Pending", "In Progress"]),
        Task.due_date < now
    ).order_by(Task.due_date.asc()).limit(5).all()

    # 5. Recent email activity
    recent_emails, email_total = GmailService.list_messages(
        db,
        user_id=current_user.id,
        page=1,
        limit=5
    )

    # 6. Pending AI candidate proposals
    pending_candidates = db.query(AIExtractionCandidate).filter(
        AIExtractionCandidate.user_id == current_user.id,
        AIExtractionCandidate.validation_status == "pending_review"
    ).order_by(AIExtractionCandidate.created_at.desc()).limit(5).all()

    # 7. Unread notifications count
    unread_notif_count = db.query(InAppNotification).filter(
        InAppNotification.user_id == current_user.id,
        InAppNotification.is_read == False,
        InAppNotification.dismissed == False
    ).count()

    # 8. Integration connection status
    gmail_status = GmailService.get_status(db, user_id=current_user.id)

    return {
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
        },
        "stats": task_stats.model_dump(),
        "upcoming_deadlines": [DeadlineResponse.model_validate(d).model_dump() for d in upcoming_deadlines],
        "next_big_date": DeadlineResponse.model_validate(next_big_date).model_dump() if next_big_date else None,
        "pending_tasks": [TaskResponse.model_validate(t).model_dump() for t in pending_tasks],
        "daily_priorities": [
            {"task": TaskResponse.model_validate(task).model_dump(), "reason": reason}
            for task, reason in daily_priorities
        ],
        "overdue_tasks": [TaskResponse.model_validate(t).model_dump() for t in overdue_tasks],
        "recent_emails": [EmailMessageSummary.model_validate(e).model_dump() for e in recent_emails],
        "ai_proposals": [AICandidateResponse.model_validate(c).model_dump() for c in pending_candidates],
        "unread_notifications_count": unread_notif_count,
        "gmail_connected": gmail_status["is_connected"],
        "gmail_email": gmail_status["email_address"],
    }
