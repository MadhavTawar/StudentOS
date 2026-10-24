from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User
from backend.app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskStats
from backend.app.services.task_service import TaskService
from backend.app.services.due_items import find_duplicate_task

router = APIRouter()


@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[str] = Query(None, description="Filter by status: Active, Pending, In Progress, Completed"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search term in title or description"),
    sort_by: str = Query("due_date", pattern="^(due_date|priority|created_at|title)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks, _ = TaskService.list_tasks(
        db,
        user_id=current_user.id,
        status_filter=status,
        priority_filter=priority,
        category_filter=category,
        search_query=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset
    )
    return tasks


@router.post("/check-duplicate", status_code=status.HTTP_200_OK)
def check_task_duplicate(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dup = find_duplicate_task(db, user_id=current_user.id, title=task_in.title, due_date=task_in.due_date)
    return {"is_duplicate": dup is not None, "existing_id": dup.id if dup else None}


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TaskService.create_task(db, user_id=current_user.id, task_in=task_in)


@router.get("/stats", response_model=TaskStats)
def get_task_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TaskService.get_stats(db, user_id=current_user.id)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TaskService.get_task(db, user_id=current_user.id, task_id=task_id)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TaskService.update_task(db, user_id=current_user.id, task_id=task_id, task_in=task_in)


@router.patch("/{task_id}/toggle", response_model=TaskResponse)
def toggle_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TaskService.toggle_complete(db, user_id=current_user.id, task_id=task_id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    TaskService.delete_task(db, user_id=current_user.id, task_id=task_id)
    return None
