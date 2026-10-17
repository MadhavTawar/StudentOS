from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class KnowledgeAccessResponse(BaseModel):
    is_admin: bool
    can_manage_documents: bool
    ai_provider: str
    admin_bootstrap_available: bool


class BootstrapAdminRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)


class DocumentVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version_number: int
    original_filename: str
    status: str
    page_count: int
    created_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class KnowledgeDocumentResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    status: str
    created_at: datetime
    updated_at: datetime
    versions: list[DocumentVersionResponse] = Field(default_factory=list)


class KnowledgeLibraryItem(BaseModel):
    id: str
    title: str
    description: str
    category: str
    version_id: str
    version_number: int
    page_count: int
    published_at: datetime


class DocumentManagerRequest(BaseModel):
    email: EmailStr


class DocumentManagerResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str = "document_manager"
    granted_at: datetime


class KnowledgeChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)


class KnowledgeCitation(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    version_id: str
    version_number: int
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    excerpt: str


class KnowledgeChatResponse(BaseModel):
    answer: str
    insufficient_evidence: bool
    citations: list[KnowledgeCitation] = Field(default_factory=list)
