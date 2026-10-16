import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class OAuthIntegration(Base):
    __tablename__ = "oauth_integrations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(64), default="google_gmail", nullable=False)
    encrypted_access_token = Column(Text, nullable=False)
    encrypted_refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)
    scopes = Column(String(255), default="https://www.googleapis.com/auth/gmail.readonly", nullable=False)
    email_address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="integrations")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_provider_integration"),
    )


class OAuthState(Base):
    """Temporary state store to prevent CSRF during OAuth callback."""
    __tablename__ = "oauth_states"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    state_token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class EmailMetadataCache(Base):
    """
    Cached email metadata only (sender, subject, date, safe snippet).
    Never stores raw body or attachments.
    """
    __tablename__ = "email_metadata_cache"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(String(128), nullable=False, index=True)
    thread_id = Column(String(128), nullable=True)
    sender = Column(String(255), nullable=False)
    recipient = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    snippet = Column(Text, nullable=True)  # sanitized preview
    internal_date = Column(DateTime(timezone=True), nullable=False, index=True)
    is_read = Column(Boolean, default=True, nullable=False)
    has_extracted_candidates = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "message_id", name="uq_user_email_message"),
        Index("idx_email_user_date", "user_id", "internal_date"),
    )
