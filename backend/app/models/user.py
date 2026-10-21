from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.session import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    preference: Mapped[Optional[UserPreference]] = relationship(
        "UserPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    tasks: Mapped[list[Task]] = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    deadlines: Mapped[list[Deadline]] = relationship(
        "Deadline",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    integrations: Mapped[list[OAuthIntegration]] = relationship(
        "OAuthIntegration",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reminders: Mapped[list[Reminder]] = relationship(
        "Reminder",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list[InAppNotification]] = relationship(
        "InAppNotification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    ai_candidates: Mapped[list[AIExtractionCandidate]] = relationship(
        "AIExtractionCandidate",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[list[UserSession]] = relationship(
        "UserSession",
        cascade="all, delete-orphan",
    )


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    theme: Mapped[str] = mapped_column(String(32), default="dark", nullable=False)
    email_sync_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ai_features_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reminder_lead_minutes: Mapped[int] = mapped_column(Integer, default=1440, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="preference")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
