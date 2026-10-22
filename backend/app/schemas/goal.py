from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    category: str = Field(default="Personal", max_length=64)
    target_date: Optional[datetime] = None
    weekly_minutes: Optional[int] = Field(None, ge=1, le=10080)


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    category: Optional[str] = Field(None, max_length=64)
    target_date: Optional[datetime] = None
    weekly_minutes: Optional[int] = Field(None, ge=1, le=10080)
    status: Optional[str] = Field(None, pattern="^(Active|Completed|Paused|Cancelled)$")


class MilestoneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    target_date: Optional[datetime] = None
    create_task: bool = True


class MilestoneUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    target_date: Optional[datetime] = None
    status: Optional[str] = Field(None, pattern="^(Pending|Completed|Cancelled)$")


class MilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    goal_id: str
    title: str
    target_date: Optional[datetime]
    status: str
    task_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    task_completed: bool = False


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    title: str
    description: Optional[str]
    category: str
    target_date: Optional[datetime]
    weekly_minutes: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime
    milestones: List[MilestoneResponse] = []
    progress_percent: int = 0
    completed_milestones: int = 0
    total_milestones: int = 0
