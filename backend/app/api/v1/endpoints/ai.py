from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.api.deps import check_rate_limit, get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.ai import (
    EmailExtractionRequest,
    AICandidateResponse,
    AICandidateReviewRequest,
    AIAssistantMessageRequest,
    AIAssistantResponse
)
from backend.app.services.ai_service import AIService

router = APIRouter()


@router.post("/extract-email", response_model=List[AICandidateResponse])
async def extract_email_candidates(
    request: EmailExtractionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extract structured task/deadline proposals from selected email.
    Stores proposals as 'pending_review' with evidence quotes.
    NEVER directly saves tasks without explicit user approval.
    """
    check_rate_limit(f"ai_extract_{current_user.id}", max_attempts=30, window_seconds=60)
    candidates = await AIService.extract_and_store_candidates(db, user_id=current_user.id, request=request)
    return [AICandidateResponse.model_validate(c) for c in candidates]


@router.get("/candidates", response_model=List[AICandidateResponse])
def list_candidates(
    status: Optional[str] = Query("pending_review", description="Filter: pending_review, approved, rejected"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve AI extraction candidates for user review."""
    candidates = AIService.list_candidates(db, user_id=current_user.id, status_filter=status)
    return [AICandidateResponse.model_validate(c) for c in candidates]


@router.post("/candidates/{candidate_id}/review", response_model=AICandidateResponse)
def review_candidate(
    candidate_id: str,
    review_in: AICandidateReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    User human approval or rejection of an AI candidate proposal.
    Creates concrete Task or Deadline only upon approval.
    """
    return AIService.review_candidate(
        db,
        user_id=current_user.id,
        candidate_id=candidate_id,
        review=review_in
    )


@router.get("/provider")
def get_ai_provider():
    """Return the active AI provider name for frontend disclosure."""
    return {"provider": settings.AI_PROVIDER}


@router.post("/assistant/chat", response_model=AIAssistantResponse)
async def chat_assistant(
    chat_in: AIAssistantMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask StudentOS Assistant questions about schedule, deadlines, and study plans.
    Reads authenticated user's academic data only with strict authorization.
    """
    check_rate_limit(f"ai_assistant_{current_user.id}", max_attempts=30, window_seconds=60)
    return await AIService.chat_with_assistant(
        db,
        user_id=current_user.id,
        user_message=chat_in.message
    )
