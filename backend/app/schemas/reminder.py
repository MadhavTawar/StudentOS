from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ReminderCreate(BaseModel):
    task_id: Optional[str] = None
    deadline_id: Optional[str] = None
    remind_at: datetime
    lead_time_minutes: int = Field(default=60, ge=0)
    title: str = Field(..., min_length=1, max_length=255)
    message: Optional[str] = None


class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    task_id: Optional[str] = None
    deadline_id: Optional[str] = None
    remind_at: datetime
    lead_time_minutes: int
    status: str
    title: str
    message: Optional[str] = None
    created_at: datetime


class InAppNotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    reminder_id: Optional[str] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    dismissed: bool
    created_at: datetime


class NotificationCountResponse(BaseModel):
    unread_count: int
