from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    full_name: str = Field(..., min_length=2, max_length=150)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        # Check that it's not all spaces
        if v.strip() != v:
            raise ValueError("Password cannot start or end with whitespace")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPreferenceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timezone: str
    theme: str
    email_sync_enabled: bool
    ai_features_enabled: bool
    reminder_lead_minutes: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    preference: Optional[UserPreferenceSchema] = None


class TokenResponse(BaseModel):
    user: UserResponse
