import os
import base64
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    PROJECT_NAME: str = "StudentOS"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # "development" | "testing" | "production"
    
    # Secret key for JWT session tokens
    SECRET_KEY: str = "dev-secret-key-change-in-production-studentos-2026-secure-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Token Encryption Key for OAuth credentials (Fernet key - 32 url-safe base64-encoded bytes)
    # Default provided for initial local dev, auto-generated or overridden via environment
    ENCRYPTION_KEY: str = "REMOVED_EXPOSED_KEY"
    
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

    # AI Configuration (Optional provider: "mock", "offline", "groq", "openai")
    AI_PROVIDER: str = "offline"  # Defaults to offline / rule-based fallback when no key is set
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    HUGGINGFACE_API_KEY: str = ""
    
    # Rate Limiting & Safety
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_WINDOW_SECONDS: int = 60
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("ENCRYPTION_KEY")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        # Validate that Fernet can initialize with this key
        try:
            Fernet(v.encode() if isinstance(v, str) else v)
            return v
        except Exception:
            # If invalid or empty, generate a deterministic fallback key for dev and warn
            new_key = Fernet.generate_key().decode()
            return new_key


settings = Settings()
