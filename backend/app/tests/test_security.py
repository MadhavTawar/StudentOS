import pytest
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
