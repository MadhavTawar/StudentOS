from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


class EmailExtractionRequest(BaseModel):
    message_id: str = Field(..., min_length=1, max_length=128)
    subject: str = Field(..., min_length=1, max_length=500)
    snippet: str = Field(..., max_length=5000)
    sender: str = Field(..., min_length=1, max_length=255)
    email_date: Optional[datetime] = None
    timezone: Optional[str] = None


class ExtractedTaskCandidate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    category: str = "Assignment"
    priority: str = "Medium"
    due_date: Optional[datetime] = None
    supporting_evidence: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class ExtractedDeadlineCandidate(BaseModel):
    title: str = Field(..., min_length=1)
    event_type: str = "Assignment"
    due_date: Optional[datetime] = None
    is_ambiguous: bool = False
    original_date_text: Optional[str] = None
    supporting_evidence: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class EmailExtractionResponse(BaseModel):
    message_id: str
    summary: str
    tasks: List[ExtractedTaskCandidate] = Field(default_factory=list)
    deadlines: List[ExtractedDeadlineCandidate] = Field(default_factory=list)
    confidence_overall: float
    provider_used: str
    is_fallback: bool


class AICandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_email_id: str
    email_subject: str
    email_sender: str
    candidate_type: str
    title: str
    description: Optional[str] = None
    suggested_due_date: Optional[datetime] = None
    is_ambiguous: bool = False
    original_date_text: Optional[str] = None
    category: str
    priority: str
    supporting_evidence: str
    confidence_score: float
    validation_status: str
    created_task_id: Optional[str] = None
    created_deadline_id: Optional[str] = None
    created_at: datetime


class AICandidateReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|modify)$")
    # In case user edits before approving
    modified_title: Optional[str] = Field(None, min_length=1, max_length=255)
    modified_due_date: Optional[datetime] = None
    modified_is_ambiguous: Optional[bool] = None
    modified_original_date_text: Optional[str] = Field(None, max_length=255)
    modified_priority: Optional[str] = Field(None, pattern="^(Low|Medium|High|Urgent)$")
    modified_category: Optional[str] = Field(None, max_length=64)


class AIAssistantMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class AIAssistantResponse(BaseModel):
    reply: str
    context_summary: Optional[Dict[str, Any]] = None
    provider: str
