import mimetypes

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.api.deps import check_rate_limit, get_current_user, get_db
from backend.app.api.workspace_deps import require_current_workspace
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.schemas.knowledge import (
    KnowledgeAccessResponse,
    KnowledgeChatRequest,
    KnowledgeChatResponse,
    KnowledgeDocumentResponse,
    KnowledgeLibraryItem,
)
from backend.app.services import knowledge_service

router = APIRouter()


@router.get("/access", response_model=KnowledgeAccessResponse)
def get_knowledge_access(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    manager_access = knowledge_service.can_manage_documents(db, current_user, workspace.id)
    return KnowledgeAccessResponse(
        is_admin=knowledge_service.is_workspace_admin(db, current_user, workspace.id),
        can_manage_documents=manager_access,
        ai_provider=settings.AI_PROVIDER,
    )


@router.get("/library", response_model=list[KnowledgeLibraryItem])
def get_published_library(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    return knowledge_service.list_published_library(db, workspace.id)


@router.post("/chat", response_model=KnowledgeChatResponse)
async def chat_with_knowledge(
    request: KnowledgeChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    check_rate_limit(f"knowledge_chat_{current_user.id}", max_attempts=30, window_seconds=60)
    return await knowledge_service.answer_question(db, request.question, workspace.id)


@router.get("/documents", response_model=list[KnowledgeDocumentResponse])
def get_managed_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    knowledge_service.require_document_manager(db, current_user, workspace.id)
    return [
        knowledge_service.serialize_document(document)
        for document in knowledge_service.list_documents(db, workspace.id)
    ]


@router.post(
    "/documents",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_document(
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=240),
    description: str = Form(""),
    category: str = Form("General", max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    knowledge_service.require_document_manager(db, current_user, workspace.id)
    data = file.file.read(settings.KNOWLEDGE_MAX_UPLOAD_BYTES + 1)
    document = knowledge_service.upload_document(
        db,
        current_user,
        data,
        file.filename or "",
        workspace_id=workspace.id,
        title=title,
        description=description,
        category=category,
    )
    return knowledge_service.serialize_document(document)


@router.post(
    "/documents/{document_id}/versions",
    response_model=KnowledgeDocumentResponse,
)
def upload_document_version(
    document_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    knowledge_service.require_document_manager(db, current_user, workspace.id)
    data = file.file.read(settings.KNOWLEDGE_MAX_UPLOAD_BYTES + 1)
    document = knowledge_service.upload_document(
        db,
        current_user,
        data,
        file.filename or "",
        workspace_id=workspace.id,
        document_id=document_id,
    )
    return knowledge_service.serialize_document(document)


@router.post(
    "/documents/{document_id}/versions/{version_id}/publish",
    response_model=KnowledgeDocumentResponse,
)
def publish_document_version(
    document_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    knowledge_service.require_document_manager(db, current_user, workspace.id)
    document = knowledge_service.publish_version(db, current_user, document_id, version_id, workspace.id)
    return knowledge_service.serialize_document(document)


@router.post("/documents/{document_id}/archive", response_model=KnowledgeDocumentResponse)
def archive_workspace_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    knowledge_service.require_document_manager(db, current_user, workspace.id)
    document = knowledge_service.archive_document(db, current_user, document_id, workspace.id)
    return knowledge_service.serialize_document(document)


@router.get(
    "/documents/{document_id}/versions/{version_id}/download",
    response_class=FileResponse,
)
def download_document_version(
    document_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    workspace: Workspace = Depends(require_current_workspace),
):
    path, filename = knowledge_service.download_version(
        db, current_user, document_id, version_id, workspace.id
    )
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return FileResponse(
        path=path,
        media_type=media_type,
        filename=filename,
        headers={"X-Content-Type-Options": "nosniff"},
    )
