from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, Response, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.models.user import User, UserPreference
from backend.app.services.workspace_service import create_personal_workspace
from backend.app.schemas.auth import UserRegister, UserLogin
from backend.app.schemas.user_preference import UserPreferenceUpdate


class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserRegister) -> User:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )
        
        # Create user record
        hashed_pwd = hash_password(user_in.password)
        user = User(
            email=user_in.email.lower(),
            hashed_password=hashed_pwd,
            full_name=user_in.full_name,
            is_active=True
        )
        db.add(user)
        db.flush()  # get user.id
        create_personal_workspace(db, user)
        
        # Initialize default user preferences
        preference = UserPreference(
            user_id=user.id,
            timezone="UTC",
            theme="dark",
            email_sync_enabled=True,
            ai_features_enabled=True,
            reminder_lead_minutes=1440
        )
        db.add(preference)
        db.commit()
        db.refresh(user)
        logger.info(f"Registered new user account: {user.email}")
        return user

    @staticmethod
    def authenticate_user(db: Session, credentials: UserLogin) -> User:
        user = db.query(User).filter(User.email == credentials.email.lower()).first()
        if not user:
            logger.warning(f"Failed login attempt for non-existent email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not verify_password(credentials.password, user.hashed_password):
            logger.warning(f"Failed login attempt for email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
            
        logger.info(f"Successful authentication for user: {user.email}")
        return user

    @staticmethod
    def set_session_cookie(response: Response, token: str):
        """Set secure HttpOnly cookie for session persistence."""
        secure_cookie = settings.ENVIRONMENT == "production"
        response.set_cookie(
            key="studentos_session",
            value=token,
            httponly=True,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            samesite="lax",
            secure=secure_cookie
        )

    @staticmethod
    def clear_session_cookie(response: Response):
        """Clear session cookie on logout."""
        response.delete_cookie(
            key="studentos_session",
            httponly=True,
            samesite="lax"
        )

    @staticmethod
    def update_preferences(db: Session, user_id: str, prefs_in: UserPreferenceUpdate) -> UserPreference:
        pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        if not pref:
            pref = UserPreference(user_id=user_id)
            db.add(pref)
            
        update_data = prefs_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pref, key, value)
            
        pref.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(pref)
        return pref
