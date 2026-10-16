from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class UserPreferenceUpdate(BaseModel):
    timezone: Optional[str] = Field(None, max_length=64)
    theme: Optional[str] = Field(None, pattern="^(dark|light|system)$")
    email_sync_enabled: Optional[bool] = None
    ai_features_enabled: Optional[bool] = None
    reminder_lead_minutes: Optional[int] = Field(None, ge=5, le=10080)  # Between 5 mins and 7 days


class UserPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    timezone: str
    theme: str
    email_sync_enabled: bool
    ai_features_enabled: bool
    reminder_lead_minutes: int
