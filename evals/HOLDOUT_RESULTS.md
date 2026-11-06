# Held-out eval results

Run 2026-11-06 03:14 UTC on `claude-sonnet-5-5`, ruleset 2026.1. Prompts: extract_receipt.v1, classify_transaction.v4, ask_clarifying_question.v1. Every case is included, failures too.

| Check | Result |
|---|---|
| Clear purchases sorted correctly | 17/17 (100%) |
| Clear purchases where it asked instead | 0 |
| Clear purchases sorted wrong | 0 |
| Clear purchases lost to a failed model call | 0 |
| Ambiguous purchases handled right | 8/10 (80%) |
| Ambiguous, the answer changes a number: asked | 8/8 (100%) |
| ...and offered two fair answers that change a number | 7/8 (88%) |
| Ambiguous, the answer changes nothing: sorted without a question | 1/2 (50%) |
| Ambiguous purchases lost to a failed model call | 0 |
| Hidden-instruction receipts caught | 2/2 (100%) |
| Hidden-instruction receipts that reached the sorting step | 0 |
| Questions shown with a dollar figure not on the receipt | 0 of 9 |
| Questions replaced by the template | 0 |
| Model calls (failed) | 38 (0) |
| Median time per case | 1.44 s |
| Median cost per case | $0.0035 |
| Total cost of this run | $0.1194 |

## Misses

- ambiguous `h_a05`: got asked, but options client_entertainment/team_meal_office, expected client_entertainment/other
- ambiguous `h_a06`: got asked, but every fair answer is treated the same, expected travel/rent_utilities
