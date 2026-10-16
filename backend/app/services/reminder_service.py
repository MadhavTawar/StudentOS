import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.logging import logger
from backend.app.db.session import SessionLocal
from backend.app.models.reminder import Reminder, InAppNotification
from backend.app.models.deadline import Deadline
from backend.app.models.task import Task
from backend.app.schemas.reminder import ReminderCreate
from backend.app.core.security import ensure_utc


class ReminderService:
    @staticmethod
    def create_reminder(db: Session, user_id: str, reminder_in: ReminderCreate) -> Reminder:
        reminder = Reminder(
            user_id=user_id,
            task_id=reminder_in.task_id,
            deadline_id=reminder_in.deadline_id,
            remind_at=reminder_in.remind_at,
            lead_time_minutes=reminder_in.lead_time_minutes,
            title=reminder_in.title,
            message=reminder_in.message,
            status="Pending"
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def list_reminders(db: Session, user_id: str) -> List[Reminder]:
        return db.query(Reminder).filter(
            Reminder.user_id == user_id
        ).order_by(Reminder.remind_at.asc()).all()

    @staticmethod
    def dismiss_reminder(db: Session, user_id: str, reminder_id: str) -> Reminder:
        rem = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == user_id).first()
        if not rem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found.")
        rem.status = "Dismissed"
        rem.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(rem)
        return rem

    @staticmethod
    def list_notifications(
        db: Session,
        user_id: str,
        unread_only: bool = False
    ) -> List[InAppNotification]:
        query = db.query(InAppNotification).filter(
            InAppNotification.user_id == user_id,
            InAppNotification.dismissed == False
        )
        if unread_only:
            query = query.filter(InAppNotification.is_read == False)
        return query.order_by(InAppNotification.created_at.desc()).limit(50).all()

    @staticmethod
    def mark_notification_read(db: Session, user_id: str, notification_id: str) -> InAppNotification:
        notif = db.query(InAppNotification).filter(
            InAppNotification.id == notification_id,
            InAppNotification.user_id == user_id
        ).first()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        notif.is_read = True
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def dismiss_notification(db: Session, user_id: str, notification_id: str):
        notif = db.query(InAppNotification).filter(
            InAppNotification.id == notification_id,
            InAppNotification.user_id == user_id
        ).first()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        notif.dismissed = True
        db.commit()

    @staticmethod
    def check_and_generate_reminders(db: Session):
        """
        Background job routine:
        1. Checks due reminders and triggers them.
        2. Automatically scans upcoming deadlines (e.g. within 24h) and creates in-app notifications
           with duplicate prevention.
        """
        now = datetime.now(timezone.utc)

        # 1. Trigger pending reminders whose remind_at <= now
        due_reminders = db.query(Reminder).filter(
            Reminder.status == "Pending",
            Reminder.remind_at <= now
        ).all()

        for rem in due_reminders:
            rem.status = "Triggered"
            # Prevent duplicate notification
            existing = db.query(InAppNotification).filter(
                InAppNotification.reminder_id == rem.id
            ).first()
            if not existing:
                notif = InAppNotification(
                    user_id=rem.user_id,
                    reminder_id=rem.id,
                    title=rem.title,
                    message=rem.message or f"Scheduled reminder for '{rem.title}'.",
                    notification_type="deadline_approaching"
                )
                db.add(notif)

        # 2. Check for upcoming deadlines in 24 hours
        window_24h = now + timedelta(hours=24)
        upcoming_deadlines = db.query(Deadline).filter(
            Deadline.due_date >= now,
            Deadline.due_date <= window_24h,
            Deadline.status != "Completed"
        ).all()

        for d in upcoming_deadlines:
            # Check if notification already sent today for this deadline
            today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
            existing_notif = db.query(InAppNotification).filter(
                InAppNotification.user_id == d.user_id,
                InAppNotification.title == f"Approaching Deadline: {d.title}",
                InAppNotification.created_at >= today_start
            ).first()
            if not existing_notif:
                due_dt = ensure_utc(d.due_date)
                time_left = due_dt - now
                hours_left = max(1, int(time_left.total_seconds() // 3600))
                db.add(InAppNotification(
                    user_id=d.user_id,
                    title=f"Approaching Deadline: {d.title}",
                    message=f"'{d.title}' is due in ~{hours_left} hours ({due_dt.strftime('%b %d, %H:%M')}).",
                    notification_type="deadline_approaching"
                ))

        db.commit()


# Background worker loop for single-process local development
async def start_reminder_scheduler_task():
    """
    Lightweight background loop that polls persistent DB every 30 seconds.
    Safe for local dev without Celery/Redis overhead.
    """
    logger.info("Started background reminder scheduler loop.")
    while True:
        try:
            db = SessionLocal()
            try:
                ReminderService.check_and_generate_reminders(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in background reminder worker: {e}")
        await asyncio.sleep(30)
