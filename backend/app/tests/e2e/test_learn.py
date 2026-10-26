"""Playwright E2E tests for the Learn page chat routing and UI.

Requires a running backend and frontend:
  Backend:  PYTHONPATH=. AI_PROVIDER=offline uvicorn backend.app.main:app --port 8000
  Frontend: cd frontend && npm run dev -- --host 127.0.0.1 --port 5173

Run with:
  E2E_BASE_URL=http://localhost:5173 E2E_API_URL=http://127.0.0.1:8000 \\
      RUN_E2E=1 pytest -o pythonpath=. -m e2e backend/app/tests/e2e/test_learn.py
"""
import os
import uuid

import pytest
import requests

try:
    from playwright.sync_api import Page, expect
except ImportError:
    pytest.skip("playwright not installed", allow_module_level=True)

pytestmark = pytest.mark.e2e

E2E_BASE = os.environ.get("E2E_BASE_URL", "http://localhost:5173")
E2E_API = os.environ.get("E2E_API_URL", "http://127.0.0.1:8000")


@pytest.fixture(scope="session")
def auth_cookies():
    """Register one user via API and return the session cookies."""
    email = f"learn_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"
    reg_res = requests.post(f"{E2E_API}/api/v1/auth/register", json={
        "full_name": "Learn Tester",
        "email": email,
        "password": password,
    }, timeout=30)
    assert reg_res.status_code in (200, 201), reg_res.text

    sess = requests.Session()
    login_res = sess.post(f"{E2E_API}/api/v1/auth/login", json={
        "email": email,
        "password": password,
    }, headers={"Origin": E2E_BASE}, timeout=30)
    assert login_res.status_code == 200, login_res.text

    cookies = []
    for cookie in sess.cookies:
        cookies.append({
            "name": cookie.name,
            "value": cookie.value,
            "domain": "localhost",
            "path": "/",
        })
    return cookies


@pytest.fixture
def logged_in_page(page: Page, auth_cookies) -> Page:
    """A page with an authenticated session, on /app."""
    page.context.add_cookies(auth_cookies)
    page.goto(f"{E2E_BASE}/app", wait_until="load")
    page.wait_for_url("**/app**", timeout=15000)
    return page


def _ask(page: Page, question: str) -> None:
    page.goto(f"{E2E_BASE}/app/learn", wait_until="load")
    page.get_by_label("Ask about shared workspace documents").fill(question)
    page.get_by_role("button", name="Ask question").click()


def _turn_label(page: Page) -> str:
    return page.locator(".learn-turn").last.locator(".learn-turn-label").text_content()


def test_learn_nav_highlight_per_route(logged_in_page: Page, base_url: str) -> None:
    """The nav link for the current route is highlighted with aria-current=page."""
    routes = [
        ("", "/app"),
        ("planner", "/app/planner"),
        ("goals", "/app/goals"),
        ("inbox", "/app/inbox"),
        ("learn", "/app/learn"),
    ]
    for _, href in routes:
        logged_in_page.goto(href, wait_until="load")
        active = logged_in_page.locator(f'a[href="{href}"][aria-current="page"]')
        expect(active.first).to_be_visible()


def test_learn_mobile_tab_bar(logged_in_page: Page, base_url: str) -> None:
    """Mobile tab bar is hidden on desktop and visible on mobile viewports."""
    page = logged_in_page

    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/app/learn", wait_until="load")
    expect(page.locator(".learn-mobile-tabs")).to_be_hidden()

    page.set_viewport_size({"width": 390, "height": 800})
    page.goto(f"{base_url}/app/learn", wait_until="load")
    expect(page.locator(".learn-mobile-tabs")).to_be_visible()


def test_learn_provider_notice_groq(logged_in_page: Page, base_url: str) -> None:
    """Provider notice reflects GET /api/v1/ai/provider (groq => content leaves the server)."""
    page = logged_in_page

    page.route("**/api/v1/ai/provider", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"provider":"groq"}',
    ))
    page.goto(f"{base_url}/app/learn", wait_until="load")

    notice = page.locator(".learn-privacy-note")
    expect(notice).to_contain_text("Groq")
    expect(notice).to_contain_text("leaves the server")


def test_learn_chat_what_is_due_this_week(logged_in_page: Page, base_url: str) -> None:
    """'What is due this week?' routes to the StudentOS-data path via the real assistant."""
    page = logged_in_page

    _ask(page, "What is due this week?")
    page.wait_for_selector(".learn-turn", timeout=30000)
    assert _turn_label(page) == "From your StudentOS data", _turn_label(page)


def test_learn_chat_give_example_deadlock(logged_in_page: Page, base_url: str) -> None:
    """'Give an example of deadlock' routes to the documents path."""
    page = logged_in_page

    _ask(page, "Give an example of deadlock")
    page.wait_for_selector(".learn-turn", timeout=30000)
    assert _turn_label(page) == "From your documents", _turn_label(page)


def test_learn_chat_summarize_exam_syllabus(logged_in_page: Page, base_url: str) -> None:
    """'Summarize the exam syllabus in my notes' is a task question; falls to assistant when docs lack evidence."""
    page = logged_in_page

    _ask(page, "Summarize the exam syllabus in my notes")
    page.wait_for_selector(".learn-turn", timeout=30000)
    assert _turn_label(page) == "From your StudentOS data", _turn_label(page)


def test_learn_chat_explain_assignment_problem(logged_in_page: Page, base_url: str) -> None:
    """'Explain the assignment problem' is a task question; falls to assistant when docs lack evidence."""
    page = logged_in_page

    _ask(page, "Explain the assignment problem")
    page.wait_for_selector(".learn-turn", timeout=30000)
    assert _turn_label(page) == "From your StudentOS data", _turn_label(page)
