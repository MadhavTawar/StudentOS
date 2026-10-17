import mimetypes

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.api.deps import check_rate_limit, get_current_user, get_db
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.schemas.knowledge import (
    BootstrapAdminRequest,
    DocumentManagerRequest,
    DocumentManagerResponse,
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
):
    manager_access = knowledge_service.can_manage_documents(db, current_user)
    return KnowledgeAccessResponse(
        is_admin=knowledge_service.is_institute_admin(db, current_user),
        can_manage_documents=manager_access,
        ai_provider=settings.AI_PROVIDER,
        admin_bootstrap_available=knowledge_service.admin_bootstrap_available(db),
    )


@router.post("/staff/bootstrap", response_model=KnowledgeAccessResponse)
def bootstrap_institute_administrator(
    request: BootstrapAdminRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(
        f"knowledge_admin_bootstrap_{current_user.id}",
        max_attempts=5,
        window_seconds=300,
    )
    knowledge_service.bootstrap_institute_admin(db, current_user, request.token)
    return KnowledgeAccessResponse(
        is_admin=knowledge_service.is_institute_admin(db, current_user),
        can_manage_documents=knowledge_service.can_manage_documents(db, current_user),
        ai_provider=settings.AI_PROVIDER,
        admin_bootstrap_available=knowledge_service.admin_bootstrap_available(db),
    )


@router.get("/library", response_model=list[KnowledgeLibraryItem])
def get_published_library(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return knowledge_service.list_published_library(db)


@router.post("/chat", response_model=KnowledgeChatResponse)
async def chat_with_knowledge(
    request: KnowledgeChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await knowledge_service.answer_question(db, request.question)


@router.get("/documents", response_model=list[KnowledgeDocumentResponse])
def get_managed_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    knowledge_service.require_document_manager(db, current_user)
    return [
        knowledge_service.serialize_document(document)
        for document in knowledge_service.list_documents(db)
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
):
    knowledge_service.require_document_manager(db, current_user)
    data = file.file.read(settings.KNOWLEDGE_MAX_UPLOAD_BYTES + 1)
    document = knowledge_service.upload_document(
        db,
        current_user,
        data,
        file.filename or "",
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
):
    knowledge_service.require_document_manager(db, current_user)
    data = file.file.read(settings.KNOWLEDGE_MAX_UPLOAD_BYTES + 1)
    document = knowledge_service.upload_document(
        db,
        current_user,
        data,
        file.filename or "",
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
):
    knowledge_service.require_document_manager(db, current_user)
    document = knowledge_service.publish_version(db, current_user, document_id, version_id)
    return knowledge_service.serialize_document(document)


@router.post("/documents/{document_id}/archive", response_model=KnowledgeDocumentResponse)
def archive_institute_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    knowledge_service.require_document_manager(db, current_user)
    document = knowledge_service.archive_document(db, current_user, document_id)
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
):
    path, filename = knowledge_service.download_version(db, current_user, document_id, version_id)
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return FileResponse(
        path=path,
        media_type=media_type,
        filename=filename,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.get("/staff/document-managers", response_model=list[DocumentManagerResponse])
def get_document_managers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    knowledge_service.require_institute_admin(db, current_user)
    return knowledge_service.list_document_managers(db)


@router.post(
    "/staff/document-managers",
    response_model=DocumentManagerResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_document_manager(
    request: DocumentManagerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    knowledge_service.require_institute_admin(db, current_user)
    return knowledge_service.grant_document_manager(db, current_user, request.email)


@router.delete("/staff/document-managers/{email}", status_code=status.HTTP_204_NO_CONTENT)
def remove_document_manager(
    email: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    knowledge_service.require_institute_admin(db, current_user)
    knowledge_service.revoke_document_manager(db, current_user, email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
