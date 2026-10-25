"""
StudentOS AI package.

Provides the LangChain-based model layer and retrieval tools for the AI
assistant and RAG features.

All model calls go through the backend. No secrets or privileged operations
are exposed to the browser.
"""

from backend.app.ai.model_factory import get_chat_model, BaseChatModel
from backend.app.ai.retriever import KnowledgeRetriever
from backend.app.ai.tools import (
    list_upcoming_deadlines,
    list_tasks,
    goal_progress,
    search_authorized_documents,
    available_study_time,
)

__all__ = [
    "get_chat_model",
    "BaseChatModel",
    "KnowledgeRetriever",
    "list_upcoming_deadlines",
    "list_tasks",
    "goal_progress",
    "search_authorized_documents",
    "available_study_time",
]
