import hashlib
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.models.workspace import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceMembership,
    WorkspaceSubscription,
)
from backend.app.schemas.workspace import (
    WorkspaceBillingResponse,
    WorkspaceMemberResponse,
    WorkspaceResponse,
)


def create_personal_workspace(db: Session, user: User) -> Workspace:
    workspace = (
        db.query(Workspace)
        .filter(Workspace.is_personal.is_(True), Workspace.created_by == user.id)
        .first()
    )
    if workspace is not None:
        return workspace

    workspace = Workspace(
        name=f"{user.full_name}'s workspace"[:120],
        slug=f"personal-{user.id}",
        workspace_type="personal",
        is_personal=True,
        created_by=user.id,
    )
    db.add(workspace)
    db.flush()
    db.add(WorkspaceMembership(workspace_id=workspace.id, user_id=user.id, role="owner"))
    db.add(WorkspaceSubscription(workspace_id=workspace.id, plan_code="free", status="active"))
    db.flush()
    return workspace


def get_membership(db: Session, workspace_id: str, user_id: str) -> WorkspaceMembership:
    membership = (
        db.query(WorkspaceMembership)
        .filter_by(workspace_id=workspace_id, user_id=user_id)
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return membership


def get_current_workspace(db: Session, user: User, workspace_id: str | None) -> Workspace:
    if workspace_id:
        membership = (
            db.query(WorkspaceMembership)
            .filter_by(workspace_id=workspace_id, user_id=user.id)
            .first()
        )
        if membership is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
        workspace = db.query(Workspace).filter_by(id=workspace_id).first()
    else:
        workspace = (
            db.query(Workspace)
            .filter(Workspace.is_personal.is_(True), Workspace.created_by == user.id)
            .first()
        )
        if workspace is None:
            workspace = create_personal_workspace(db, user)
            db.commit()
            db.refresh(workspace)
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return workspace


def create_organization_workspace(db: Session, user: User, name: str) -> Workspace:
    normalized_name = name.strip()
    if not normalized_name or len(normalized_name) > 120:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Workspace name is invalid.")
    slug_base = re.sub(r"[^a-z0-9]+", "-", normalized_name.lower()).strip("-")[:80] or "workspace"
    workspace = Workspace(
        name=normalized_name,
        slug=f"{slug_base}-{uuid.uuid4().hex[:8]}",
        workspace_type="organization",
        is_personal=False,
        created_by=user.id,
    )
    db.add(workspace)
    db.flush()
    db.add(WorkspaceMembership(workspace_id=workspace.id, user_id=user.id, role="owner"))
    db.add(WorkspaceSubscription(workspace_id=workspace.id, plan_code="free", status="active"))
    db.commit()
    db.refresh(workspace)
    return workspace


def list_workspaces(db: Session, user: User) -> List[WorkspaceResponse]:
    rows = (
        db.query(Workspace, WorkspaceMembership, WorkspaceSubscription)
        .join(WorkspaceMembership, WorkspaceMembership.workspace_id == Workspace.id)
        .outerjoin(WorkspaceSubscription, WorkspaceSubscription.workspace_id == Workspace.id)
        .filter(WorkspaceMembership.user_id == user.id)
        .order_by(Workspace.is_personal.desc(), Workspace.name)
        .all()
    )
    return [
        WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            slug=workspace.slug,
            workspace_type=workspace.workspace_type,
            is_personal=workspace.is_personal,
            role=membership.role,
            plan_code=subscription.plan_code if subscription else "free",
            subscription_status=subscription.status if subscription else "active",
        )
        for workspace, membership, subscription in rows
    ]


def create_invitation(
    db: Session,
    user: User,
    workspace_id: str,
) -> Tuple[WorkspaceInvitation, str]:
    membership = get_membership(db, workspace_id, user.id)
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace owner access is required.")
    workspace = db.query(Workspace).filter_by(id=workspace_id, is_personal=False).first()
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Personal workspaces cannot be shared.")
    token = secrets.token_urlsafe(36)
    invitation = WorkspaceInvitation(
        workspace_id=workspace_id,
        invited_email=None,
        token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
        invited_by=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation, token


def accept_invitation(db: Session, user: User, token: str) -> Workspace:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    invitation = db.query(WorkspaceInvitation).filter_by(token_hash=token_hash).first()
    now = datetime.now(timezone.utc)
    if invitation is None or invitation.accepted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace invitation is invalid or already used.")
    expires_at = invitation.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Workspace invitation has expired.")
    workspace_id = invitation.workspace_id
    claimed = (
        db.query(WorkspaceInvitation)
        .filter(
            WorkspaceInvitation.id == invitation.id,
            WorkspaceInvitation.accepted_at.is_(None),
        )
        .update({WorkspaceInvitation.accepted_at: now}, synchronize_session=False)
    )
    if claimed != 1:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace invitation is invalid or already used.")
    if db.query(WorkspaceMembership.id).filter_by(
        workspace_id=workspace_id,
        user_id=user.id,
    ).first() is None:
        db.add(WorkspaceMembership(
            workspace_id=workspace_id,
            user_id=user.id,
            role="member",
        ))
    db.commit()
    workspace = db.query(Workspace).filter_by(id=workspace_id).first()
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace no longer exists.")
    return workspace


def list_members(db: Session, user: User, workspace_id: str) -> List[WorkspaceMemberResponse]:
    get_membership(db, workspace_id, user.id)
    rows = (
        db.query(WorkspaceMembership, User)
        .join(User, User.id == WorkspaceMembership.user_id)
        .filter(WorkspaceMembership.workspace_id == workspace_id)
        .order_by(WorkspaceMembership.created_at, User.email)
        .all()
    )
    return [
        WorkspaceMemberResponse(
            user_id=member.user_id,
            email=member_user.email,
            full_name=member_user.full_name,
            role=member.role,
            joined_at=member.created_at,
        )
        for member, member_user in rows
    ]


def get_billing(db: Session, user: User, workspace_id: str) -> WorkspaceBillingResponse:
    get_membership(db, workspace_id, user.id)
    subscription = (
        db.query(WorkspaceSubscription)
        .filter_by(workspace_id=workspace_id)
        .first()
    )
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Workspace plan is unavailable.")
    return WorkspaceBillingResponse(
        plan_code=subscription.plan_code,
        status=subscription.status,
        billing_provider=subscription.billing_provider,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        payment_provider_configured=False,
    )
