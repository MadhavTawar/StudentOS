import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.ai_candidate import AIExtractionCandidate
from backend.app.models.deadline import Deadline
from backend.app.models.integration import EmailMetadataCache, OAuthIntegration, OAuthState
from backend.app.models.knowledge import KnowledgeAuditEvent, KnowledgeDocument, UserRole
from backend.app.models.reminder import InAppNotification, Reminder
from backend.app.models.task import Task
from backend.app.models.user import User, UserPreference, UserSession
from backend.app.models.workspace import (
    Workspace,
    WorkspaceInvitation,
    WorkspaceMembership,
    WorkspaceSubscription,
)
from backend.app.services.knowledge_service import delete_workspace_documents


def delete_user_account(db: Session, user: User) -> None:
    memberships = db.query(WorkspaceMembership).filter_by(user_id=user.id).all()
    owned_workspace_ids = [
        membership.workspace_id
        for membership in memberships
        if membership.role == "owner"
    ]
    retained_workspace_ids = [
        membership.workspace_id
        for membership in memberships
        if membership.workspace_id not in owned_workspace_ids
    ]

    for workspace_id in owned_workspace_ids:
        other_members = (
            db.query(WorkspaceMembership)
            .filter(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.user_id != user.id,
            )
            .count()
        )
        if other_members:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Transfer ownership or delete each shared workspace before deleting this account.",
            )

    documents_to_transfer = []
    if retained_workspace_ids:
        documents_to_transfer = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.uploaded_by == user.id,
            KnowledgeDocument.workspace_id.in_(retained_workspace_ids),
        ).all()
        for document in documents_to_transfer:
            owner_membership = (
                db.query(WorkspaceMembership)
                .filter(
                    WorkspaceMembership.workspace_id == document.workspace_id,
                    WorkspaceMembership.role == "owner",
                    WorkspaceMembership.user_id != user.id,
                )
                .first()
            )
            if owner_membership is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Transfer ownership of shared workspace documents before deleting this account.",
                )
            document.uploaded_by = owner_membership.user_id

    for workspace_id in owned_workspace_ids:
        workspace = db.query(Workspace).filter_by(id=workspace_id).first()
        if workspace is None:
            continue
        delete_workspace_documents(db, workspace_id, user)
        db.query(WorkspaceInvitation).filter_by(workspace_id=workspace_id).delete(
            synchronize_session=False
        )
        db.query(WorkspaceSubscription).filter_by(workspace_id=workspace_id).delete(
            synchronize_session=False
        )
        db.query(WorkspaceMembership).filter_by(workspace_id=workspace_id).delete(
            synchronize_session=False
        )
        db.delete(workspace)

    db.query(WorkspaceInvitation).filter_by(invited_by=user.id).delete(synchronize_session=False)
    db.query(WorkspaceMembership).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(EmailMetadataCache).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(OAuthState).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(OAuthIntegration).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(UserSession).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(UserPreference).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(UserRole).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(AIExtractionCandidate).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(InAppNotification).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(Reminder).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(Deadline).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(Task).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(KnowledgeAuditEvent).filter_by(actor_user_id=user.id).update(
        {KnowledgeAuditEvent.actor_user_id: None},
        synchronize_session=False,
    )
    db.add(KnowledgeAuditEvent(
        actor_user_id=user.id,
        action="account_deleted",
        entity_type="account",
        entity_id=user.id,
        details=json.dumps({"workspace_count": len(owned_workspace_ids)}),
    ))
    db.delete(user)
    db.commit()
