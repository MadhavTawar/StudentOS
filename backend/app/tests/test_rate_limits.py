from backend.app.api import deps
from backend.app.api.deps import check_rate_limit


def test_rate_limit_returns_429_for_authenticated_assistant(client, auth_headers):
    for _ in range(30):
        response = client.post(
            "/api/v1/ai/assistant/chat",
            json={"message": "What should I work on?"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    limited = client.post(
        "/api/v1/ai/assistant/chat",
        json={"message": "What should I work on?"},
        headers=auth_headers,
    )
    assert limited.status_code == 429


def test_rate_limiter_evicts_expired_keys(monkeypatch):
    deps._rate_limit_records.clear()
    deps._rate_limit_windows.clear()
    clock = [100.0]
    monkeypatch.setattr(deps.time, "time", lambda: clock[0])

    check_rate_limit("expired-key", max_attempts=2, window_seconds=60)
    assert "expired-key" in deps._rate_limit_records

    clock[0] = 161.0
    check_rate_limit("new-key", max_attempts=2, window_seconds=60)
    assert "expired-key" not in deps._rate_limit_records
