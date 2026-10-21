from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from backend.app.api.deps import check_rate_limit, get_current_user, get_db
from backend.app.models.user import User
from backend.app.schemas.workspace import (
    WorkspaceBillingResponse,
    WorkspaceCreate,
    WorkspaceInvitationResponse,
    WorkspaceInviteAccept,
    WorkspaceMemberResponse,
    WorkspaceResponse,
)
from backend.app.services import workspace_service

router = APIRouter()


def _serialize_workspace(db: Session, user: User, workspace_id: str) -> WorkspaceResponse:
    return next(item for item in workspace_service.list_workspaces(db, user) if item.id == workspace_id)


@router.get("/", response_model=list[WorkspaceResponse])
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return workspace_service.list_workspaces(db, current_user)


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    request: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = workspace_service.create_organization_workspace(db, current_user, request.name)
    return _serialize_workspace(db, current_user, workspace.id)


@router.post("/invites/accept", response_model=WorkspaceResponse)
def accept_workspace_invitation(
    request: WorkspaceInviteAccept,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = workspace_service.accept_invitation(db, current_user, request.token)
    return _serialize_workspace(db, current_user, workspace.id)


@router.post("/{workspace_id}/invites", response_model=WorkspaceInvitationResponse, status_code=status.HTTP_201_CREATED)
def create_workspace_invitation(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(f"workspace_invite_{current_user.id}", max_attempts=10, window_seconds=300)
    invitation, token = workspace_service.create_invitation(db, current_user, workspace_id)
    return WorkspaceInvitationResponse(
        workspace_id=invitation.workspace_id,
        invited_email=invitation.invited_email,
        token=token,
        expires_at=invitation.expires_at,
    )


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
def list_workspace_members(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return workspace_service.list_members(db, current_user, workspace_id)


@router.get("/{workspace_id}/billing", response_model=WorkspaceBillingResponse)
def get_workspace_billing(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return workspace_service.get_billing(db, current_user, workspace_id)


@router.get("/current", response_model=WorkspaceResponse)
def get_current_workspace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
):
    workspace = workspace_service.get_current_workspace(db, current_user, workspace_id)
    return _serialize_workspace(db, current_user, workspace.id)
