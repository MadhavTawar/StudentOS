"""XSS regression tests: user-controlled text must render as text, never as HTML."""
import os
import pytest

try:
    from playwright.sync_api import Page, expect
except ImportError:
    pytest.skip("playwright not installed", allow_module_level=True)

import requests

pytestmark = pytest.mark.e2e


def _register_and_login(api_url, page, email, password):
    # Register
    requests.post(f"{api_url}/api/v1/auth/register", json={
        "full_name": "XSS Tester",
        "email": email,
        "password": password,
    }, timeout=30)
    # Login via browser to set cookie
    page.goto(os.environ.get("E2E_BASE_URL", "http://127.0.0.1:5173") + "/login")
    page.get_by_label("Email address").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_url("**/app**", timeout=15000)


def test_task_title_with_html_renders_as_text(page: Page, base_url, api_url):
    import uuid
    email = f"xss_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass123!"
    _register_and_login(api_url, page, email, password)

    # Create a task with HTML in the title via API (cookie auth)
    session = requests.Session()
    # Re-login via API to get cookie
    login_res = session.post(f"{api_url}/api/v1/auth/login", json={
        "email": email, "password": password,
    }, headers={"Origin": "http://127.0.0.1:5173"}, timeout=30)
    assert login_res.status_code == 200
    task_title = "<script>alert('xss')</script>My Task"
    r = session.post(f"{api_url}/api/v1/tasks/", json={
        "title": task_title,
        "priority": "Medium",
    }, headers={"Origin": "http://127.0.0.1:5173"}, timeout=30)
    assert r.status_code in (200, 201)

    # Visit dashboard and check the title renders as text (not executed)
    page.goto(base_url + "/app")
    # The title should appear as literal text somewhere on the page
    expect(page.get_by_text(task_title, exact=False)).to_be_visible(timeout=15000)
    # Ensure no script tag was injected into the DOM
    assert page.locator("script:has-text('alert')").count() == 0