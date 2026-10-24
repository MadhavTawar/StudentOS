import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    deadline_id = Column(String(36), ForeignKey("deadlines.id", ondelete="CASCADE"), nullable=True, index=True)
    remind_at = Column(DateTime(timezone=True), nullable=False, index=True)
    lead_time_minutes = Column(Integer, default=60, nullable=False)
    status = Column(String(32), default="Pending", nullable=False)  # "Pending", "Triggered", "Dismissed", "Completed"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="reminders")
    task = relationship("Task", back_populates="reminders")
    deadline = relationship("Deadline", back_populates="reminders")
    notifications = relationship("InAppNotification", back_populates="reminder", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_reminders_status_time", "status", "remind_at"),
    )


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reminder_id = Column(String(36), ForeignKey("reminders.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(64), default="system", nullable=False)  # "deadline_approaching", "task_overdue", "ai_proposal", "system"
    is_read = Column(Boolean, default=False, nullable=False)
    dismissed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="notifications")
    reminder = relationship("Reminder", back_populates="notifications")

class AutoReminderLog(Base):
    """Tracks which (item, stage) auto-reminders have been sent to prevent duplicates."""
    __tablename__ = "auto_reminder_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String(36), nullable=False, index=True)
    item_kind = Column(String(16), nullable=False)  # "task" or "deadline"
    stage = Column(String(16), nullable=False)  # "3d", "1d", "2h", "overdue"
    notified_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_auto_reminder_unique", "item_id", "item_kind", "stage", unique=True),
    )
