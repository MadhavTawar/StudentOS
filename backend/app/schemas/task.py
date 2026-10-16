from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    category: str = Field(default="General", max_length=64)
    priority: str = Field(default="Medium", pattern="^(Low|Medium|High|Urgent)$")
    status: str = Field(default="Pending", pattern="^(Pending|In Progress|Completed|Cancelled)$")
    due_date: Optional[datetime] = None
    timezone: str = Field(default="UTC", max_length=64)
    estimated_duration: Optional[int] = Field(None, ge=1, le=10000)  # minutes
    source_type: str = Field(default="manual", pattern="^(manual|gmail|ai_proposal)$")
    source_ref: Optional[str] = Field(None, max_length=255)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=64)
    priority: Optional[str] = Field(None, pattern="^(Low|Medium|High|Urgent)$")
    status: Optional[str] = Field(None, pattern="^(Pending|In Progress|Completed|Cancelled)$")
    due_date: Optional[datetime] = None
    timezone: Optional[str] = Field(None, max_length=64)
    estimated_duration: Optional[int] = Field(None, ge=1, le=10000)


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class TaskStats(BaseModel):
    total: int
    pending: int
    in_progress: int
    completed: int
    overdue: int
    due_today: int
