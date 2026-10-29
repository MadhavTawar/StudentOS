import httpx
import pytest

from backend.app.core.config import settings
from backend.app.services.email_notification_service import (
    EmailProviderConfigurationError,
    EmailProviderDeliveryError,
    MockEmailNotificationProvider,
    ResendEmailNotificationProvider,
    get_email_notification_provider,
)


@pytest.mark.asyncio
async def test_mock_provider_records_delivery_without_network():
    provider = MockEmailNotificationProvider()

    result = await provider.send(
        recipient="student@example.test",
        subject="Upcoming exam",
        text="Your exam is tomorrow.",
    )

    assert result.provider == "mock"
    assert result.status == "accepted"
    assert provider.sent[0]["recipient"] == "student@example.test"


@pytest.mark.asyncio
async def test_resend_provider_rejects_missing_configuration():
    provider = ResendEmailNotificationProvider(api_key="", from_email="")

    with pytest.raises(EmailProviderConfigurationError):
        await provider.send(
            recipient="student@example.test",
            subject="Test",
            text="Test",
        )


@pytest.mark.asyncio
async def test_resend_provider_sends_expected_payload(monkeypatch):
    calls = []

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id": "resend-message-id"}

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 3.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, url, headers, json):
            calls.append((url, headers, json))
            return FakeResponse()

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    provider = ResendEmailNotificationProvider(
        api_key="test-key",
        from_email="StudentOS <notify@example.test>",
        timeout_seconds=3.0,
    )
    provider.api_url = "https://resend.example.test/emails"

    result = await provider.send(
        recipient="student@example.test",
        subject="Upcoming exam",
        text="Your exam is tomorrow.",
    )

    assert result.provider_message_id == "resend-message-id"
    assert calls[0][0] == "https://resend.example.test/emails"
    assert calls[0][1]["Authorization"] == "Bearer test-key"
    assert calls[0][2]["to"] == ["student@example.test"]


@pytest.mark.asyncio
async def test_resend_provider_maps_request_failure(monkeypatch):
    class FakeClient:
        def __init__(self, timeout):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def post(self, *args, **kwargs):
            raise httpx.ConnectError("unavailable")

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    provider = ResendEmailNotificationProvider(api_key="test-key", from_email="notify@example.test")

    with pytest.raises(EmailProviderDeliveryError):
        await provider.send(
            recipient="student@example.test",
            subject="Test",
            text="Test",
        )


def test_provider_factory_defaults_to_mock(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "mock")
    assert isinstance(get_email_notification_provider(), MockEmailNotificationProvider)


def test_provider_factory_rejects_unknown_provider(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "unknown")
    with pytest.raises(EmailProviderConfigurationError):
        get_email_notification_provider()
