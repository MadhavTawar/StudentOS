from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.reminder import (
    ReminderCreate,
    ReminderResponse,
    InAppNotificationResponse,
    NotificationCountResponse
)
from backend.app.services.reminder_service import ReminderService

router = APIRouter()


@router.get("/", response_model=List[ReminderResponse])
def list_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reminders = ReminderService.list_reminders(db, user_id=current_user.id)
    return reminders


@router.post("/", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    reminder_in: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ReminderService.create_reminder(db, user_id=current_user.id, reminder_in=reminder_in)


@router.post("/{reminder_id}/dismiss", response_model=ReminderResponse)
def dismiss_reminder(
    reminder_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ReminderService.dismiss_reminder(db, user_id=current_user.id, reminder_id=reminder_id)


@router.get("/notifications", response_model=List[InAppNotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = ReminderService.list_notifications(db, user_id=current_user.id, unread_only=unread_only)
    return notifs


@router.patch("/notifications/{notification_id}/read", response_model=InAppNotificationResponse)
def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ReminderService.mark_notification_read(db, user_id=current_user.id, notification_id=notification_id)


@router.delete("/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ReminderService.dismiss_notification(db, user_id=current_user.id, notification_id=notification_id)
    return None
