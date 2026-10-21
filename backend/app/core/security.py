from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import bcrypt
import jwt
import uuid
from bs4 import BeautifulSoup
from cryptography.fernet import Fernet, InvalidToken
from backend.app.core.config import settings
from backend.app.core.logging import logger


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is offset-aware UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# --- Password Hashing with Bcrypt ---

def hash_password(password: str) -> str:
    """Hash a plaintext password with a random salt using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.warning(f"Password verification failure: {e}")
        return False


# --- JWT Authentication Tokens ---

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "iat": now,
        "sub": str(subject),
        "type": "access_token",
        "jti": uuid.uuid4().hex,
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != "access_token" or not isinstance(payload.get("sub"), str):
            return None
        return payload
    except jwt.PyJWTError as e:
        logger.warning(f"Token decoding error: {e}")
        return None


# --- Token Encryption for OAuth Credentials (Fernet / AES) ---

def get_fernet_cipher() -> Fernet:
    """Initialize Fernet cipher using validated ENCRYPTION_KEY."""
    key = settings.ENCRYPTION_KEY.encode("utf-8")
    return Fernet(key)


def encrypt_token(token: str) -> str:
    """Encrypt sensitive OAuth token before storing in the database."""
    if not token:
        return ""
    cipher = get_fernet_cipher()
    encrypted_bytes = cipher.encrypt(token.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt sensitive OAuth token retrieved from the database."""
    if not encrypted_token:
        return ""
    try:
        cipher = get_fernet_cipher()
        decrypted_bytes = cipher.decrypt(encrypted_token.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        logger.error("Failed to decrypt token: Invalid token or mismatched encryption key.")
        raise ValueError("Failed to decrypt credential. Encryption key mismatch or corrupted data.")


# --- Untrusted Email Content Sanitization ---

ALLOWED_TAGS = {"p", "br", "b", "i", "strong", "em", "u", "ul", "ol", "li", "span", "blockquote", "code", "pre"}

def sanitize_email_content(raw_html: str, max_length: int = 5000) -> str:
    """
    Sanitize email HTML to prevent XSS and script injection.
    Strips scripts, iframes, styles, objects, and unsafe attributes.
    Returns safe plain text and minimal formatting.
    """
    if not raw_html:
        return ""
    
    # Parse with BeautifulSoup
    soup = BeautifulSoup(raw_html, "html.parser")
    
    # Remove dangerous elements completely
    for tag in soup(["script", "style", "iframe", "object", "embed", "applet", "meta", "link", "form", "svg"]):
        tag.decompose()
        
    # Remove all event handlers like onclick, onload, onerror
    for tag in soup.find_all(True):
        if tag.name not in ALLOWED_TAGS:
            tag.unwrap()
        else:
            attrs = dict(tag.attrs)
            for attr in attrs:
                # Remove all attributes to be strictly safe
                del tag.attrs[attr]

    cleaned_text = soup.get_text(separator=" ", strip=True)
    if len(cleaned_text) > max_length:
        cleaned_text = cleaned_text[:max_length] + " [truncated]"
    return cleaned_text
