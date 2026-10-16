from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class GmailAuthUrlResponse(BaseModel):
    auth_url: str
    state: str


class GmailCallbackRequest(BaseModel):
    code: str
    state: str


class GmailStatusResponse(BaseModel):
    is_connected: bool
    email_address: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    scopes: Optional[str] = None
    message_count: int = 0


class EmailMessageSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    message_id: str
    thread_id: Optional[str] = None
    sender: str
    recipient: Optional[str] = None
    subject: str
    snippet: Optional[str] = None
    internal_date: datetime
    is_read: bool = True
    has_extracted_candidates: bool = False


class EmailListResponse(BaseModel):
    messages: List[EmailMessageSummary]
    total: int
    page: int
    limit: int
