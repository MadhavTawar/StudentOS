from backend.app.db.session import Base
from backend.app.models.user import User, UserPreference, UserSession
from backend.app.models.task import Task
from backend.app.models.deadline import Deadline
from backend.app.models.integration import OAuthIntegration, OAuthState, EmailMetadataCache
from backend.app.models.reminder import Reminder, InAppNotification
from backend.app.models.ai_candidate import AIExtractionCandidate
from backend.app.models.knowledge import (
    KnowledgeAuditEvent,
    KnowledgeDocument,
    KnowledgeDocumentChunk,
    KnowledgeDocumentVersion,
    UserRole,
)

__all__ = [
    "Base",
    "User",
    "UserPreference",
    "UserSession",
    "Task",
    "Deadline",
    "OAuthIntegration",
    "OAuthState",
    "EmailMetadataCache",
    "Reminder",
    "InAppNotification",
    "AIExtractionCandidate",
    "UserRole",
    "KnowledgeDocument",
    "KnowledgeDocumentVersion",
    "KnowledgeDocumentChunk",
    "KnowledgeAuditEvent",
]
