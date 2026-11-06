"""The accountant packet as a PDF. Same rows as the CSV, laid out to print.

Formatting only. Every number comes from the packet, which comes from the engine.
"""

from fpdf import FPDF
from fpdf.enums import XPos, YPos

from app.packet_export import flagged_rows, long_date, open_item_rows, purchase_rows, summary_rows

INK = (38, 41, 44)
SOFT = (96, 101, 106)
PENCIL = (44, 91, 160)

# The built-in PDF fonts only cover Latin-1, so swap the few characters our text uses that it doesn't.
REPLACEMENTS = {"–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "..."}


def plain(text):
    text = str(text)
    for fancy, simple in REPLACEMENTS.items():
        text = text.replace(fancy, simple)
    return text.encode("latin-1", "replace").decode("latin-1")


def dollars(amount):
    """The CSV's "1234.50" -> "$1,234.50". Blank stays blank."""
    if amount == "":
        return ""
    whole, cents = amount.lstrip("-").split(".")
    sign = "-" if amount.startswith("-") else ""
    return f"{sign}${int(whole):,}.{cents}"


class PacketPDF(FPDF):
    def __init__(self, company):
        super().__init__(format="letter")
        self.company = company
        self.set_margins(18, 18, 18)
        self.set_auto_page_break(True, margin=18)

    def footer(self):
        self.set_y(-12)
        self.set_font("helvetica", size=8)
        self.set_text_color(*SOFT)
        self.cell(0, 5, plain(f"{self.company} accountant packet. Not a tax filing. Page {self.page_no()}"), align="C")


def write_line(pdf, text, size=10, style="", color=INK, height=5):
    pdf.set_font("helvetica", style=style, size=size)
    pdf.set_text_color(*color)
    pdf.multi_cell(0, height, plain(text), new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def section(pdf, number, title):
    pdf.ln(5)
    write_line(pdf, f"{number}. {title}", size=12, style="B", color=PENCIL, height=7)
    pdf.ln(1)


def item(pdf, row, show_money=False):
    text = row["what"]
    if row["merchant"]:
        text = f"{row['merchant']}: {text}"
    if row["date"]:
        text = f"{long_date(row['date'])}  {text}"
    if show_money and row["amount"]:
        text += f" ({dollars(row['amount'])})"
    write_line(pdf, f"- {text}")
    details = [f"Status: {row['status']}"]
    if row["federal"] or row["california"]:
        details.append(f"Federal {dollars(row['federal'])} this year, California {dollars(row['california'])} this year")
    if row["receipt"]:
        details.append(f"Receipt {row['receipt']}")
    if row["rule"]:
        details.append(row["rule"])
    write_line(pdf, "  " + ". ".join(details), size=8, color=SOFT, height=4)
    pdf.ln(1)


def summary_table(pdf, rows):
    widths = [62, 26, 26, 26]
    headers = ["", "Spent", "Federal", "California"]
    pdf.set_font("helvetica", style="B", size=9)
    pdf.set_text_color(*SOFT)
    for width, header in zip(widths, headers):
        pdf.cell(width, 6, header, align="R" if header else "L")
    pdf.ln(6)
    for row in rows:
        pdf.set_font("helvetica", size=9)
        pdf.set_text_color(*INK)
        pdf.cell(widths[0], 6, plain(row["what"])[:44])
        for width, key in zip(widths[1:], ["amount", "federal", "california"]):
            pdf.cell(width, 6, dollars(row[key]), align="R")
        pdf.ln(6)
        write_line(pdf, f"  {row['rule']}", size=7, color=SOFT, height=3.5)
        pdf.ln(1)


def sources(rows):
    """Every source link used in the packet, once each, in order."""
    seen = []
    for row in rows:
        for url in row["source"].split():
            if url not in seen:
                seen.append(url)
    return seen


def packet_pdf(packet, workspace, ruleset):
    summary = packet["summary"]
    opened = open_item_rows(packet, workspace, ruleset)
    planned = purchase_rows(packet, ruleset)
    flagged = flagged_rows(packet)
    standing = summary_rows(packet, ruleset)

    pdf = PacketPDF(packet["company"])
    pdf.add_page()
    write_line(pdf, f"Accountant packet {summary['clock']['tax_year']}", size=20, style="B", height=10)
    write_line(pdf, packet["company"], size=14, color=SOFT, height=7)
    pdf.ln(2)
    write_line(pdf, packet["note"], size=11, style="B")
    write_line(pdf, (f"As of {long_date(packet['as_of'])}. Ruleset {packet['ruleset_version']}. "
                     f"{summary['receipts_filed']} receipts filed. {len(opened)} open items."), size=9, color=SOFT)

    number = 1
    section(pdf, number, "Open items")
    for row in opened:
        item(pdf, row, show_money=True)
    if not opened:
        write_line(pdf, "Nothing open.", color=SOFT)

    if planned:
        number += 1
        section(pdf, number, "Planned purchase (not bought)")
        for row in planned:
            item(pdf, row)

    number += 1
    section(pdf, number, "Flagged, nothing counted")
    for row in flagged:
        item(pdf, row)

    number += 1
    section(pdf, number, "Where things stand")
    write_line(pdf, "Spent is what was paid this year. Federal and California are what each return writes off this year.",
               size=8, color=SOFT, height=4)
    pdf.ln(2)
    summary_table(pdf, standing)

    number += 1
    section(pdf, number, "Sources")
    for url in sources(opened + planned + standing):
        write_line(pdf, url, size=8, color=SOFT, height=4)
    pdf.ln(3)
    write_line(pdf, (f"Every transaction ({len(workspace.transactions)}) with its category and receipt id "
                     "is in the CSV export of this packet."), size=9, color=SOFT)

    return bytes(pdf.output())
