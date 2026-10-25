from backend.app.api import deps
from backend.app.api.deps import check_rate_limit
from backend.app.schemas.ai import AIAssistantResponse
from backend.app.services.ai_service import AIService


def test_rate_limit_returns_429_for_authenticated_assistant(client, auth_headers, monkeypatch):
    # Clear any rate-limiter state left by other tests (module-level dicts).
    deps._rate_limit_records.clear()
    deps._rate_limit_windows.clear()

    # Make the model operation instant so all requests happen within the
    # 60-second rate-limit window. The actual rate-limiting mechanism still
    # runs for real, and authentication remains enabled.
    async def _fake_chat_with_assistant(db, user_id, user_message):
        return AIAssistantResponse(
            reply="Instant test reply",
            context_summary={"tasks_count": 0, "deadlines_count": 0},
            provider="offline",
        )

    monkeypatch.setattr(AIService, "chat_with_assistant", staticmethod(_fake_chat_with_assistant))

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
