import pytest


def test_gmail_auth_url_rejects_partial_google_configuration(client, auth_headers, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "configured-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "")

    res = client.get("/api/v1/gmail/auth-url", headers=auth_headers)
    assert res.status_code == 503
    assert "Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET" in res.json()["detail"]


def test_gmail_mock_code_rejected_when_google_is_configured(client, auth_headers, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "configured-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "configured-client-secret")
    state_res = client.get("/api/v1/gmail/auth-url", headers=auth_headers)
    state = state_res.json()["state"]

    callback_res = client.post("/api/v1/gmail/callback", json={
        "code": "mock_test_code_123",
        "state": state
    }, headers=auth_headers)
    assert callback_res.status_code == 400
    assert "only accepted when Google OAuth is not configured" in callback_res.json()["detail"]


def test_gmail_callback_does_not_fabricate_account_when_profile_lookup_fails(
    client, auth_headers, monkeypatch
):
    from backend.app.core.config import settings
    from backend.app.services import gmail_service

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "configured-client-id")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "configured-client-secret")

    class FakeResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data

        def json(self):
            return self._data

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, *args, **kwargs):
            return FakeResponse(200, {"access_token": "access", "expires_in": 3600})

        async def get(self, *args, **kwargs):
            return FakeResponse(403, {})

    monkeypatch.setattr(gmail_service.httpx, "AsyncClient", lambda **kwargs: FakeClient())
    url_res = client.get("/api/v1/gmail/auth-url", headers=auth_headers)
    state = url_res.json()["state"]
    callback_res = client.post(
        "/api/v1/gmail/callback",
        json={"code": "google-auth-code", "state": state},
        headers=auth_headers,
    )

    assert callback_res.status_code == 502
    assert "Could not verify the authorized Gmail account" in callback_res.json()["detail"]


def test_gmail_auth_url_and_state_generation(client, auth_headers):
    res = client.get("/api/v1/gmail/auth-url", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "auth_url" in data
    assert "state" in data
    assert len(data["state"]) > 16


def test_gmail_callback_and_disconnect_flow(client, auth_headers, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "")

    # Get auth state
    url_res = client.get("/api/v1/gmail/auth-url", headers=auth_headers)
    state = url_res.json()["state"]

    # Exchange callback code
    cb_res = client.post("/api/v1/gmail/callback", json={
        "code": "mock_test_code_123",
        "state": state
    }, headers=auth_headers)
    assert cb_res.status_code == 200
    status_data = cb_res.json()
    assert status_data["is_connected"] is True
    assert status_data["email_address"] is not None

    # Fetch cached messages
    msgs_res = client.get("/api/v1/gmail/messages", headers=auth_headers)
    assert msgs_res.status_code == 200
    messages = msgs_res.json()["messages"]
    assert len(messages) > 0

    # Disconnect Gmail
    disc_res = client.post("/api/v1/gmail/disconnect", headers=auth_headers)
    assert disc_res.status_code == 200

    # Verify status is now disconnected
    stat_res = client.get("/api/v1/gmail/status", headers=auth_headers)
    assert stat_res.json()["is_connected"] is False
    msgs_after_disconnect = client.get("/api/v1/gmail/messages", headers=auth_headers)
    assert msgs_after_disconnect.json()["messages"] == []


def test_gmail_invalid_state_rejection(client, auth_headers):
    res = client.post("/api/v1/gmail/callback", json={
        "code": "fake_code",
        "state": "forged_nonexistent_state_token"
    }, headers=auth_headers)
    assert res.status_code == 400
    assert "Invalid or expired OAuth state" in res.json()["detail"]
