import pytest
from datetime import datetime, timezone, timedelta

from backend.app.core.security import encrypt_token
from backend.app.models.integration import EmailMetadataCache, OAuthIntegration
from backend.app.models.integration import OAuthState


def _add_gmail_records(db, user_id, access_token, refresh_token=None):
    db.add(OAuthIntegration(
        user_id=user_id,
        provider="google_gmail",
        encrypted_access_token=encrypt_token(access_token),
        encrypted_refresh_token=encrypt_token(refresh_token) if refresh_token else None,
        email_address="student@example.test",
    ))
    db.add(EmailMetadataCache(
        user_id=user_id,
        message_id="cached-message",
        sender="sender@example.test",
        subject="Cached message",
        internal_date=datetime.now(timezone.utc),
    ))
    db.commit()


def test_gmail_disconnect_revokes_refresh_token_and_deletes_local_data(
    client, auth_headers, test_user, db, monkeypatch
):
    from backend.app.services import gmail_service

    _add_gmail_records(db, test_user.id, "access-token", "refresh-token")
    calls = []

    class FakeResponse:
        status_code = 200

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 5.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, data):
            calls.append((url, data))
            return FakeResponse()

    monkeypatch.setattr(gmail_service.httpx, "AsyncClient", FakeClient)
    response = client.post("/api/v1/gmail/disconnect", headers=auth_headers)

    assert response.status_code == 200
    assert calls == [(
        "https://oauth2.googleapis.com/revoke",
        {"token": "refresh-token"},
    )]
    assert db.query(OAuthIntegration).filter_by(user_id=test_user.id).first() is None
    assert db.query(EmailMetadataCache).filter_by(user_id=test_user.id).count() == 0


def test_gmail_disconnect_revocation_failure_still_clears_local_data(
    client, auth_headers, test_user, db, monkeypatch
):
    from backend.app.services import gmail_service

    _add_gmail_records(db, test_user.id, "access-token")

    class FakeResponse:
        status_code = 503

    class FakeClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, data):
            assert data == {"token": "access-token"}
            return FakeResponse()

    monkeypatch.setattr(gmail_service.httpx, "AsyncClient", FakeClient)
    response = client.post("/api/v1/gmail/disconnect", headers=auth_headers)

    assert response.status_code == 200
    assert db.query(OAuthIntegration).filter_by(user_id=test_user.id).first() is None
    assert db.query(EmailMetadataCache).filter_by(user_id=test_user.id).count() == 0


def test_gmail_disconnect_skips_revocation_for_mock_tokens(
    client, auth_headers, test_user, db, monkeypatch
):
    from backend.app.services import gmail_service

    _add_gmail_records(db, test_user.id, "mock_access_token_test", "mock_refresh_token_test")

    def unexpected_client(**kwargs):
        raise AssertionError("Mock Gmail tokens must not trigger an external request.")

    monkeypatch.setattr(gmail_service.httpx, "AsyncClient", unexpected_client)
    response = client.post("/api/v1/gmail/disconnect", headers=auth_headers)

    assert response.status_code == 200
    assert db.query(OAuthIntegration).filter_by(user_id=test_user.id).first() is None


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


def test_gmail_mock_oauth_is_allowed_outside_production(client, auth_headers, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "testing")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "")
    response = client.get("/api/v1/gmail/auth-url", headers=auth_headers)
    assert response.status_code == 200
    assert "mock_google_code" in response.json()["auth_url"]


def test_gmail_mock_oauth_is_disabled_in_production(client, auth_headers, test_user, db, monkeypatch):
    from backend.app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "")

    url_response = client.get("/api/v1/gmail/auth-url", headers=auth_headers)
    assert url_response.status_code == 503
    assert "Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET" in url_response.json()["detail"]

    db.add(OAuthState(
        user_id=test_user.id,
        state_token="valid-state-for-production-test",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    ))
    db.commit()
    callback = client.post(
        "/api/v1/gmail/callback",
        json={"code": "mock_google_code_12345", "state": "valid-state-for-production-test"},
        headers=auth_headers,
    )
    assert callback.status_code == 503
    assert db.query(OAuthIntegration).filter_by(user_id=test_user.id).first() is None
    assert db.query(EmailMetadataCache).filter_by(user_id=test_user.id).count() == 0


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
