from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    auth,
    tasks,
    deadlines,
    gmail,
    ai,
    reminders,
    dashboard,
    preferences,
    health,
    knowledge,
    workspaces,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["System Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks Management"])
api_router.include_router(deadlines.router, prefix="/deadlines", tags=["Deadlines Management"])
api_router.include_router(gmail.router, prefix="/gmail", tags=["Gmail Integration"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Assistance & Extraction"])
api_router.include_router(reminders.router, prefix="/reminders", tags=["Reminders & Notifications"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["User Preferences"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Workspace Knowledge"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces and Plans"])
