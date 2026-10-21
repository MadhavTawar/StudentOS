from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    workspace_type: str
    is_personal: bool
    role: str
    plan_code: str
    subscription_status: str


class WorkspaceInvitationResponse(BaseModel):
    workspace_id: str
    invited_email: Optional[str] = None
    token: str
    expires_at: datetime


class WorkspaceInviteAccept(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class WorkspaceMemberResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    joined_at: datetime


class WorkspaceBillingResponse(BaseModel):
    plan_code: str
    status: str
    billing_provider: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool
    payment_provider_configured: bool = False

