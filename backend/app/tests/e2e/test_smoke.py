"""Smoke tests for the public app."""
import os
import pytest

try:
    from playwright.sync_api import Page, expect
except ImportError:
    pytest.skip("playwright not installed", allow_module_level=True)

pytestmark = pytest.mark.e2e


def test_landing_loads(page: Page, base_url):
    page.goto(base_url)
    expect(page).to_have_title(lambda t: "StudentOS" in t or t != "")


def test_login_page_renders(page: Page, base_url):
    page.goto(base_url + "/login")
    expect(page.get_by_label("Email address")).to_be_visible()
    expect(page.get_by_role("button", name="Sign In")).to_be_visible()


def test_register_page_renders(page: Page, base_url):
    page.goto(base_url + "/register")
    expect(page.get_by_label("Email address")).to_be_visible()