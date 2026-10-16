from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user, check_rate_limit
from backend.app.core.security import create_access_token
from backend.app.models.user import User
from backend.app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from backend.app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, request: Request, db: Session = Depends(get_db)):
    """Register a new student user."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"register_{client_ip}", max_attempts=5, window_seconds=60)
    user = AuthService.register_user(db, user_in)
    return user


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    """Authenticate and obtain JWT token plus secure HttpOnly session cookie."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"login_{client_ip}_{credentials.email.lower()}", max_attempts=5, window_seconds=60)
    
    user = AuthService.authenticate_user(db, credentials)
    access_token = create_access_token(subject=user.id)
    AuthService.set_session_cookie(response, access_token)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
def logout(response: Response, current_user: User = Depends(get_current_user)):
    """Log out current user and clear secure session cookie."""
    AuthService.clear_session_cookie(response)
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user profile and preferences."""
    return current_user
