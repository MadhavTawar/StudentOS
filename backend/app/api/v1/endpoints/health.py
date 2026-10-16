from fastapi import APIRouter, Depends, status, Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db
from backend.app.core.config import settings

router = APIRouter()


@router.get("/")
def health_check():
    """Liveness probe."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }


@router.get("/ready")
def readiness_check(response: Response, db: Session = Depends(get_db)):
    """Readiness probe checking database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "ai_provider": settings.AI_PROVIDER
        }
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
