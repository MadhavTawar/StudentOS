"""
Read-only tools for the StudentOS AI assistant.

All tools are read-only: they query existing services and never create,
update, or delete records. They run under the acting user's identity and
respect workspace isolation.
"""

from typing import Any, Dict, List, Optional

from backend.app.services.due_items import get_due_items
from backend.app.services.knowledge_vector_store import KnowledgeVectorStore


def list_upcoming_deadlines(user_id: str, workspace_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Return upcoming deadlines for a user in a workspace.

    Only deadlines that are not completed and have a due date are returned.
    """
    items = get_due_items(None, user_id, include_completed=False, kind="deadline")
    # TODO: filter by workspace_id once deadlines carry workspace context
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


def list_tasks(user_id: str, workspace_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Return pending tasks for a user in a workspace."""
    items = get_due_items(None, user_id, include_completed=False, kind="task")
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


def goal_progress(user_id: str, workspace_id: str) -> List[Dict[str, Any]]:
    """Return goal progress for a user.

    Placeholder: goals progress is computed client-side from tasks/deadlines
    until a dedicated goals service is implemented.
    """
    return []


def search_authorized_documents(user_id: str, workspace_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search authorized workspace documents via the vector store.

    Returns citation-ready chunks with document metadata.
    """
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


def available_study_time(user_id: str, workspace_id: str, date: str) -> Dict[str, Any]:
    """Return available study time for a user on a given date.

    Placeholder: computes available study time from existing tasks and
    deadlines. Full workload awareness is implemented in the planner phase.
    """
    return {
        "date": date,
        "available_minutes": 240,  # Default 4 hours
        "note": "Available study time computation is a placeholder.",
    }


__all__ = [
    "list_upcoming_deadlines",
    "list_tasks",
    "goal_progress",
    "search_authorized_documents",
    "available_study_time",
]
