import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.user import UserSession

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

# In-memory IP/identifier rate-limiter for authentication attempts
_rate_limit_records: Dict[str, List[float]] = {}

def check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 60):
    """Simple sliding-window rate limit checker."""
    now = time.time()
    attempts = _rate_limit_records.get(key, [])
    # Filter attempts within window
    valid_attempts = [t for t in attempts if now - t < window_seconds]
    if len(valid_attempts) >= max_attempts:
        logger.warning(f"Rate limit exceeded for key: {key}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a minute before trying again."
        )
    valid_attempts.append(now)
    _rate_limit_records[key] = valid_attempts


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Authenticate user via Authorization Bearer header OR secure HttpOnly session cookie.
    Ensures zero reliance on insecure client-side localStorage alone.
    """
    # Check Authorization header first, fallback to session cookie
    auth_token = token
    if not auth_token:
        auth_token = request.cookies.get("studentos_session")
        
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    payload = decode_access_token(auth_token)
    if not payload or not payload.get("sub") or not isinstance(payload.get("jti"), str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload["sub"]
    session = db.query(UserSession).filter_by(
        user_id=user_id,
        session_token=payload["jti"],
    ).first()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
        
    return user
