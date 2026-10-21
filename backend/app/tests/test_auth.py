import pytest
from datetime import datetime, timezone
from backend.app.core.security import decode_access_token
from backend.app.models.user import UserSession


def test_user_registration(client, test_password):
    res = client.post("/api/v1/auth/register", json={
        "email": "newstudent@university.edu",
        "password": test_password,
        "full_name": "New Student"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "newstudent@university.edu"
    assert data["full_name"] == "New Student"
    assert "hashed_password" not in data


def test_duplicate_user_registration_fails(client, test_user, test_password):
    res = client.post("/api/v1/auth/register", json={
        "email": test_user.email,
        "password": test_password,
        "full_name": "Imposter"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_user_login_success(client, test_user, test_password):
    res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": test_password
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" not in data
    assert data["user"]["email"] == test_user.email
    cookie = res.headers["set-cookie"].lower()
    assert "studentos_session=" in cookie
    assert "httponly" in cookie


def test_login_session_is_accepted_and_logout_revokes_token(client, test_user, test_password, db):
    login = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": test_password,
    })
    assert login.status_code == 200
    token = login.cookies["studentos_session"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200

    logout = client.post("/api/v1/auth/logout", headers=headers)
    assert logout.status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    payload = decode_access_token(token)
    assert db.query(UserSession).filter_by(session_token=payload["jti"]).first() is None


def test_expired_session_is_rejected(client, test_user, test_password, db):
    login = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": test_password,
    })
    token = login.cookies["studentos_session"]
    payload = decode_access_token(token)
    session = db.query(UserSession).filter_by(session_token=payload["jti"]).one()
    session.expires_at = datetime(2000, 1, 1, tzinfo=timezone.utc)
    db.commit()

    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_cookie_authenticated_write_requires_trusted_origin(client, test_user, test_password):
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": test_password
    })
    assert login_res.status_code == 200

    blocked = client.post("/api/v1/tasks/", json={"title": "Cross-origin attempt"})
    assert blocked.status_code == 403

    allowed = client.post(
        "/api/v1/tasks/",
        json={"title": "Allowed same-origin task"},
        headers={"Origin": "http://localhost:5173"},
    )
    assert allowed.status_code == 201


def test_user_login_invalid_password(client, test_user, test_password):
    res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": f"{test_password}x"
    })
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]


def test_get_current_user_me(client, auth_headers, test_user):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name


def test_unauthenticated_request_fails(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
