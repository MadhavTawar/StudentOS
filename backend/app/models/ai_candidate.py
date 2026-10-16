import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, JSON, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class AIExtractionCandidate(Base):
    __tablename__ = "ai_extraction_candidates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source_email_id = Column(String(128), nullable=False, index=True)
    email_subject = Column(String(500), nullable=False)
    email_sender = Column(String(255), nullable=False)
    email_date = Column(DateTime(timezone=True), nullable=True)
    
    # Candidate details
    candidate_type = Column(String(32), default="task", nullable=False)  # "task" or "deadline"
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    suggested_due_date = Column(DateTime(timezone=True), nullable=True)
    category = Column(String(64), default="Assignment", nullable=False)
    priority = Column(String(32), default="Medium", nullable=False)
    supporting_evidence = Column(Text, nullable=False)  # Short quoted excerpt from source email
    confidence_score = Column(Float, default=0.5, nullable=False)  # 0.0 to 1.0
    
    # Approval & Provenance tracking
    validation_status = Column(String(32), default="pending_review", nullable=False)  # "pending_review", "approved", "rejected", "modified"
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_task_id = Column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    created_deadline_id = Column(String(36), ForeignKey("deadlines.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="ai_candidates")
    created_task = relationship("Task")
    created_deadline = relationship("Deadline")

    __table_args__ = (
        Index("idx_candidate_user_status", "user_id", "validation_status"),
    )
