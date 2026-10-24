"""Shared due-items layer: unified view over Task and Deadline rows."""
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.app.models.task import Task
from backend.app.models.deadline import Deadline


@dataclass
class DueItem:
    id: str
    user_id: str
    title: str
    due_date: Optional[datetime]
    timezone: str
    status: str
    kind: str  # "task" or "deadline"
    source_type: Optional[str]
    source_ref: Optional[str]
    linked_task_id: Optional[str]  # for deadlines linked to a task
    linked_deadline_id: Optional[str]  # for tasks linked to a deadline
    estimated_duration: Optional[int]
    priority: Optional[str]
    event_type: Optional[str] = None


def _task_to_due_item(t: Task) -> DueItem:
    return DueItem(
        id=t.id,
        user_id=t.user_id,
        title=t.title,
        due_date=t.due_date,
        timezone=getattr(t, "timezone", "UTC") or "UTC",
        status=t.status,
        kind="task",
        source_type=getattr(t, "source_type", None),
        source_ref=getattr(t, "source_ref", None),
        linked_task_id=None,
        linked_deadline_id=None,
        estimated_duration=getattr(t, "estimated_duration", None),
        priority=getattr(t, "priority", None),
    )


def _deadline_to_due_item(d: Deadline) -> DueItem:
    return DueItem(
        id=d.id,
        user_id=d.user_id,
        title=d.title,
        due_date=d.due_date,
        timezone=getattr(d, "timezone", "UTC") or "UTC",
        status=d.status,
        kind="deadline",
        source_type=getattr(d, "source_type", None),
        source_ref=getattr(d, "source_ref", None),
        linked_task_id=getattr(d, "task_id", None),
        linked_deadline_id=None,
        estimated_duration=None,
        priority="High",
        event_type=getattr(d, "event_type", None),
    )


def get_due_items(
    db: Session,
    user_id: str,
    *,
    include_completed: bool = False,
    kind: Optional[str] = None,
) -> List[DueItem]:
    """Return a unified list of due items for a user, sorted by due_date."""
    items: List[DueItem] = []

    if kind in (None, "task"):
        q = db.query(Task).filter(Task.user_id == user_id)
        if not include_completed:
            q = q.filter(Task.status.notin_(["Completed", "Cancelled"]))
        for t in q.all():
            items.append(_task_to_due_item(t))

    if kind in (None, "deadline"):
        q = db.query(Deadline).filter(Deadline.user_id == user_id)
        if not include_completed:
            q = q.filter(Deadline.status.notin_(["Completed", "Cancelled"]))
        for d in q.all():
            items.append(_deadline_to_due_item(d))

    items.sort(key=lambda x: (x.due_date is None, x.due_date or datetime.max.replace(tzinfo=timezone.utc)))
    return items


def _normalize_title(title: str) -> str:
    return " ".join(title.lower().split())


def find_duplicate_task(db: Session, user_id: str, title: str, due_date: Optional[datetime]) -> Optional[Task]:
    """Find a task with similar normalised title and same due day."""
    norm = _normalize_title(title)
    candidates = db.query(Task).filter(Task.user_id == user_id).all()
    for t in candidates:
        if _normalize_title(t.title) == norm:
            if due_date and t.due_date:
                if t.due_date.date() == due_date.date():
                    return t
            elif due_date is None and t.due_date is None:
                return t
    # fuzzy similarity
    for t in candidates:
        ratio = SequenceMatcher(None, norm, _normalize_title(t.title)).ratio()
        if ratio >= 0.85:
            if due_date and t.due_date and t.due_date.date() == due_date.date():
                return t
            if due_date is None and t.due_date is None:
                return t
    return None


def find_duplicate_deadline(db: Session, user_id: str, title: str, due_date: Optional[datetime]) -> Optional[Deadline]:
    """Find a deadline with similar normalised title and same due day."""
    norm = _normalize_title(title)
    candidates = db.query(Deadline).filter(Deadline.user_id == user_id).all()
    for d in candidates:
        if _normalize_title(d.title) == norm:
            if due_date and d.due_date:
                if d.due_date.date() == due_date.date():
                    return d
            elif due_date is None and d.due_date is None:
                return d
    for d in candidates:
        ratio = SequenceMatcher(None, norm, _normalize_title(d.title)).ratio()
        if ratio >= 0.85:
            if due_date and d.due_date and d.due_date.date() == due_date.date():
                return d
            if due_date is None and d.due_date is None:
                return d
    return None
