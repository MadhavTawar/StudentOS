"""Tests for prioritisation helpers."""
from datetime import datetime, timezone, timedelta

from backend.app.services.prioritization import rank_items, study_plan, workload_minutes_before


NOW = datetime(2026, 10, 24, 9, 0, tzinfo=timezone.utc)


def test_rank_overdue_first():
    items = [
        {"id": "1", "title": "A", "due_date": (NOW + timedelta(days=2)).isoformat(), "priority": "Low", "status": "Pending"},
        {"id": "2", "title": "B", "due_date": (NOW - timedelta(days=1)).isoformat(), "priority": "Low", "status": "Pending"},
    ]
    ranked = rank_items(items, NOW)
    assert ranked[0].title == "B"
    assert ranked[0].is_overdue is True


def test_rank_excludes_completed():
    items = [
        {"id": "1", "title": "Done", "due_date": NOW.isoformat(), "priority": "High", "status": "Completed"},
        {"id": "2", "title": "Pending", "due_date": (NOW + timedelta(days=1)).isoformat(), "priority": "Low", "status": "Pending"},
    ]
    ranked = rank_items(items, NOW)
    assert len(ranked) == 1
    assert ranked[0].title == "Pending"


def test_rank_undated_last():
    items = [
        {"id": "1", "title": "Undated", "due_date": None, "priority": "Urgent", "status": "Pending"},
        {"id": "2", "title": "Dated", "due_date": (NOW + timedelta(days=5)).isoformat(), "priority": "Low", "status": "Pending"},
    ]
    ranked = rank_items(items, NOW)
    assert ranked[-1].title == "Undated"


def test_rank_priority_tiebreak():
    same_due = (NOW + timedelta(days=1)).isoformat()
    items = [
        {"id": "1", "title": "Low", "due_date": same_due, "priority": "Low", "status": "Pending"},
        {"id": "2", "title": "High", "due_date": same_due, "priority": "High", "status": "Pending"},
    ]
    ranked = rank_items(items, NOW)
    assert ranked[0].title == "High"


def test_study_plan_never_past_due():
    items = [
        {"id": "1", "title": "A", "due_date": (NOW + timedelta(days=1)).isoformat(), "priority": "High", "status": "Pending", "estimated_duration": 60},
    ]
    plan = study_plan(items, NOW, capacity_minutes_per_day=240)
    for day in plan["schedule"]:
        d = datetime.fromisoformat(day["date"]).date()
        for it in day["items"]:
            pass
    # item scheduled on or before due date
    scheduled_dates = [d["date"] for d in plan["schedule"] if any(i["title"] == "A" for i in d["items"])]
    assert len(scheduled_dates) == 1
    assert datetime.fromisoformat(scheduled_dates[0]).date() <= (NOW + timedelta(days=1)).date()


def test_workload_minutes():
    items = [
        {"id": "1", "title": "A", "due_date": (NOW + timedelta(days=1)).isoformat(), "priority": "High", "status": "Pending", "estimated_duration": 120},
        {"id": "2", "title": "B", "due_date": (NOW + timedelta(days=10)).isoformat(), "priority": "Low", "status": "Pending", "estimated_duration": 60},
    ]
    mins = workload_minutes_before(items, NOW + timedelta(days=2))
    assert mins == 120  # only A is due within 2 days
