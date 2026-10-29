import secrets
import warnings
from typing import List
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    PROJECT_NAME: str = "StudentOS"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # "development" | "testing" | "production"
    
    # Secret key for JWT session tokens
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Token Encryption Key for OAuth credentials (Fernet key - 32 url-safe base64-encoded bytes)
    ENCRYPTION_KEY: str = ""
    
    # SQLite local database by default, direct upgrade path to PostgreSQL
    DATABASE_URL: str = "sqlite:///./studentos.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Google OAuth (Gmail read-only integration)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/oauth/callback"
    GMAIL_READONLY_SCOPE: str = "https://www.googleapis.com/auth/gmail.readonly"

    # AI Configuration ("offline" or "groq")
    AI_PROVIDER: str = "offline"
    GROQ_API_KEY: str = ""
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    OPENAI_API_KEY: str = ""
    HUGGINGFACE_API_KEY: str = ""
    GMAIL_FETCH_BODY_ON_EXTRACT: bool = False

    # Outbound email notifications. Keep the mock provider as the safe default
    # for development and tests; production must opt into Resend explicitly.
    EMAIL_PROVIDER: str = "mock"  # "mock" or "resend"
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = ""
    EMAIL_REQUEST_TIMEOUT_SECONDS: float = 10.0
    RESEND_API_URL: str = "https://api.resend.com/emails"

    # Workspace knowledge documents (local storage and local Chroma embeddings)
    KNOWLEDGE_STORAGE_DIR: str = "~/.studentos/knowledge"
    KNOWLEDGE_VECTOR_DIR: str = "~/.studentos/chroma"
    KNOWLEDGE_MAX_UPLOAD_BYTES: int = 15 * 1024 * 1024
    KNOWLEDGE_MAX_PAGES: int = 300
    KNOWLEDGE_MAX_EXTRACTED_CHARS: int = 1_000_000
    KNOWLEDGE_CHUNK_SIZE: int = 1200
    KNOWLEDGE_CHUNK_OVERLAP: int = 160
    KNOWLEDGE_MAX_DISTANCE: float = 0.65
    KNOWLEDGE_EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    KNOWLEDGE_WARMUP_ENABLED: bool = True
    
    # Rate Limiting & Safety
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_WINDOW_SECONDS: int = 60
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_security_keys(self):
        if self.ENVIRONMENT.lower() == "production":
            if len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must contain at least 32 characters in production.")
            if not self.ENCRYPTION_KEY:
                raise ValueError("ENCRYPTION_KEY must be configured in production.")

        if not self.SECRET_KEY:
            self.SECRET_KEY = secrets.token_urlsafe(48)
            warnings.warn(
                "SECRET_KEY is unset; generated a temporary key for this process. "
                "Configure a persistent key in .env for local development.",
                RuntimeWarning,
                stacklevel=2,
            )

        if not self.ENCRYPTION_KEY:
            self.ENCRYPTION_KEY = Fernet.generate_key().decode()
            warnings.warn(
                "ENCRYPTION_KEY is unset; generated a temporary key for this process. "
                "Configure a persistent key in .env before storing Gmail credentials.",
                RuntimeWarning,
                stacklevel=2,
            )

        try:
            Fernet(self.ENCRYPTION_KEY.encode())
        except (TypeError, ValueError) as exc:
            raise ValueError("ENCRYPTION_KEY must be a valid Fernet key.") from exc

        return self


settings = Settings()
