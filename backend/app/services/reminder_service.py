import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.logging import logger
from backend.app.db.session import SessionLocal
from backend.app.models.reminder import Reminder, InAppNotification, AutoReminderLog, EmailDelivery
from backend.app.models.user import User, UserPreference
from backend.app.services.email_notification_service import (
    EmailProviderError,
    get_email_notification_provider,
)
from backend.app.services.due_items import get_due_items
from backend.app.schemas.reminder import ReminderCreate
from backend.app.core.security import ensure_utc


# --- Notification channel abstraction ---

class NotificationChannel(ABC):
    @abstractmethod
    def send(self, user_id: str, title: str, message: str, notification_type: str) -> None:
        ...


class InAppNotificationChannel(NotificationChannel):
    def __init__(self, db: Session):
        self.db = db

    def send(self, user_id: str, title: str, message: str, notification_type: str) -> None:
        notif = InAppNotification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
        )
        self.db.add(notif)


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

    # Staged lead times (minutes before due date)
    STAGES = [("3d", 3 * 24 * 60), ("1d", 24 * 60), ("2h", 2 * 60)]

    @staticmethod
    def check_and_generate_reminders(db: Session, now: Optional[datetime] = None):
        """
        Background job routine:
        1. Trigger pending manual reminders whose remind_at <= now.
        2. Auto-generate staged reminders for tasks AND deadlines via the
           shared due-items layer. One notification per (item, stage), tracked
           in AutoReminderLog so restarts / repeated loops never duplicate.
        3. Overdue handling: one "now overdue" notification per item.
        """
        if now is None:
            now = datetime.now(timezone.utc)
        now = ensure_utc(now)

        # 1. Trigger pending manual reminders
        due_reminders = db.query(Reminder).filter(
            Reminder.status == "Pending",
            Reminder.remind_at <= now
        ).all()
        for rem in due_reminders:
            rem.status = "Triggered"
            existing = db.query(InAppNotification).filter(
                InAppNotification.reminder_id == rem.id
            ).first()
            if not existing:
                db.add(InAppNotification(
                    user_id=rem.user_id,
                    reminder_id=rem.id,
                    title=rem.title,
                    message=rem.message or f"Scheduled reminder for '{rem.title}'.",
                    notification_type="reminder"
                ))

        # 2. Auto reminders via shared layer
        # Group users
        users = db.query(User).all()
        channel = InAppNotificationChannel(db)

        for user in users:
            items = get_due_items(db, user.id, include_completed=False)
            for item in items:
                if not item.due_date:
                    continue
                due = ensure_utc(item.due_date)
                if due is None:
                    continue
                # Skip completed/cancelled
                if item.status in ("Completed", "Cancelled"):
                    continue

                # Determine which stages have already passed / are due
                preference = (
                    db.query(UserPreference)
                    .filter(UserPreference.user_id == user.id)
                    .first()
                )
                for stage_key, lead_minutes in ReminderService.STAGES:
                    stage_time = due - timedelta(minutes=lead_minutes)
                    # Stage fires when now >= stage_time and now < due (not yet overdue)
                    if stage_time <= now < due:
                        # Check log
                        existing_log = db.query(AutoReminderLog).filter(
                            AutoReminderLog.item_id == item.id,
                            AutoReminderLog.item_kind == item.kind,
                            AutoReminderLog.stage == stage_key,
                        ).first()
                        if existing_log:
                            continue
                        # Also check if any notification already exists for this stage
                        title = f"Upcoming: {item.title}"
                        msg = f"'{item.title}' is due in ~{lead_minutes // 60}h ({due.strftime('%b %d, %H:%M')})."
                        channel.send(user.id, title, msg, "deadline_approaching")
                        if preference and preference.email_notifications_enabled:
                            ReminderService._queue_email_delivery(
                                db, user, item.id, item.kind, stage_key, now,
                                title, msg,
                                enabled=(
                                    preference.exam_reminders_enabled
                                    if item.event_type == "Examination"
                                    else (
                                        preference.deadline_reminders_enabled
                                        if item.kind == "deadline"
                                        else preference.task_reminders_enabled
                                    )
                                ),
                            )
                        db.add(AutoReminderLog(
                            user_id=user.id,
                            item_id=item.id,
                            item_kind=item.kind,
                            stage=stage_key,
                        ))

                # Overdue handling: one "now overdue" notification per item
                if due < now:
                    existing_log = db.query(AutoReminderLog).filter(
                        AutoReminderLog.item_id == item.id,
                        AutoReminderLog.item_kind == item.kind,
                        AutoReminderLog.stage == "overdue",
                    ).first()
                    if not existing_log:
                        title = f"Overdue: {item.title}"
                        msg = f"'{item.title}' is now overdue (was due {due.strftime('%b %d, %H:%M')})."
                        channel.send(user.id, title, msg, "task_overdue")
                        if preference and preference.overdue_reminders_enabled:
                            if preference.email_notifications_enabled:
                                ReminderService._queue_email_delivery(
                                    db, user, item.id, item.kind, "overdue", now,
                                    title, msg, enabled=True,
                                )
                        db.add(AutoReminderLog(
                            user_id=user.id,
                            item_id=item.id,
                            item_kind=item.kind,
                            stage="overdue",
                        ))

        db.commit()

    @staticmethod
    def _queue_email_delivery(
        db: Session,
        user: User,
        item_id: str,
        item_kind: str,
        stage: str,
        now: datetime,
        title: str,
        message: str,
        *,
        enabled: bool,
    ) -> None:
        if not enabled:
            return
        existing = db.query(EmailDelivery).filter(
            EmailDelivery.user_id == user.id,
            EmailDelivery.item_id == item_id,
            EmailDelivery.item_kind == item_kind,
            EmailDelivery.stage == stage,
        ).first()
        if existing is None:
            db.add(EmailDelivery(
                user_id=user.id,
                item_id=item_id,
                item_kind=item_kind,
                stage=stage,
                subject=title,
                message=message,
                next_attempt_at=now,
            ))

    @staticmethod
    async def deliver_pending_email_notifications(
        db: Session,
        now: Optional[datetime] = None,
    ) -> None:
        """Deliver queued emails with bounded retries and user isolation."""
        now = ensure_utc(now or datetime.now(timezone.utc))
        deliveries = db.query(EmailDelivery).filter(
            EmailDelivery.status == "Pending",
            EmailDelivery.next_attempt_at <= now,
            EmailDelivery.attempts < 3,
        ).limit(50).all()
        provider = get_email_notification_provider()
        for delivery in deliveries:
            user = db.query(User).filter(User.id == delivery.user_id).first()
            preference = db.query(UserPreference).filter(
                UserPreference.user_id == delivery.user_id
            ).first()
            if not user or not preference or not preference.email_notifications_enabled:
                delivery.status = "Suppressed"
                continue
            delivery.attempts += 1
            try:
                result = await provider.send(
                    recipient=user.email,
                    subject=f"StudentOS: {delivery.subject}",
                    text=delivery.message,
                )
                delivery.status = "Sent"
                delivery.provider = result.provider
                delivery.provider_message_id = result.provider_message_id
                delivery.sent_at = now
            except EmailProviderError as exc:
                delivery.last_error = str(exc)
                if delivery.attempts >= 3:
                    delivery.status = "Failed"
                else:
                    delivery.next_attempt_at = now + timedelta(minutes=2 ** delivery.attempts)
                logger.warning(
                    "Email notification delivery failed for delivery %s: %s",
                    delivery.id,
                    type(exc).__name__,
                )

            if (
                preference
                and preference.email_notifications_enabled
                and preference.daily_summary_enabled
            ):
                try:
                    local_date = now.astimezone(ZoneInfo(preference.timezone or "UTC")).date()
                except Exception:
                    local_date = now.date()
                daily_items = [
                    item for item in items
                    if item.due_date and ensure_utc(item.due_date).date() == local_date
                ]
                if daily_items:
                    summary = "\n".join(
                        f"- {item.title} ({item.kind})"
                        for item in daily_items
                    )
                    ReminderService._queue_email_delivery(
                        db,
                        user,
                        f"daily:{local_date.isoformat()}",
                        "daily",
                        local_date.isoformat(),
                        now,
                        "Your StudentOS daily agenda",
                        f"Today's academic items:\n{summary}",
                        enabled=True,
                    )

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
                await ReminderService.deliver_pending_email_notifications(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in background reminder worker: {e}")
        await asyncio.sleep(30)
