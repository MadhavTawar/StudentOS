"""Playwright end-to-end fixtures."""
import os
import pytest

E2E_BASE = os.environ.get("E2E_BASE_URL", "http://127.0.0.1:5173")
E2E_API = os.environ.get("E2E_API_URL", "http://127.0.0.1:8000")

pytestmark = pytest.mark.e2e


def pytest_configure(config):
    config.addinivalue_line("markers", "e2e: end-to-end browser tests (require running servers)")


def pytest_collection_modifyitems(config, items):
    if os.environ.get("RUN_E2E") != "1":
        skip = pytest.mark.skip(reason="E2E requires running servers; set RUN_E2E=1")
        for item in items:
            if "e2e" in str(item.fspath):
                item.add_marker(skip)


@pytest.fixture(scope="session")
def base_url():
    return E2E_BASE


@pytest.fixture(scope="session")
def api_url():
    return E2E_API
