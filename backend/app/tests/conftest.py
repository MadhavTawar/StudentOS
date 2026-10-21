import pytest
import secrets
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.core.config import settings
from backend.app.db.session import Base, get_db
from backend.app import main as main_module
from backend.app.main import app
from backend.app.models.user import User
from backend.app.models.workspace import WorkspaceMembership
from backend.app.services.workspace_service import create_personal_workspace
from backend.app.services.workspace_service import create_organization_workspace
from backend.app.core.security import hash_password, create_access_token

# Test In-Memory SQLite Engine
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator:
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db, monkeypatch) -> Generator:
    monkeypatch.setattr(main_module, "engine", engine)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_password() -> str:
    return secrets.token_urlsafe(24)


@pytest.fixture(scope="function")
def test_user(db, test_password) -> User:
    user = User(
        email="student@university.edu",
        hashed_password=hash_password(test_password),
        full_name="Alex Student",
        is_active=True
    )
    db.add(user)
    db.flush()
    create_personal_workspace(db, user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def second_user(db) -> User:
    user = User(
        email="other@university.edu",
        hashed_password=hash_password("AnotherSecret123!"),
        full_name="Bob Peer",
        is_active=True
    )
    db.add(user)
    db.flush()
    create_personal_workspace(db, user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(test_user) -> dict:
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def second_auth_headers(second_user) -> dict:
    token = create_access_token(subject=second_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def shared_workspace_headers(db, test_user, second_user, auth_headers, second_auth_headers) -> tuple[dict, dict]:
    workspace = create_organization_workspace(db, test_user, "Shared study group")
    db.add(WorkspaceMembership(workspace_id=workspace.id, user_id=second_user.id, role="member"))
    db.commit()
    return (
        {**auth_headers, "X-Workspace-ID": workspace.id},
        {**second_auth_headers, "X-Workspace-ID": workspace.id},
    )
