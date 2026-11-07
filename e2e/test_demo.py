"""The six demo moments, Start fresh, and the story site, clicked through in a real browser."""

import os

import pytest
from playwright.sync_api import Page, expect

from conftest import BASE_URL, FIRST_LOAD_MS, open_tab


# M1. The tax-year clock and where things stand.
def test_overview(app: Page):
    main = app.locator("main")
    expect(main).to_contain_text("42 days left")
    expect(main).to_contain_text("You can still write off $6,600 of equipment")
    expect(main).to_contain_text("$150 from the $2,000 line")


# M2. Check before you buy: $2,899 laptops count as equipment, $2,399 ones are written off right away.
def test_check_a_purchase(app: Page):
    open_tab(app, "Check a purchase")
    main = app.locator("main")
    expect(main).to_contain_text("Each one is $399 over the $2,500 small-item line")
    expect(main).to_contain_text("$2,097 spread over later years")
    app.get_by_label("$2,399", exact=True).check()
    expect(main).to_contain_text("Each one is $101 under the $2,500 small-item line")
    expect(main).to_contain_text("California's equipment room stays at $6,600")


# M3. One question, not a guess. The answer moves the numbers.
def test_answering_the_question(app: Page):
    open_tab(app, "Questions")
    expect(app.locator("main")).to_contain_text("Was this lunch for your team at the office, or a client?")
    app.get_by_role("button", name="Team meal at the office").click()
    open_tab(app, "Accountant packet")
    main = app.locator("main")
    expect(main).to_contain_text("Team meals at the office: federal $0, California $4,592 deductible")
    expect(main).not_to_contain_text("Waiting on your answer")


# M4. The rules changed between 2025 and 2026, and every change cites its source.
def test_rules_by_year(app: Page):
    open_tab(app, "Rules")
    main = app.locator("main")
    expect(main).to_contain_text("13 → 4")
    expect(main).to_contain_text("$2,090 → $0")
    expect(main).to_contain_text("A 1099-NEC is needed once one contractor is paid $2,000 or more in 2026")
    expect(main).to_contain_text("Rev. Proc. 2025-32 sec. 4.24")  # the update log
    app.get_by_role("button", name="2025 rules").click()
    expect(main).to_contain_text("A 1099-NEC is needed once one contractor is paid $600 or more in 2025")


# M5. Correct refusals: hidden instructions are ignored, an unreadable total gets no number.
def test_refusals(app: Page):
    open_tab(app, "Questions")
    main = app.locator("main")
    expect(main).to_contain_text("The receipt had hidden text telling the AI to mark it 100% deductible")
    expect(main).to_contain_text("No amount could be read, so no number is shown.")
    expect(main).to_contain_text("Can't determine")


# M6. The accountant packet downloads, and says plainly it isn't a filing.
def test_packet_downloads(app: Page):
    open_tab(app, "Accountant packet")
    expect(app.locator("main")).to_contain_text("This is not a tax filing.")

    with app.expect_download() as pdf:
        app.get_by_text("Download PDF").click()
    assert open(pdf.value.path(), "rb").read(4) == b"%PDF"

    with app.expect_download() as csv:
        app.get_by_text("Download CSV").click()
    first_line = open(csv.value.path(), encoding="utf-8").readline()
    assert "not a tax filing" in first_line


# Start fresh: your own company, transactions from a CSV, one row to sort yourself.
def test_start_fresh_with_a_csv(app: Page, tmp_path):
    sample = tmp_path / "transactions.csv"
    sample.write_text(
        "date,merchant,amount,category,payee\n"
        "2026-01-05,GitHub,44.00,software,\n"
        "2026-02-12,Sweetgreen,412.00,,\n"
        "2026-03-03,Apple,3848.50,equipment,\n"
        "2026-04-18,Maya Lindqvist,1500.00,contractor,Maya Lindqvist\n",
        encoding="utf-8",
    )
    app.get_by_role("button", name="Start fresh with your company").click()
    app.get_by_label("Company name").fill("Browser Test Co")
    app.get_by_label("Expected 2026 business income, in dollars").fill("$90,000")
    app.get_by_role("button", name="Create my tax file").click()
    expect(app.get_by_text("Add your transactions", exact=True)).to_be_visible()

    app.locator("input[type=file]").set_input_files(str(sample))
    main = app.locator("main")
    expect(main).to_contain_text("Added 4. Skipped 0. 1 need a category.")
    expect(main).to_contain_text("$21,151")  # $25,000 California cap minus the $3,848.50 laptop

    app.get_by_role("button", name="Back to the demo").click()
    expect(main).to_contain_text("$6,600")


# The story site loads, and its button goes to the app.
def test_story_site(page: Page):
    page.goto(BASE_URL + "/")
    expect(page.get_by_role("heading", name="See your taxes while you can still change them.")).to_be_visible()
    page.get_by_role("link", name="Open the demo").first.click()
    expect(page).to_have_url(BASE_URL + "/app")


# On a phone, nothing scrolls sideways.
def test_story_site_on_a_phone(browser):
    context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = context.new_page()
    page.goto(BASE_URL + "/")
    page.mouse.wheel(0, 20_000)  # scroll through so every page draws
    page.wait_for_timeout(1500)
    assert page.evaluate("document.documentElement.scrollWidth") <= 390
    context.close()


# Try a rule change. This makes a real AI call (about a cent), so it only runs when asked:
#   $env:TRIMTAX_E2E_AI="1"; python -m pytest e2e
@pytest.mark.skipif(os.environ.get("TRIMTAX_E2E_AI") != "1", reason="makes a real AI call; set TRIMTAX_E2E_AI=1")
def test_try_a_rule_change(app: Page):
    open_tab(app, "Rules")
    app.get_by_role("button", name="Use a sample passage").click()
    app.get_by_role("button", name="Ask the AI").click()
    app.get_by_label("Your name, for the approval").fill("Browser test", timeout=FIRST_LOAD_MS)
    app.get_by_role("button", name="Approve").first.click()
    open_tab(app, "Overview")
    expect(app.locator("main")).to_contain_text("You can still write off $11,600 of equipment")
    open_tab(app, "Rules")
    app.get_by_role("button", name="Undo").click()
    open_tab(app, "Overview")
    expect(app.locator("main")).to_contain_text("You can still write off $6,600 of equipment")
