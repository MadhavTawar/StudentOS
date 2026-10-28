from datetime import datetime, timedelta, timezone

import pytest

from backend.app.models.deadline import Deadline
from backend.app.models.reminder import EmailDelivery
from backend.app.models.user import UserPreference
from backend.app.services import reminder_service
from backend.app.services.email_notification_service import (
    EmailDeliveryResult,
    EmailProviderDeliveryError,
)


@pytest.mark.asyncio
async def test_due_deadline_queues_and_delivers_email_once(db, test_user, monkeypatch):
    preference = db.query(UserPreference).filter_by(user_id=test_user.id).first()
    if preference is None:
        preference = UserPreference(user_id=test_user.id)
        db.add(preference)
    preference.email_notifications_enabled = True
    preference.deadline_reminders_enabled = True
    deadline = Deadline(
        user_id=test_user.id,
        title="Submit assignment",
        event_type="Assignment",
        due_date=datetime.now(timezone.utc) + timedelta(hours=1),
        status="Upcoming",
    )
    db.add(deadline)
    db.commit()

    sent = []

    class FakeProvider:
        async def send(self, **kwargs):
            sent.append(kwargs)
            return EmailDeliveryResult("mock", "accepted", "message-1")

    monkeypatch.setattr(reminder_service, "get_email_notification_provider", lambda: FakeProvider())
    now = datetime.now(timezone.utc)
    reminder_service.ReminderService.check_and_generate_reminders(db, now=now)
    reminder_service.ReminderService.check_and_generate_reminders(db, now=now)

    assert db.query(EmailDelivery).filter_by(item_id=deadline.id).count() == 3
    await reminder_service.ReminderService.deliver_pending_email_notifications(db, now=now)
    await reminder_service.ReminderService.deliver_pending_email_notifications(db, now=now)

    deliveries = db.query(EmailDelivery).filter_by(item_id=deadline.id).all()
    assert {delivery.status for delivery in deliveries} == {"Sent"}
    assert len(sent) == 3
    assert sent[0]["recipient"] == test_user.email


def test_completed_deadline_does_not_queue_email(db, test_user):
    preference = UserPreference(
        user_id=test_user.id,
        email_notifications_enabled=True,
        deadline_reminders_enabled=True,
    )
    db.add(preference)
    deadline = Deadline(
        user_id=test_user.id,
        title="Completed exam",
        event_type="Examination",
        due_date=datetime.now(timezone.utc) + timedelta(hours=1),
        status="Completed",
    )
    db.add(deadline)
    db.commit()

    reminder_service.ReminderService.check_and_generate_reminders(
        db, now=datetime.now(timezone.utc)
    )

    assert db.query(EmailDelivery).filter_by(item_id=deadline.id).count() == 0


@pytest.mark.asyncio
async def test_email_delivery_retries_temporary_provider_failure(db, test_user, monkeypatch):
    db.add(UserPreference(
        user_id=test_user.id,
        email_notifications_enabled=True,
        task_reminders_enabled=True,
    ))
    delivery = EmailDelivery(
        user_id=test_user.id,
        item_id="item-1",
        item_kind="task",
        stage="1d",
        subject="Task reminder",
        message="Finish your task.",
        next_attempt_at=datetime.now(timezone.utc),
    )
    db.add(delivery)
    db.commit()

    class FailingProvider:
        async def send(self, **kwargs):
            raise EmailProviderDeliveryError("temporary failure")

    monkeypatch.setattr(
        reminder_service,
        "get_email_notification_provider",
        lambda: FailingProvider(),
    )
    await reminder_service.ReminderService.deliver_pending_email_notifications(
        db, now=datetime.now(timezone.utc)
    )

    assert delivery.status == "Pending"
    assert delivery.attempts == 1
    assert delivery.last_error == "temporary failure"
