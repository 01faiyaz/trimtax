# Rules review sheet

Approving a rule means you opened its source and the value matches the plain-words line.
The app shows "Approved by <name> on <date>" next to each rule, so only approve rules you checked.

**How it works**

1. Go down section A. Open each source and look for the thing under "Check".
   Cornell pages are the law text: use Ctrl+F.
2. Reply "approve all of A" or "approve all of A except <rule ids>".
3. Your name and the date go into `approved_by` / `approved_on` in `rules/2026.yaml`
   (and the matching rules in `rules/2025.yaml`).
4. Section B stays unapproved and shows as "open" on screen.

About 30–40 minutes.

## A. Ready to approve (2026 values)

### Equipment

| # | Rule | Value | Source | Check |
|---|---|---|---|---|
| 1 | `fed_bonus_depreciation` | 100% for equipment acquired after Jan 19, 2025 | [IRC 168(k)](https://www.law.cornell.edu/uscode/text/26/168) | Ctrl+F "January 19, 2025": the percentage after it is 100 percent |
| 2 | `fed_section_179` | $2,560,000, shrinks after $4,090,000 | [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) | Ctrl+F "179": 2026 amounts $2,560,000 and $4,090,000 |
| 3 | `ca_bonus_depreciation` | California allows none | [CA R&TC 17250](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=17250) | Ctrl+F "168(k)": it doesn't apply |
| 4 | `ca_section_179` | $25,000, shrinks after $200,000, limited to business income | [CA R&TC 17255](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=17255) | Ctrl+F "25,000" and "200,000" |
| 5 | `placed_in_service_deadline` | In use by Dec 31, 2026 | [IRC 179(a)](https://www.law.cornell.edu/uscode/text/26/179) | Deduction is for property "placed in service" during the year |

### Small items

| # | Rule | Value | Source | Check |
|---|---|---|---|---|
| 6 | `de_minimis_safe_harbor` | $2,500 per item ($5,000 with audited statements); yearly election; California follows | IRS Notice 2015-82 + [Treas. Reg. 1.263(a)-1](https://www.ecfr.gov/current/title-26/section-1.263(a)-1) | Search "Notice 2015-82 de minimis 2,500". The regulation itself still says $500; that's expected |

### Meals

| # | Rule | Value | Source | Check |
|---|---|---|---|---|
| 7 | `fed_team_meals_office` | 0% from 2026 | [IRC 274(o)](https://www.law.cornell.edu/uscode/text/26/274) | Ctrl+F "(o)": convenience-of-employer meals and eating facilities, no deduction |
| 8 | `fed_client_meals` | 50% | [IRC 274(n)(1)](https://www.law.cornell.edu/uscode/text/26/274) | Ctrl+F "50 percent" |
| 9 | `ca_client_meals` | 50% | California follows IRC 274(n) (R&TC 17201) | Same 50% as federal |
| 10 | `fed_client_entertainment` | 0% | [IRC 274(a)(1)](https://www.law.cornell.edu/uscode/text/26/274) | Entertainment isn't deductible |
| 11 | `ca_client_entertainment` | 50% | [FTB Publication 984](https://www.ftb.ca.gov/forms/misc/984.html) | Comparison chart, Entertainment row: limited to 50% |

### Contractors

| # | Rule | Value | Source | Check |
|---|---|---|---|---|
| 12 | `fed_1099_nec_threshold` | $2,000 for 2026 payments (was $600) | [IRC 6041](https://www.law.cornell.edu/uscode/text/26/6041) | Ctrl+F "2,000" (if it still shows $600, search "OBBBA 70433 1099 $2,000") |
| 13 | `fed_backup_withholding` | 24% without a W-9 | IRC 3406 | Search "IRS backup withholding rate 24%" |
| 14 | `ca_de542_report` | $600, within 20 days, individuals and sole proprietors | [EDD](https://edd.ca.gov/en/payroll_taxes/Independent_Contractor_Reporting) | $600 and 20 days on the page |

### Research

| # | Rule | Value | Source | Check |
|---|---|---|---|---|
| 15 | `fed_research_us` | US research deducted now | [IRC 174A](https://www.law.cornell.edu/uscode/text/26/174A) | Domestic research expenditures are deductible |
| 16 | `fed_research_foreign` | Offshore research over 15 years | [IRC 174](https://www.law.cornell.edu/uscode/text/26/174) | Ctrl+F "15-year" |
| 17 | `ca_research_all` | California deducts both now | [Baker Tilly summary](https://www.bakertilly.com/insights/californias-2025-irc-conformity-update) | US and non-US research stay immediately deductible in California |

### Deadlines

| # | Rule | Value | Check |
|---|---|---|---|
| 18 | `owners_q4_estimate` | Jan 15, 2027 | 4th estimated payment is due Jan 15 of the next year (a Friday in 2027) |
| 19 | `fed_1099_nec_due` | Feb 1, 2027 | Due Jan 31; Jan 31, 2027 is a Sunday, so Monday Feb 1 |

### 2025 file (`rules/2025.yaml`)

Same rules and sources. Values that differ from 2026:

- `fed_section_179`: $2,500,000 / $4,000,000 (search "OBBBA section 179 2,500,000")
- `fed_bonus_depreciation`: 40% if bought before Jan 20, 2025
- `fed_team_meals_office`: 50% (274(o) starts in 2026)
- `fed_1099_nec_threshold` and `ca_de542_report`: $600, no unclear gap
- Deadlines: Jan 15, 2026 and Feb 2, 2026 (Jan 31, 2026 was a Saturday)

"Approve all of A" covers the matching 2025 rules too.

## B. Leave open for now

- `ca_team_meals_office` (100%): **decision needed**, see below.
- `ca_ftb_1099_threshold` ($2,000): no FTB page found. The engine doesn't use it for any number.
- `fed_snacks_coffee` / `ca_snacks_coffee`: not in any demo number.

### Decision: California office team meals

- **On screen:** 100% in California.
- **Why it's probably right:** California still follows the pre-2018 federal meals rules. Under those,
  meals served to the team on site for the company's convenience were fully deductible. The Sweetgreen
  lunch was delivered to the office for the team, so 100% fits.
- **Why it's not certain:** one firm says California generally allows 50%, and the FTB's SB 711 chart
  (page 11, row 13304) couldn't be read from the build environment.
- **Options:**
  1. Approve 100% with the "depends on the facts" note (already on screen). Fastest.
  2. Open the [FTB SB 711 PDF](https://www.ftb.ca.gov/tax-pros/law/legislation/2025-2026/SB711-FINAL.pdf),
     page 11, row 13304. An X under "Not Conform" supports 100%.
  3. Switch to 50%. Changes the "100% California" text in several places.
