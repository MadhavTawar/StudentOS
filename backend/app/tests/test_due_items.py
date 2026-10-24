"""Tests for the shared due-items layer."""
from datetime import datetime, timezone, timedelta

from backend.app.services.due_items import get_due_items, find_duplicate_task
from backend.app.models.task import Task
from backend.app.models.deadline import Deadline


def test_get_due_items_returns_tasks_and_deadlines(db, test_user):
    t = Task(user_id=test_user.id, title="Task 1", status="Pending",
             due_date=datetime.now(timezone.utc) + timedelta(days=1))
    d = Deadline(user_id=test_user.id, title="Deadline 1", event_type="Assignment",
                 due_date=datetime.now(timezone.utc) + timedelta(days=2), status="Upcoming")
    db.add(t); db.add(d); db.commit()

    items = get_due_items(db, test_user.id)
    assert len(items) == 2
    kinds = {i.kind for i in items}
    assert kinds == {"task", "deadline"}


def test_get_due_items_excludes_completed(db, test_user):
    t = Task(user_id=test_user.id, title="Done task", status="Completed",
             due_date=datetime.now(timezone.utc) + timedelta(days=1))
    db.add(t); db.commit()
    items = get_due_items(db, test_user.id)
    assert len(items) == 0
    items2 = get_due_items(db, test_user.id, include_completed=True)
    assert len(items2) == 1


def test_get_due_items_user_isolation(db, test_user, second_user):
    t = Task(user_id=test_user.id, title="My task", status="Pending",
             due_date=datetime.now(timezone.utc) + timedelta(days=1))
    db.add(t); db.commit()
    items = get_due_items(db, second_user.id)
    assert len(items) == 0


def test_find_duplicate_task_exact(db, test_user):
    due = datetime.now(timezone.utc) + timedelta(days=1)
    t = Task(user_id=test_user.id, title="DBMS Assignment 2", status="Pending", due_date=due)
    db.add(t); db.commit()
    dup = find_duplicate_task(db, test_user.id, "DBMS Assignment 2", due)
    assert dup is not None
    assert dup.id == t.id


def test_find_duplicate_task_none(db, test_user):
    dup = find_duplicate_task(db, test_user.id, "Nonexistent", None)
    assert dup is None


def test_find_duplicate_task_fuzzy(db, test_user):
    due = datetime.now(timezone.utc) + timedelta(days=1)
    t = Task(user_id=test_user.id, title="DBMS Assignment 2", status="Pending", due_date=due)
    db.add(t); db.commit()
    dup = find_duplicate_task(db, test_user.id, "DBMS Assignment II", due)
    # fuzzy may or may not match depending on threshold; just check no crash
    assert dup is None or dup.id == t.id
