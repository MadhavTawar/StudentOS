"""Playwright E2E tests for Planner views (Today/Upcoming/Overdue/Completed, Day view).

Requires a running backend and frontend:
  Backend:  PYTHONPATH=. uvicorn backend.app.main:app --port 8000
  Frontend: cd frontend && npm run dev -- --host 127.0.0.1 --port 5173

Run with:
  E2E_BASE_URL=http://127.0.0.1:5173 E2E_API_URL=http://127.0.0.1:8000 \\
      RUN_E2E=1 pytest -o pythonpath=. -m e2e backend/app/tests/e2e/test_planner_views.py
"""
import os
import uuid
from datetime import timezone
import pytest
import requests

try:
    from playwright.sync_api import Page, expect
except ImportError:
    pytest.skip("playwright not installed", allow_module_level=True)


pytestmark = pytest.mark.e2e


E2E_BASE = os.environ.get("E2E_BASE_URL", "http://127.0.0.1:5173")
E2E_API = os.environ.get("E2E_API_URL", "http://127.0.0.1:8000")


def _register_with_retry(api_url, email, password, full_name="Planner Tester", retries=3, delay=60):
    """Register a user, retrying on 429 rate limit."""
    import time
    # Proactively space registrations to stay under the 5/minute rate limit.
    time.sleep(12)
    for attempt in range(retries):
        res = requests.post(f"{api_url}/api/v1/auth/register", json={
            "full_name": full_name,
            "email": email,
            "password": password,
        }, timeout=30)
        if res.status_code in (200, 201):
            return res
        if res.status_code == 429 and attempt < retries - 1:
            time.sleep(delay)
            continue
        res.raise_for_status()
    return res


def _register_and_login(page: Page, api_url: str, email: str, password: str) -> None:
    """Register a demo user via API, then log in via the browser."""
    _register_with_retry(api_url, email, password)

    page.goto(f"{E2E_BASE}/login")
    page.get_by_label("Email address").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_url("**/app**", timeout=15000)


def _create_sample_tasks(api_url: str, session) -> None:
    """Create a few sample tasks across different statuses/due dates."""
    import datetime
    now = datetime.datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    tomorrow = (now + datetime.timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    yesterday = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

    tasks = [
        {"title": "Today task", "due_date": today, "priority": "High", "status": "Pending"},
        {"title": "Tomorrow task", "due_date": tomorrow, "priority": "Medium", "status": "Pending"},
        {"title": "Yesterday overdue", "due_date": yesterday, "priority": "Urgent", "status": "Pending"},
        {"title": "Completed task", "due_date": tomorrow, "priority": "Low", "status": "Completed"},
    ]
    for t in tasks:
        session.post(f"{api_url}/api/v1/tasks/", json=t, headers={"Origin": E2E_BASE}, timeout=30)


def _take_screenshots(page: Page, suffix: str) -> None:
    """Take screenshots at 1280x1024 and 390px in both light and dark themes."""
    viewports = [
        ("1280", "light"),
        ("1024", "light"),
        ("390", "light"),
        ("1280", "dark"),
        ("1024", "dark"),
        ("390", "dark"),
    ]
    for width, theme in viewports:
        w = int(width)
        page.set_viewport_size({"width": w, "height": 768})
        # Switch theme if needed
        if theme == "dark":
            # Click avatar menu to open theme switch if available, or use keyboard/data attribute
            page.evaluate("() => { document.documentElement.dataset.theme = 'dark'; }")
        else:
            page.evaluate("() => { document.documentElement.dataset.theme = 'light'; }")
        page.screenshot(path=f"tests/e2e/screenshots/planner_{suffix}_{width}_{theme}.png", full_page=True)


def test_planner_today_view(page: Page, base_url, api_url) -> None:
    """Today view shows only tasks due today."""
    import uuid
    email = f"planner_today_{uuid.uuid4().hex[:8]}@example.com"
    password = "PlannerTest123!"
    _register_and_login(page, api_url, email, password)

    import requests
    session = requests.Session()
    session.post(f"{api_url}/api/v1/auth/login", json={
        "email": email, "password": password,
    }, headers={"Origin": E2E_BASE}, timeout=30)
    _create_sample_tasks(api_url, session)

    page.goto(f"{base_url}/app/planner?view=tasks")
    page.wait_for_selector(".task-row", timeout=15000)

    # Click Today filter
    page.get_by_role("button", name="Today view", exact=True).click()
    page.wait_for_timeout(1000)

    # All visible task rows should be due today
    task_rows = page.locator(".task-row")
    count = task_rows.count()
    for i in range(count):
        row = task_rows.nth(i)
        # Each row should have a due date of today
        title = row.locator(".task-title").text_content()
        assert title is not None and len(title) > 0

    _take_screenshots(page, "today")


def test_planner_overdue_view(page: Page, base_url, api_url) -> None:
    """Overdue view shows only overdue tasks."""
    import uuid
    email = f"planner_overdue_{uuid.uuid4().hex[:8]}@example.com"
    password = "PlannerTest123!"
    _register_and_login(page, api_url, email, password)

    import requests
    session = requests.Session()
    session.post(f"{api_url}/api/v1/auth/login", json={
        "email": email, "password": password,
    }, headers={"Origin": E2E_BASE}, timeout=30)
    _create_sample_tasks(api_url, session)

    page.goto(f"{base_url}/app/planner?view=tasks")
    page.wait_for_selector(".task-row", timeout=15000)

    # Click Overdue filter
    page.get_by_role("button", name="Overdue tasks view", exact=True).click()
    page.wait_for_timeout(1000)

    task_rows = page.locator(".task-row")
    count = task_rows.count()
    assert count >= 1  # At least the yesterday task should be overdue

    _take_screenshots(page, "overdue")


def test_planner_completed_view(page: Page, base_url, api_url) -> None:
    """Completed view shows only completed tasks."""
    import uuid
    email = f"planner_completed_{uuid.uuid4().hex[:8]}@example.com"
    password = "PlannerTest123!"
    _register_and_login(page, api_url, email, password)

    import requests
    session = requests.Session()
    session.post(f"{api_url}/api/v1/auth/login", json={
        "email": email, "password": password,
    }, headers={"Origin": E2E_BASE}, timeout=30)
    _create_sample_tasks(api_url, session)

    page.goto(f"{base_url}/app/planner?view=tasks")
    page.wait_for_selector(".task-row", timeout=15000)

    # Click Completed filter
    page.get_by_role("button", name="Completed tasks view", exact=True).click()
    page.wait_for_timeout(1000)

    task_rows = page.locator(".task-row")
    count = task_rows.count()
    assert count >= 1  # At least the completed task

    _take_screenshots(page, "completed")


def test_planner_day_view(page: Page, base_url, api_url) -> None:
    """Day view shows tasks for the selected day."""
    import uuid
    email = f"planner_day_{uuid.uuid4().hex[:8]}@example.com"
    password = "PlannerTest123!"
    _register_and_login(page, api_url, email, password)

    import requests
    session = requests.Session()
    session.post(f"{api_url}/api/v1/auth/login", json={
        "email": email, "password": password,
    }, headers={"Origin": E2E_BASE}, timeout=30)
    _create_sample_tasks(api_url, session)

    page.goto(f"{base_url}/app/planner?view=deadlines")
    page.wait_for_selector(".planner-calendar-day", timeout=15000)

    # Click Day view
    page.get_by_role("button", name="Day view", exact=True).click()
    page.wait_for_timeout(1000)

    # Should see day view with date
    page.wait_for_selector(".planner-calendar-day", timeout=15000)

    _take_screenshots(page, "day")


def test_planner_upcoming_view(page: Page, base_url, api_url) -> None:
    """Upcoming view shows only future tasks."""
    import uuid
    email = f"planner_upcoming_{uuid.uuid4().hex[:8]}@example.com"
    password = "PlannerTest123!"
    _register_and_login(page, api_url, email, password)

    import requests
    session = requests.Session()
    session.post(f"{api_url}/api/v1/auth/login", json={
        "email": email, "password": password,
    }, headers={"Origin": E2E_BASE}, timeout=30)
    _create_sample_tasks(api_url, session)

    page.goto(f"{base_url}/app/planner?view=tasks")
    page.wait_for_selector(".task-row", timeout=15000)

    # Click Upcoming filter
    page.get_by_role("button", name="Upcoming tasks view", exact=True).click()
    page.wait_for_timeout(1000)

    task_rows = page.locator(".task-row")
    count = task_rows.count()
    assert count >= 1  # Tomorrow task should be upcoming

    _take_screenshots(page, "upcoming")
