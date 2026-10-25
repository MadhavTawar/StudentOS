"""
Tests for the LangChain AI integration (Phase 6).

These tests verify the LangChain model factory and retriever wrapper using
a fake/offline model. No network calls are made; all tests run with
AI_PROVIDER=offline.

Tests are skipped when langchain_core is not installed.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.services.ai_service import AIService

try:
    from backend.app.ai.model_factory import _OfflineChatModel, get_chat_model
    from langchain_core.language_models.chat_models import BaseChatModel
    _LANGCHAIN_AVAILABLE = True
except ImportError:
    _OfflineChatModel = None
    get_chat_model = None
    BaseChatModel = None
    _LANGCHAIN_AVAILABLE = False


@pytest.fixture(autouse=True)
def _offline_provider(monkeypatch):
    """Force the offline provider for all tests in this module."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "offline")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")


def test_offline_model_is_fake_chat_model():
    """The offline provider should return a LangChain BaseChatModel that
    does not make any network calls."""
    if not _LANGCHAIN_AVAILABLE:
        pytest.skip("langchain_core not installed")
    model = get_chat_model()
    assert isinstance(model, BaseChatModel)
    assert model._llm_type == "offline"


def test_groq_provider_requires_api_key(client, auth_headers, monkeypatch):
    """Groq provider should fail with 503 when no API key is configured."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")

    response = client.post(
        "/api/v1/ai/assistant/chat",
        json={"message": "What should I work on today?"},
        headers=auth_headers,
    )
    assert response.status_code == 503
    assert "GROQ_API_KEY" in response.json()["detail"]


def test_groq_network_error_returns_503(client, auth_headers, monkeypatch):
    """A network error from Groq should return 503, not crash."""
    from backend.app.services import ai_service
    import httpx

    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(settings, "GROQ_API_URL", "https://api.groq.example/openai/v1/chat/completions")

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return None

        async def post(self, *a, **k):
            raise httpx.ConnectError("network unreachable")

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", _FakeClient)

    response = client.post(
        "/api/v1/ai/assistant/chat",
        json={"message": "What should I work on today?"},
        headers=auth_headers,
    )
    assert response.status_code == 503
    assert "could not reach" in response.json()["detail"].lower() or "unreachable" in response.json()["detail"].lower()


def test_groq_malformed_response_returns_502(client, auth_headers, monkeypatch):
    """A malformed JSON response from Groq should return 502."""
    from backend.app.services import ai_service

    monkeypatch.setattr(settings, "AI_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(settings, "GROQ_API_URL", "https://api.groq.example/openai/v1/chat/completions")

    class _FakeResponse:
        status_code = 200

        def json(self):
            raise ValueError("not valid JSON")

    class _FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return None

        async def post(self, *a, **k):
            return _FakeResponse()

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", _FakeClient)

    response = client.post(
        "/api/v1/ai/assistant/chat",
        json={"message": "What should I work on today?"},
        headers=auth_headers,
    )
    assert response.status_code == 502
    assert "invalid response" in response.json()["detail"].lower()
