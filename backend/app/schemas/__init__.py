from backend.app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse, UserPreferenceSchema
from backend.app.schemas.user_preference import UserPreferenceUpdate, UserPreferenceResponse
from backend.app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskStats
from backend.app.schemas.deadline import DeadlineCreate, DeadlineUpdate, DeadlineResponse, DeadlineDuplicateWarning
from backend.app.schemas.gmail import GmailAuthUrlResponse, GmailCallbackRequest, GmailStatusResponse, EmailMessageSummary, EmailListResponse
from backend.app.schemas.ai import (
    EmailExtractionRequest,
    ExtractedTaskCandidate,
    ExtractedDeadlineCandidate,
    EmailExtractionResponse,
    AICandidateResponse,
    AICandidateReviewRequest,
    AIAssistantMessageRequest,
    AIAssistantResponse
)
from backend.app.schemas.reminder import (
    ReminderCreate,
    ReminderResponse,
    InAppNotificationResponse,
    NotificationCountResponse
)

__all__ = [
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "UserPreferenceSchema",
    "UserPreferenceUpdate",
    "UserPreferenceResponse",
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskStats",
    "DeadlineCreate",
    "DeadlineUpdate",
    "DeadlineResponse",
    "DeadlineDuplicateWarning",
    "GmailAuthUrlResponse",
    "GmailCallbackRequest",
    "GmailStatusResponse",
    "EmailMessageSummary",
    "EmailListResponse",
    "EmailExtractionRequest",
    "ExtractedTaskCandidate",
    "ExtractedDeadlineCandidate",
    "EmailExtractionResponse",
    "AICandidateResponse",
    "AICandidateReviewRequest",
    "AIAssistantMessageRequest",
    "AIAssistantResponse",
    "ReminderCreate",
    "ReminderResponse",
    "InAppNotificationResponse",
    "NotificationCountResponse",
]
