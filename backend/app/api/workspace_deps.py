from fastapi import Depends, Header
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, get_db
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.services.workspace_service import get_current_workspace


def require_current_workspace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
) -> Workspace:
    return get_current_workspace(db, current_user, workspace_id)
