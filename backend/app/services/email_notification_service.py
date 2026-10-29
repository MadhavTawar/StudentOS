"""Outbound email notification providers.

This module deliberately has no dependency on task or reminder persistence.
The reminder service can use the provider while retaining ownership of
notification records and delivery state.
"""

from dataclasses import dataclass
from typing import List, Optional, Protocol

import httpx

from backend.app.core.config import settings
from backend.app.core.logging import logger


class EmailProviderError(RuntimeError):
    """Base error for expected email provider failures."""


class EmailProviderConfigurationError(EmailProviderError):
    """Raised when the selected provider is not configured safely."""


class EmailProviderDeliveryError(EmailProviderError):
    """Raised when the provider rejects or cannot deliver a request."""


@dataclass(frozen=True)
class EmailDeliveryResult:
    provider: str
    status: str
    provider_message_id: Optional[str] = None


class EmailNotificationProvider(Protocol):
    async def send(
        self,
        *,
        recipient: str,
        subject: str,
        text: str,
        html: Optional[str] = None,
    ) -> EmailDeliveryResult:
        ...


class MockEmailNotificationProvider:
    """Non-network provider for local development and automated tests."""

    def __init__(self) -> None:
        self.sent: List[dict] = []

    async def send(
        self,
        *,
        recipient: str,
        subject: str,
        text: str,
        html: Optional[str] = None,
    ) -> EmailDeliveryResult:
        self.sent.append({
            "recipient": recipient,
            "subject": subject,
            "text": text,
            "html": html,
        })
        return EmailDeliveryResult(
            provider="mock",
            status="accepted",
            provider_message_id=f"mock-{len(self.sent)}",
        )


class ResendEmailNotificationProvider:
    """Resend REST API provider using the project's existing httpx dependency."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        from_email: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.RESEND_API_KEY
        self.from_email = from_email if from_email is not None else settings.RESEND_FROM_EMAIL
        self.api_url = settings.RESEND_API_URL
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.EMAIL_REQUEST_TIMEOUT_SECONDS
        )

    def _validate_configuration(self) -> None:
        if not self.api_key or not self.from_email:
            raise EmailProviderConfigurationError(
                "Resend email delivery requires RESEND_API_KEY and RESEND_FROM_EMAIL."
            )
        if self.timeout_seconds <= 0:
            raise EmailProviderConfigurationError(
                "EMAIL_REQUEST_TIMEOUT_SECONDS must be greater than zero."
            )

    async def send(
        self,
        *,
        recipient: str,
        subject: str,
        text: str,
        html: Optional[str] = None,
    ) -> EmailDeliveryResult:
        self._validate_configuration()
        if not recipient or not subject or not text:
            raise EmailProviderDeliveryError(
                "Email recipient, subject, and text content are required."
            )

        payload = {
            "from": self.from_email,
            "to": [recipient],
            "subject": subject,
            "text": text,
        }
        if html is not None:
            payload["html"] = html

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.RequestError as exc:
            logger.error("Resend email request failed: %s", type(exc).__name__)
            raise EmailProviderDeliveryError(
                "Could not reach the configured email provider."
            ) from exc

        if response.status_code < 200 or response.status_code >= 300:
            logger.error("Resend email request rejected with status %s", response.status_code)
            raise EmailProviderDeliveryError(
                "The configured email provider rejected the notification."
            )

        try:
            provider_message_id = response.json().get("id")
        except ValueError:
            provider_message_id = None

        logger.info("Email notification accepted by Resend.")
        return EmailDeliveryResult(
            provider="resend",
            status="accepted",
            provider_message_id=provider_message_id,
        )


def get_email_notification_provider() -> EmailNotificationProvider:
    provider = settings.EMAIL_PROVIDER.strip().lower()
    if provider == "mock":
        return MockEmailNotificationProvider()
    if provider == "resend":
        return ResendEmailNotificationProvider()
    raise EmailProviderConfigurationError(
        "EMAIL_PROVIDER must be either 'mock' or 'resend'."
    )


__all__ = [
    "EmailDeliveryResult",
    "EmailNotificationProvider",
    "EmailProviderConfigurationError",
    "EmailProviderDeliveryError",
    "MockEmailNotificationProvider",
    "ResendEmailNotificationProvider",
    "get_email_notification_provider",
]
