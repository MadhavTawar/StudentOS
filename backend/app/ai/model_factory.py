"""
LangChain chat model factory for StudentOS.

Provides a single, configurable LLM entry point backed by LangChain chat models.
Supports:
- "offline": a deterministic fake chat model (no network, no secrets) for tests
  and local-only operation.
- "groq": LangChain's ChatOpenAI pointed at Groq's OpenAI-compatible endpoint
  (base_url + api_key from settings).

All model calls go through the backend; no secrets or privileged operations
are exposed to the browser.
"""

from typing import Any, Optional

from fastapi import HTTPException, status
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from backend.app.core.config import settings
from backend.app.core.logging import logger


class _OfflineChatModel(BaseChatModel):
    """
    Deterministic fake chat model for offline mode.

    Echoes back a canned, safe response derived from the last user message so
    that the application can be exercised end-to-end without any external
    provider or network access.
    """

    @property
    def _llm_type(self) -> str:
        return "offline"

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        from langchain_core.outputs import ChatGeneration, ChatResult

        last_user = ""
        for m in reversed(messages):
            if m.type == "human":
                last_user = m.content
                break

        reply = (
            "I am running in offline mode. No external AI provider is "
            f"configured, so I cannot generate a real response to: "
            f"'{last_user[:100]}'.\n\n"
            "Switch AI_PROVIDER=groq and set GROQ_API_KEY to use the "
            "configured Groq model, or keep offline mode for local-only "
            "operation."
        )
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=reply))])


def get_chat_model() -> BaseChatModel:
    """
    Return the configured LangChain chat model.

    Reads settings.AI_PROVIDER:
    - "offline" -> deterministic fake model (no network, no secrets)
    - "groq"    -> LangChain ChatOpenAI pointed at Groq's OpenAI-compatible
                   endpoint (base_url + api_key from settings)

    Raises HTTPException(503) if the provider is unknown or misconfigured.
    """
    provider = settings.AI_PROVIDER

    if provider == "offline":
        return _OfflineChatModel()

    if provider == "groq":
        from langchain_openai import ChatOpenAI

        if not settings.GROQ_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI_PROVIDER=groq requires GROQ_API_KEY to be set.",
            )
        return ChatOpenAI(
            model=settings.GROQ_MODEL,
            openai_api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_API_URL,
            temperature=0.1,
            timeout=30.0,
            max_retries=2,
        )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Unsupported AI_PROVIDER: {provider}. Use 'offline' or 'groq'.",
    )


__all__ = ["get_chat_model", "BaseChatModel"]
