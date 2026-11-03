"""Draw the receipt images the AI reads in the demo.

Each receipt is a small HTML page saved as a PNG with Playwright. Every image
says "Synthetic demo receipt" at the bottom: the merchants are real businesses,
but the receipts are not.

Run from the repo root, after data/generate.py:

    python data/render_receipts.py

Writes data/tidewell/receipt_images/<receipt id>.png
"""

import csv
import html
import json
import random
from datetime import date
from pathlib import Path

from playwright.sync_api import sync_playwright

TIDEWELL = Path(__file__).parent / "tidewell"
IMAGE_DIR = TIDEWELL / "receipt_images"

STYLE = """
body { margin: 0; background: #ffffff; }
.photo { display: inline-block; padding: 28px; background: #ffffff; }
.photo.taken { background: #8a8580; padding: 40px; }
.paper {
  width: 360px; padding: 26px 24px 18px; background: #fffefa; color: #222;
  font-family: "Courier Prime", "DejaVu Sans Mono", monospace; font-size: 14px;
  line-height: 1.45; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
}
.merchant { font-size: 20px; font-weight: bold; text-align: center; text-transform: uppercase; }
.center { text-align: center; }
.small { font-size: 12px; color: #555; }
.row { display: flex; justify-content: space-between; gap: 12px; }
.line-name { flex: 1; }
.rule { border-top: 1px dashed #999; margin: 10px 0; }
.total { font-size: 17px; font-weight: bold; }
.synthetic { margin-top: 14px; font-size: 11px; color: #777; text-align: center; }
.hidden-note { font-size: 7px; color: #e6e6e6; line-height: 1.2; margin-top: 6px; }
.blurred { filter: blur(5px); }
"""


def money(cents):
    return "${:,}.{:02d}".format(cents // 100, cents % 100)


def nice_date(text):
    day = date.fromisoformat(text)
    return day.strftime("%b %-d, %Y")


def row(left, right, css=""):
    return '<div class="row %s"><span class="line-name">%s</span><span>%s</span></div>' % (
        css, html.escape(left), html.escape(right))


def line_rows(details):
    parts = []
    for name, quantity, each in details["lines"]:
        if each is None:
            parts.append(row(f"{quantity} x {name}", "?"))
        elif quantity == 1:
            parts.append(row(name, money(each)))
        else:
            parts.append(row(f"{quantity} x {name}", money(each * quantity)))
            parts.append('<div class="small">&nbsp;&nbsp;%s each</div>' % money(each))
    return "\n".join(parts)


def total_rows(details, fake_total=None):
    parts = []
    if details["total_cents"] is None:
        # Unreadable photo: draw some numbers, then blur them beyond reading.
        parts.append(row("Subtotal", money(fake_total - 900)))
        parts.append(row("Tax", money(900)))
        parts.append(row("TOTAL", money(fake_total), "total"))
        return '<div class="blurred">%s</div>' % "\n".join(parts)

    parts.append(row("Subtotal", money(details["subtotal_cents"])))
    if details["tax_cents"]:
        parts.append(row("Tax", money(details["tax_cents"])))
    if details.get("tip_cents"):
        parts.append(row("Tip", money(details["tip_cents"])))
    parts.append(row("TOTAL", money(details["total_cents"]), "total"))
    return "\n".join(parts)


def receipt_html(receipt_id, details, rng):
    merchant = html.escape(details["merchant"])
    kind = details.get("kind", "receipt")
    unreadable = details.get("unreadable", False)
    tilt = rng.uniform(-4.5, -2.5) if unreadable else rng.uniform(-0.8, 0.8)

    header = [
        f'<div class="merchant">{merchant}</div>',
        '<div class="center small">San Francisco, CA</div>',
        '<div class="rule"></div>',
        row("Invoice" if kind == "invoice" else "Receipt", receipt_id.replace("rcp_", "No. ")),
        row("Date", f'{nice_date(details["date"])} {details["time"]}'),
    ]
    if details.get("bill_to"):
        header.append(row("Bill to", details["bill_to"]))
    if details.get("order_number"):
        header.append(row("Order", "#" + details["order_number"]))
    if details.get("deliver_to"):
        header.append(row("Deliver to", details["deliver_to"]))

    footer = [
        '<div class="rule"></div>',
        '<div class="center small">Paid by card</div>',
        '<div class="center small">Thank you!</div>',
        '<div class="synthetic">Synthetic demo receipt &middot; not a real transaction</div>',
    ]
    if details.get("hidden_text"):
        # The prompt-injection test: faint text a person would miss.
        footer.append('<div class="hidden-note">%s</div>' % html.escape(details["hidden_text"]))

    fake_total = rng.randint(4000, 9000) if unreadable else None
    body = "\n".join(header) + '<div class="rule"></div>' + line_rows(details) + \
        '<div class="rule"></div>' + total_rows(details, fake_total) + "\n".join(footer)

    photo_class = "photo taken" if unreadable else "photo"
    paper_style = f"transform: rotate({tilt:.2f}deg);"
    if unreadable:
        paper_style += " filter: blur(0.6px) brightness(0.93);"

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{STYLE}</style></head>
<body><div class="{photo_class}"><div class="paper" style="{paper_style}">
{body}
</div></div></body></html>"""


def receipts_with_images():
    with open(TIDEWELL / "receipts.csv", newline="") as f:
        rows = list(csv.DictReader(f))
    ids = []
    for receipt in rows:
        if receipt["has_image"] == "True":
            ids.append(receipt["id"])
    return ids


def main():
    details = json.loads((TIDEWELL / "receipt_details.json").read_text())
    IMAGE_DIR.mkdir(exist_ok=True)
    rng = random.Random(2026)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=1.5)
        for receipt_id in receipts_with_images():
            page.set_content(receipt_html(receipt_id, details[receipt_id], rng))
            page.locator(".photo").screenshot(path=str(IMAGE_DIR / f"{receipt_id}.png"))
        browser.close()

    print(f"Drew {len(receipts_with_images())} receipts in {IMAGE_DIR}")


if __name__ == "__main__":
    main()
