from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.gmail import (
    GmailAuthUrlResponse,
    GmailCallbackRequest,
    GmailStatusResponse,
    EmailListResponse,
    EmailMessageSummary
)
from backend.app.services.gmail_service import GmailService

router = APIRouter()


@router.get("/auth-url", response_model=GmailAuthUrlResponse)
def get_auth_url(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate CSRF-protected Google OAuth 2.0 URL with read-only scope."""
    url, state = GmailService.generate_auth_url(db, user_id=current_user.id)
    return GmailAuthUrlResponse(auth_url=url, state=state)


@router.post("/callback", response_model=GmailStatusResponse)
async def oauth_callback(
    callback_data: GmailCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Handle OAuth redirect, validate state, and securely store encrypted credentials."""
    await GmailService.handle_callback(
        db,
        user_id=current_user.id,
        code=callback_data.code,
        state=callback_data.state
    )
    status_dict = GmailService.get_status(db, user_id=current_user.id)
    return GmailStatusResponse(**status_dict)


@router.get("/status", response_model=GmailStatusResponse)
def get_connection_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check whether Gmail is connected, email address, and sync state."""
    status_dict = GmailService.get_status(db, user_id=current_user.id)
    return GmailStatusResponse(**status_dict)


@router.get("/messages", response_model=EmailListResponse)
async def list_cached_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch read-only email metadata (sender, subject, safe snippet)."""
    await GmailService.sync_messages(db, user_id=current_user.id)
    messages, total = GmailService.list_messages(
        db,
        user_id=current_user.id,
        page=page,
        limit=limit,
        search=search
    )
    return EmailListResponse(
        messages=[EmailMessageSummary.model_validate(m) for m in messages],
        total=total,
        page=page,
        limit=limit
    )


@router.post("/disconnect")
def disconnect_gmail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Gmail and remove stored tokens."""
    GmailService.disconnect(db, user_id=current_user.id)
    return {"message": "Gmail successfully disconnected."}
