"""
Read-only tools for the StudentOS AI assistant.

All tools are read-only: they query existing services and never create,
update, or delete records. They run under the acting user's identity and
respect workspace isolation.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from backend.app.models.goal import Goal, GoalMilestone
from backend.app.models.workspace import WorkspaceMembership
from backend.app.services.due_items import get_due_items
from backend.app.services.knowledge_vector_store import KnowledgeVectorStore


def _validate_workspace(db: Session, user_id: str, workspace_id: str) -> None:
    """Ensure the requested workspace belongs to the acting user."""
    membership = (
        db.query(WorkspaceMembership)
        .filter_by(workspace_id=workspace_id, user_id=user_id)
        .first()
    )
    if membership is None:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace not found or access denied.",
        )


def list_tasks(db: Session, user_id: str, workspace_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Return pending tasks for a user in a workspace.

    Tasks are owned by users (not workspaces), so results are filtered by
    ``user_id``. The ``workspace_id`` is validated for access control.
    """
    _validate_workspace(db, user_id, workspace_id)
    items = get_due_items(db, user_id, include_completed=False, kind="task")
    return [
        {
            "id": item.id,
            "title": item.title,
            "due_date": item.due_date.isoformat() if item.due_date else None,
            "priority": item.priority,
            "estimated_duration": item.estimated_duration,
        }
        for item in items[:limit]
    ]


def list_upcoming_deadlines(db: Session, user_id: str, workspace_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Return upcoming deadlines for a user in a workspace.

    Deadlines are owned by users (not workspaces), so results are filtered by
    ``user_id``. The ``workspace_id`` is validated for access control.
    """
    _validate_workspace(db, user_id, workspace_id)
    items = get_due_items(db, user_id, include_completed=False, kind="deadline")
    return [
        {
            "id": item.id,
            "title": item.title,
            "due_date": item.due_date.isoformat() if item.due_date else None,
            "status": item.status,
            "event_type": item.event_type,
        }
        for item in items[:limit]
    ]


def goal_progress(db: Session, user_id: str, workspace_id: str) -> List[Dict[str, Any]]:
    """Return goal progress for a user.

    Goals are user-owned, so workspace access is validated for consistency
    while the goals themselves are filtered by the acting user.
    """
    _validate_workspace(db, user_id, workspace_id)
    goals = (
        db.query(Goal)
        .options(joinedload(Goal.milestones).joinedload(GoalMilestone.task))
        .filter(Goal.user_id == user_id)
        .order_by(Goal.target_date.asc(), Goal.created_at.asc())
        .all()
    )

    progress: List[Dict[str, Any]] = []
    for goal in goals:
        milestones = []
        completed_count = 0
        for milestone in goal.milestones:
            completed = milestone.status == "Completed" or (
                milestone.task is not None and milestone.task.status == "Completed"
            )
            completed_count += int(completed)
            milestones.append({
                "id": milestone.id,
                "title": milestone.title,
                "target_date": milestone.target_date.isoformat() if milestone.target_date else None,
                "status": "Completed" if completed else milestone.status,
                "task_id": milestone.task_id,
            })

        total_count = len(milestones)
        progress.append({
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "category": goal.category,
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "status": goal.status,
            "weekly_minutes": goal.weekly_minutes,
            "progress_percent": round(completed_count * 100 / total_count) if total_count else 0,
            "completed_milestones": completed_count,
            "total_milestones": total_count,
            "milestones": milestones,
        })
    return progress


def search_authorized_documents(db: Session, user_id: str, workspace_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search authorized workspace documents via the vector store.

    Returns citation-ready chunks with document metadata. Workspace access is
    validated and the vector store enforces workspace-level isolation.
    """
    _validate_workspace(db, user_id, workspace_id)
    vector_store = KnowledgeVectorStore()
    results = vector_store.search(
        query=query,
        workspace_id=workspace_id,
        limit=limit,
    )
    return [
        {
            "id": result.get("id"),
            "document_id": result.get("metadata", {}).get("document_id"),
            "version_id": result.get("metadata", {}).get("version_id"),
            "document_title": result.get("metadata", {}).get("document_title", ""),
            "version_number": result.get("metadata", {}).get("version_number"),
            "page_start": result.get("metadata", {}).get("page_start"),
            "page_end": result.get("metadata", {}).get("page_end"),
            "excerpt": result.get("content", ""),
            "distance": result.get("distance"),
        }
        for result in results
    ]


def available_study_time(db: Session, user_id: str, workspace_id: str, date: str) -> Dict[str, Any]:
    """Return available study time for a user on a given date.

    Computes available minutes from the user's existing tasks and deadlines
    on the target date, subtracting estimated durations from a default daily
    budget of 4 hours (240 minutes).
    """
    _validate_workspace(db, user_id, workspace_id)

    from datetime import datetime, timezone, date as date_cls

    try:
        target = date_cls.fromisoformat(date)
    except ValueError:
        target = datetime.now(timezone.utc).date()

    default_minutes = 240  # 4 hours default daily budget

    items = get_due_items(db, user_id, include_completed=False)
    scheduled_minutes = 0
    for item in items:
        if item.due_date is None:
            continue
        due = item.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if due.date() == target:
            scheduled_minutes += item.estimated_duration or 60

    available = max(0, default_minutes - scheduled_minutes)
    return {
        "date": date,
        "available_minutes": available,
        "scheduled_minutes": scheduled_minutes,
        "budget_minutes": default_minutes,
        "note": "Available study time = default budget (240 min) minus estimated duration of tasks due today.",
    }


__all__ = [
    "list_upcoming_deadlines",
    "list_tasks",
    "goal_progress",
    "search_authorized_documents",
    "available_study_time",
]
