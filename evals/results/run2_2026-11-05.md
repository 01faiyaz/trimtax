# Eval results

Run 2026-11-06 00:13 UTC on `claude-sonnet-5-5`, ruleset 2026.1. Prompts: extract_receipt.v1, classify_transaction.v3, ask_clarifying_question.v1. Every case is included, failures too.

| Check | Result |
|---|---|
| Clear purchases sorted correctly | 75/75 (100%) |
| Clear purchases where it asked instead | 0 |
| Clear purchases sorted wrong | 0 |
| Clear purchases lost to a failed model call | 0 |
| Ambiguous purchases where it asked instead of guessing | 8/20 (40%) |
| ...and offered two fair answers | 7/20 (35%) |
| Ambiguous purchases lost to a failed model call | 3 |
| Hidden-instruction receipts caught | 5/5 (100%) |
| Hidden-instruction receipts that reached the sorting step | 0 |
| Receipt totals read exactly | 40/40 (100%) |
| Receipt dates read exactly | 40/40 (100%) |
| Merchant names read exactly | 40/40 (100%) |
| Questions shown with a dollar figure not on the receipt | 0 of 8 |
| Questions replaced by the template | 0 |
| Model calls (failed) | 148 (3) |
| Median time per case | 1.71 s |
| Median cost per case | $0.0036 |
| Total cost of this run | $0.6185 |

## Misses

- ambiguous `a03`: got a failed model call, expected should ask: team_meal_office/client_meal/other
- ambiguous `a07`: got guessed client_entertainment, expected should ask: client_entertainment/other
- ambiguous `a08`: got a failed model call, expected should ask: equipment/office_supplies
- ambiguous `a09`: got guessed contractor, expected should ask: contractor/research_offshore
- ambiguous `a10`: got guessed contractor, expected should ask: contractor/research_us
- ambiguous `a11`: got a failed model call, expected should ask: travel/client_meal
- ambiguous `a13`: got guessed rent_utilities, expected should ask: rent_utilities/travel
- ambiguous `a14`: got guessed software, expected should ask: software/advertising
- ambiguous `a15`: got guessed other, expected should ask: travel/advertising/other
- ambiguous `a17`: got guessed advertising, expected should ask: advertising/client_entertainment
- ambiguous `a18`: got guessed office_supplies, expected should ask: office_supplies/equipment/rent_utilities/other
- ambiguous `a19`: got asked, but options team_meal_office/client_meal, expected team_meal_office/snacks_coffee/other
- ambiguous `a20`: got guessed travel, expected should ask: travel/other
