"""Browser tests for the demo, run against the live site by default.

    pip install -r e2e/requirements.txt
    python -m playwright install chromium
    python -m pytest e2e                      # the live site
    $env:TRIMTAX_URL="http://localhost:3000"; python -m pytest e2e   # your machine (PowerShell)

Each test opens a fresh browser, so it gets its own copy of the demo company.
"""

import os
import re

import pytest
from playwright.sync_api import Page, expect, sync_playwright

BASE_URL = os.environ.get("TRIMTAX_URL", "https://trimtax.vercel.app").rstrip("/")
# The first request can be slow if the API was just redeployed.
FIRST_LOAD_MS = 90_000


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        yield browser
        browser.close()


@pytest.fixture
def page(browser):
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(15_000)
    yield page
    context.close()


@pytest.fixture
def app(page: Page):
    """The app with a fresh copy of the demo company, loaded."""
    page.goto(BASE_URL + "/app")
    expect(page.get_by_text("days left").first).to_be_visible(timeout=FIRST_LOAD_MS)
    return page


def open_tab(page: Page, name: str):
    # Starts with the name, since a tab can carry a count ("Questions 1").
    page.get_by_role("button", name=re.compile("^" + re.escape(name))).first.click()
