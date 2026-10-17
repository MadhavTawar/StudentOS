import pytest
import jwt
from pydantic import ValidationError
from backend.app.core.config import settings
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    encrypt_token,
    decrypt_token,
    sanitize_email_content
)


def test_password_hashing():
    pwd = "StudentPassword2026!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_generation_and_decoding():
    subject = "user_12345"
    token = create_access_token(subject=subject)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == subject
    assert "exp" in payload

    wrong_type_token = jwt.encode(
        {"sub": subject, "type": "refresh_token"},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    assert decode_access_token(wrong_type_token) is None


def test_token_encryption_and_decryption():
    raw_secret = "google_refresh_token_very_secret_xyz"
    encrypted = encrypt_token(raw_secret)
    assert encrypted != raw_secret

    decrypted = decrypt_token(encrypted)
    assert decrypted == raw_secret


def test_email_sanitization_xss_protection():
    unsafe_html = """
    <div>
        <p>Assignment submission details.</p>
        <script>alert('malicious XSS execution')</script>
        <iframe src="http://evil.com"></iframe>
        <a href="javascript:alert('pwned')">Click here</a>
    </div>
    """
    sanitized = sanitize_email_content(unsafe_html)
    assert "<script>" not in sanitized
    assert "alert" not in sanitized
    assert "<iframe>" not in sanitized
    assert "javascript:" not in sanitized
    assert "Assignment submission details." in sanitized


def test_security_keys_are_generated_for_development_and_required_in_production():
    from backend.app.core.config import Settings

    with pytest.warns(RuntimeWarning):
        development_settings = Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SECRET_KEY="",
            ENCRYPTION_KEY="",
        )
    assert len(development_settings.SECRET_KEY) >= 32
    assert development_settings.ENCRYPTION_KEY

    with pytest.raises(ValidationError, match="SECRET_KEY must contain at least 32 characters"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="",
            ENCRYPTION_KEY="",
        )


def test_invalid_encryption_key_is_rejected():
    from backend.app.core.config import Settings

    with pytest.raises(ValidationError, match="ENCRYPTION_KEY must be a valid Fernet key"):
        Settings(
            _env_file=None,
            ENVIRONMENT="development",
            SECRET_KEY="test-key-that-is-long-enough-for-development",
            ENCRYPTION_KEY="not-a-fernet-key",
        )
