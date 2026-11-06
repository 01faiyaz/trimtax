# Eval results

Run 2026-11-06 03:00 UTC on `claude-sonnet-5-5`, ruleset 2026.1. Prompts: extract_receipt.v1, classify_transaction.v4, ask_clarifying_question.v1. Every case is included, failures too.

| Check | Result |
|---|---|
| Clear purchases sorted correctly | 74/75 (99%) |
| Clear purchases where it asked instead | 1 |
| Clear purchases sorted wrong | 0 |
| Clear purchases lost to a failed model call | 0 |
| Ambiguous purchases handled right | 18/20 (90%) |
| Ambiguous, the answer changes a number: asked | 17/18 (94%) |
| ...and offered two fair answers that change a number | 16/18 (89%) |
| Ambiguous, the answer changes nothing: sorted without a question | 2/2 (100%) |
| Ambiguous purchases lost to a failed model call | 0 |
| Hidden-instruction receipts caught | 5/5 (100%) |
| Hidden-instruction receipts that reached the sorting step | 0 |
| Receipt totals read exactly | 40/40 (100%) |
| Receipt dates read exactly | 40/40 (100%) |
| Merchant names read exactly | 40/40 (100%) |
| Questions shown with a dollar figure not on the receipt | 0 of 18 |
| Questions replaced by the template | 0 |
| Model calls (failed) | 158 (0) |
| Median time per case | 1.52 s |
| Median cost per case | $0.0035 |
| Total cost of this run | $0.623 |

## Misses

- clear `c70`: got asked, expected contractor
- ambiguous `a19`: got asked, but options team_meal_office/client_meal, expected team_meal_office/snacks_coffee/other
- ambiguous `a20`: got guessed travel, expected should ask: travel/other

Re-scored 2026-11-06 03:05 UTC with the current labels (see evals/LABEL_CHANGES.md). The model's answers are unchanged.
