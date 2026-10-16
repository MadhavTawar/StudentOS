from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.deadline import DeadlineCreate, DeadlineUpdate, DeadlineResponse, DeadlineDuplicateWarning
from backend.app.services.deadline_service import DeadlineService

router = APIRouter()


@router.get("/", response_model=List[DeadlineResponse])
def list_deadlines(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    status: Optional[str] = Query(None, description="Filter by status: Upcoming, Due Soon, Completed, Overdue"),
    upcoming_only: bool = Query(False, description="Filter only upcoming non-completed deadlines"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deadlines, _ = DeadlineService.list_deadlines(
        db,
        user_id=current_user.id,
        event_type=event_type,
        status_filter=status,
        upcoming_only=upcoming_only,
        limit=limit,
        offset=offset
    )
    return deadlines


@router.post("/check-duplicate", response_model=DeadlineDuplicateWarning)
def check_deadline_duplicate(
    deadline_in: DeadlineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DeadlineService.check_duplicate(
        db,
        user_id=current_user.id,
        title=deadline_in.title,
        due_date=deadline_in.due_date
    )


@router.post("/", response_model=DeadlineResponse, status_code=status.HTTP_201_CREATED)
def create_deadline(
    deadline_in: DeadlineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DeadlineService.create_deadline(db, user_id=current_user.id, deadline_in=deadline_in)


@router.get("/{deadline_id}", response_model=DeadlineResponse)
def get_deadline(
    deadline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DeadlineService.get_deadline(db, user_id=current_user.id, deadline_id=deadline_id)


@router.put("/{deadline_id}", response_model=DeadlineResponse)
def update_deadline(
    deadline_id: str,
    deadline_in: DeadlineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DeadlineService.update_deadline(db, user_id=current_user.id, deadline_id=deadline_id, deadline_in=deadline_in)


@router.delete("/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deadline(
    deadline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    DeadlineService.delete_deadline(db, user_id=current_user.id, deadline_id=deadline_id)
    return None
