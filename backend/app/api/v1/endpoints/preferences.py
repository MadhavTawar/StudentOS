from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User, UserPreference
from backend.app.schemas.user_preference import UserPreferenceUpdate, UserPreferenceResponse
from backend.app.services.auth_service import AuthService

router = APIRouter()


@router.get("/", response_model=UserPreferenceResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


@router.put("/", response_model=UserPreferenceResponse)
def update_preferences(
    prefs_in: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return AuthService.update_preferences(db, user_id=current_user.id, prefs_in=prefs_in)
