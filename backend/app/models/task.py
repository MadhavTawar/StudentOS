import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), default="General", nullable=False)  # "Assignment", "Exam Prep", "Project", "Placement", "General"
    priority = Column(String(32), default="Medium", nullable=False)  # "Low", "Medium", "High", "Urgent"
    status = Column(String(32), default="Pending", nullable=False)  # "Pending", "In Progress", "Completed", "Cancelled"
    due_date = Column(DateTime(timezone=True), nullable=True, index=True)
    timezone = Column(String(64), default="UTC", nullable=False)
    estimated_duration = Column(Integer, nullable=True)  # in minutes
    source_type = Column(String(32), default="manual", nullable=False)  # "manual", "gmail", "ai_proposal"
    source_ref = Column(String(255), nullable=True)  # e.g., email message ID or candidate ID
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="tasks")
    deadlines = relationship("Deadline", back_populates="task")
    reminders = relationship("Reminder", back_populates="task", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_tasks_user_status", "user_id", "status"),
        Index("idx_tasks_user_due", "user_id", "due_date"),
    )
