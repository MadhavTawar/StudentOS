"""Playwright E2E tests for the Learn page chat routing and UI.

Requires a running backend and frontend:
  Backend:  PYTHONPATH=. AI_PROVIDER=offline uvicorn backend.app.main:app --port 8000
  Frontend: cd frontend && npm run dev -- --host 127.0.0.1 --port 5173

Run with:
  $env:RUN_E2E = "1"
  $env:E2E_BASE_URL = "http://127.0.0.1:5173"
  $env:E2E_API_URL = "http://127.0.0.1:8000"
  python -m pytest -o pythonpath=. -m e2e backend/app/tests/e2e/test_learn.py
"""
import os
import uuid
from urllib.parse import urlparse

import pytest
import requests

try:
    from playwright.sync_api import Page, expect
except ImportError:
    pytest.skip("playwright not installed", allow_module_level=True)

pytestmark = pytest.mark.e2e

# Match conftest.py defaults exactly.
E2E_BASE = os.environ.get("E2E_BASE_URL", "http://127.0.0.1:5173")
E2E_API = os.environ.get("E2E_API_URL", "http://127.0.0.1:8000")
E2E_COOKIE_DOMAIN = urlparse(E2E_BASE).hostname or "localhost"


def _register_with_retry(api_url, email, password, origin, full_name="Learn Tester", retries=3, delay=60):
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


@pytest.fixture(scope="session")
def auth_cookies():
    """Register one user via API and return the session cookies."""
    email = f"learn_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"
    reg_res = _register_with_retry(E2E_API, email, password, E2E_BASE)
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
            "domain": E2E_COOKIE_DOMAIN,
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


def test_learn_chat_give_example_deadlock(page: Page, base_url: str, api_url: str) -> None:
    """'Give an example of deadlock' routes to the documents path.

    Publishes a document first so the documents endpoint has evidence to match
    against. Non-task questions with no published documents show an error instead.
    """
    email = f"dl_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"

    # Register and log in via API to get session cookies.
    _register_with_retry(api_url, email, password, base_url, full_name="Deadlock Tester")
    sess = requests.Session()
    login_res = sess.post(f"{api_url}/api/v1/auth/login", json={
        "email": email,
        "password": password,
    }, headers={"Origin": base_url}, timeout=30)
    assert login_res.status_code == 200, login_res.text

    # Upload and publish a document so the knowledge endpoint has evidence.
    import io
    import fitz  # pymupdf (runtime dependency in backend/requirements.txt)
    pdf_buffer = io.BytesIO()
    doc = fitz.open()
    pdf_page = doc.new_page()
    pdf_page.insert_text((72, 720), "Deadlock occurs when two processes wait for each other to release resources.")
    doc.save(pdf_buffer)
    doc.close()
    pdf_buffer.seek(0)
    upload_res = sess.post(f"{api_url}/api/v1/knowledge/documents", files={
        "file": ("deadlock.pdf", pdf_buffer.read(), "application/pdf"),
    }, data={
        "title": "Deadlock Primer",
        "description": "An introduction to deadlock.",
        "category": "Operating Systems",
    }, headers={"Origin": base_url}, timeout=30)
    assert upload_res.status_code in (200, 201), upload_res.text
    document = upload_res.json()
    document_id = document["id"]
    version_id = document["versions"][0]["id"]

    publish_res = sess.post(
        f"{api_url}/api/v1/knowledge/documents/{document_id}/versions/{version_id}/publish",
        headers={"Origin": base_url}, timeout=30,
    )
    assert publish_res.status_code in (200, 201), publish_res.text

    # Transfer session cookies into the browser.
    cookies = []
    for cookie in sess.cookies:
        cookies.append({
            "name": cookie.name,
            "value": cookie.value,
            "domain": E2E_COOKIE_DOMAIN,
            "path": "/",
        })
    page.context.add_cookies(cookies)
    page.goto(f"{base_url}/app", wait_until="load")
    page.wait_for_url("**/app**", timeout=15000)

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


def test_learn_chat_first_run_no_documents(page: Page, base_url: str, api_url: str) -> None:
    """First-run case: fresh user, no documents, 'What is due this week?' answered from StudentOS data.

    Mocks /knowledge/chat to return 503 (embedding model unavailable). The task-phrase
    question must skip the documents call entirely and fall back to the assistant
    within a few seconds.
    """
    email = f"firstrun_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"

    # Register via API so the user exists with no published documents.
    _register_with_retry(api_url, email, password, base_url, full_name="First Run Tester")
    sess = requests.Session()
    login_res = sess.post(f"{api_url}/api/v1/auth/login", json={
        "email": email,
        "password": password,
    }, headers={"Origin": base_url}, timeout=30)
    assert login_res.status_code == 200, login_res.text

    cookies = []
    for cookie in sess.cookies:
        cookies.append({
            "name": cookie.name,
            "value": cookie.value,
            "domain": E2E_COOKIE_DOMAIN,
            "path": "/",
        })
    page.context.add_cookies(cookies)

    # Mock the documents endpoint to be unavailable (503).
    page.route("**/knowledge/chat", lambda route: route.fulfill(
        status=503,
        content_type="application/json",
        body='{"detail":"Embedding model unavailable"}',
    ))

    page.goto(f"{base_url}/app/learn", wait_until="load")

    _ask(page, "What is due this week?")
    page.wait_for_selector(".learn-turn", timeout=15000)
    assert _turn_label(page) == "From your StudentOS data", _turn_label(page)
