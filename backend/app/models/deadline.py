import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class Deadline(Base):
    __tablename__ = "deadlines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(64), default="Assignment", nullable=False)  # "Assignment", "Examination", "Placement", "Interview", "Project", "Registration", "Other"
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    timezone = Column(String(64), default="UTC", nullable=False)
    status = Column(String(32), default="Upcoming", nullable=False)  # "Upcoming", "Due Soon", "Completed", "Overdue"
    is_ambiguous = Column(Boolean, default=False, nullable=False)
    original_date_text = Column(String(255), nullable=True)  # e.g., "next Friday by 5pm"
    source_type = Column(String(32), default="manual", nullable=False)  # "manual", "gmail", "ai_proposal"
    source_ref = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="deadlines")
    task = relationship("Task", back_populates="deadlines")
    reminders = relationship("Reminder", back_populates="deadline", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_deadlines_user_due", "user_id", "due_date"),
        Index("idx_deadlines_user_status", "user_id", "status"),
    )
