from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from backend.app.db.migrations import migrate_legacy_knowledge_workspaces
from backend.app.models.knowledge import KnowledgeDocument, KnowledgeDocumentVersion
from backend.app.models.user import User
from backend.app.models.workspace import Workspace, WorkspaceMembership, WorkspaceSubscription
from backend.app.services import knowledge_vector_store


def test_legacy_knowledge_documents_are_assigned_to_uploader_workspace(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    User.__table__.create(engine)
    Workspace.__table__.create(engine)
    WorkspaceMembership.__table__.create(engine)
    WorkspaceSubscription.__table__.create(engine)
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE knowledge_documents ("
            "id VARCHAR(36) PRIMARY KEY, title VARCHAR(240) NOT NULL, "
            "description TEXT NOT NULL, category VARCHAR(100) NOT NULL, "
            "status VARCHAR(24) NOT NULL, uploaded_by VARCHAR(36) NOT NULL, "
            "created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"
        ))
    KnowledgeDocumentVersion.__table__.create(engine)

    user_id = "legacy-user"
    document_id = "legacy-document"
    version_id = "legacy-version"
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO users "
            "(id, email, hashed_password, full_name, is_active, created_at, updated_at) "
            "VALUES (:id, :email, :password, :name, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ), {
            "id": user_id,
            "email": "legacy@example.test",
            "password": "not-a-real-password",
            "name": "Legacy User",
        })
        connection.execute(text(
            "INSERT INTO knowledge_documents "
            "(id, title, description, category, status, uploaded_by, created_at, updated_at) "
            "VALUES (:id, 'Course notes', '', 'General', 'published', :user_id, "
            "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ), {"id": document_id, "user_id": user_id})
        connection.execute(text(
            "INSERT INTO knowledge_document_versions "
            "(id, document_id, version_number, original_filename, storage_key, sha256, "
            "media_type, status, page_count, uploaded_by, created_at) "
            "VALUES (:id, :document_id, 1, 'notes.pdf', 'storage-key', 'hash', "
            "'application/pdf', 'published', 1, :user_id, CURRENT_TIMESTAMP)"
        ), {"id": version_id, "document_id": document_id, "user_id": user_id})

    migrated_versions = []

    class FakeVectorStore:
        def set_version_workspace(self, migrated_version_id, workspace_id):
            migrated_versions.append((migrated_version_id, workspace_id))

    monkeypatch.setattr(knowledge_vector_store, "KnowledgeVectorStore", FakeVectorStore)
    migrate_legacy_knowledge_workspaces(engine)

    with Session(engine) as db:
        document = db.query(KnowledgeDocument).filter_by(id=document_id).one()
        workspace = db.query(Workspace).filter_by(id=document.workspace_id).one()
        assert workspace.created_by == user_id
        assert workspace.is_personal
        assert db.query(WorkspaceMembership).filter_by(
            workspace_id=workspace.id,
            user_id=user_id,
            role="owner",
        ).one()
        assert db.query(WorkspaceSubscription).filter_by(
            workspace_id=workspace.id,
            plan_code="free",
        ).one()

    assert migrated_versions == [(version_id, workspace.id)]
    assert "workspace_id" in {column["name"] for column in inspect(engine).get_columns("knowledge_documents")}
    migrate_legacy_knowledge_workspaces(engine)
    assert migrated_versions == [(version_id, workspace.id)]
    engine.dispose()
