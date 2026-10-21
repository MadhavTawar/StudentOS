from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.models.knowledge import KnowledgeDocument
from backend.app.models.user import User
from backend.app.models.workspace import Workspace
from backend.app.services.workspace_service import create_personal_workspace


def migrate_legacy_knowledge_workspaces(engine: Engine) -> None:
    inspector = inspect(engine)
    if not inspector.has_table("knowledge_documents"):
        return

    column_names = {column["name"] for column in inspector.get_columns("knowledge_documents")}
    column_added = "workspace_id" not in column_names
    if column_added:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE knowledge_documents "
                "ADD COLUMN workspace_id VARCHAR(36) REFERENCES workspaces(id) ON DELETE CASCADE"
            ))

    with engine.begin() as connection:
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_knowledge_documents_workspace_id "
            "ON knowledge_documents (workspace_id)"
        ))
        connection.execute(text(
            "CREATE TABLE IF NOT EXISTS app_schema_migrations "
            "(migration_key VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP NOT NULL)"
        ))

    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db: Session = session_factory()
    try:
        for user in db.query(User).all():
            create_personal_workspace(db, user)
        db.flush()
        documents = db.query(KnowledgeDocument).filter(KnowledgeDocument.workspace_id.is_(None)).all()
        for document in documents:
            workspace = (
                db.query(Workspace)
                .filter(
                    Workspace.is_personal.is_(True),
                    Workspace.created_by == document.uploaded_by,
                )
                .first()
            )
            if workspace is not None:
                document.workspace_id = workspace.id
        db.commit()
        with engine.connect() as connection:
            vector_migration_applied = connection.execute(
                text(
                    "SELECT 1 FROM app_schema_migrations "
                    "WHERE migration_key = 'workspace_knowledge_index_v1'"
                )
            ).first() is not None
        if not vector_migration_applied:
            version_workspaces = (
                db.query(KnowledgeDocument.id, KnowledgeDocument.workspace_id)
                .filter(KnowledgeDocument.workspace_id.is_not(None))
                .all()
            )
            if version_workspaces:
                from backend.app.models.knowledge import KnowledgeDocumentVersion
                from backend.app.services.knowledge_vector_store import KnowledgeVectorStore

                vector_store = KnowledgeVectorStore()
                for document_id, workspace_id in version_workspaces:
                    version_ids = (
                        db.query(KnowledgeDocumentVersion.id)
                        .filter(KnowledgeDocumentVersion.document_id == document_id)
                        .all()
                    )
                    for (version_id,) in version_ids:
                        vector_store.set_version_workspace(version_id, workspace_id)
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "INSERT INTO app_schema_migrations (migration_key, applied_at) "
                        "VALUES ('workspace_knowledge_index_v1', CURRENT_TIMESTAMP)"
                    )
                )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
