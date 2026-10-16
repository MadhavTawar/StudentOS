from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class DeadlineBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    event_type: str = Field(default="Assignment", max_length=64)  # "Assignment", "Examination", "Placement", "Interview", "Project", "Registration", "Other"
    due_date: datetime
    timezone: str = Field(default="UTC", max_length=64)
    status: str = Field(default="Upcoming", pattern="^(Upcoming|Due Soon|Completed|Overdue)$")
    is_ambiguous: bool = False
    original_date_text: Optional[str] = Field(None, max_length=255)
    source_type: str = Field(default="manual", pattern="^(manual|gmail|ai_proposal)$")
    source_ref: Optional[str] = Field(None, max_length=255)
    task_id: Optional[str] = None


class DeadlineCreate(DeadlineBase):
    pass


class DeadlineUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_type: Optional[str] = Field(None, max_length=64)
    due_date: Optional[datetime] = None
    timezone: Optional[str] = Field(None, max_length=64)
    status: Optional[str] = Field(None, pattern="^(Upcoming|Due Soon|Completed|Overdue)$")
    is_ambiguous: Optional[bool] = None
    original_date_text: Optional[str] = None
    task_id: Optional[str] = None


class DeadlineResponse(DeadlineBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class DeadlineDuplicateWarning(BaseModel):
    is_duplicate: bool
    existing_deadline_id: Optional[str] = None
    existing_title: Optional[str] = None
    message: Optional[str] = None
