import pytest


def test_user_registration(client):
    res = client.post("/api/v1/auth/register", json={
        "email": "newstudent@university.edu",
        "password": "SecurePassword123!",
        "full_name": "New Student"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "newstudent@university.edu"
    assert data["full_name"] == "New Student"
    assert "hashed_password" not in data


def test_duplicate_user_registration_fails(client, test_user):
    res = client.post("/api/v1/auth/register", json={
        "email": test_user.email,
        "password": "AnotherPassword123!",
        "full_name": "Imposter"
    })
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_user_login_success(client, test_user):
    res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "SuperSecret123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" not in data
    assert data["user"]["email"] == test_user.email
    cookie = res.headers["set-cookie"].lower()
    assert "studentos_session=" in cookie
    assert "httponly" in cookie


def test_cookie_authenticated_write_requires_trusted_origin(client, test_user):
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "SuperSecret123!"
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


def test_user_login_invalid_password(client, test_user):
    res = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword999!"
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
