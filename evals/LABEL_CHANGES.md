# Label changes

Labels were changed only where the label itself was wrong. Every change is listed here,
with the run it came after. A miss the model should have handled stays in the set.

## After run 1 (Nov 5, 2026)

- **a12** (Blue Bottle, coffee and pastries for 6): added `team_meal_office` as a fair
  answer. Coffee for six people could be the team as easily as a client.
- **a17** (Harry & David gift baskets): replaced. Our own category list puts gifts under
  `other`, so "other" was the right answer, not a guess. New case: Eventbrite sponsor
  table (advertising or client entertainment).
- **a20** (Alex Moreno, consulting invoice): replaced. A consulting invoice from a person
  is a contractor payment by our own list, so "contractor" was right. New case: Airbnb in
  Lake Tahoe for 8 (travel or other).

Kept as real misses: a06 and a18 (mixed receipts sorted as office supplies), a09
(Upwork payment sorted as contractor without asking where the work was done), and the
three office meal deliveries (a01, a02, a04), which the model sorted as team meals
without anything on the receipt saying who ate.

## After run 3 (Nov 5, 2026): a scoring change, not a label change

No labels changed. What changed is when a question counts as the right move.

The app now asks only when the fair answers would be treated differently: a different
deduction, limit or form (engine/treatment.py). The scoring uses that same check on each
case's fair answers:

- The answers are treated differently: it should ask, with two fair answers that are
  treated differently. 18 of the 20 cases.
- The answers are treated the same: it should pick one of them without asking. 2 cases:
  a13 (WeWork, rent or travel) and a14 (LinkedIn, software or advertising).

"Other" is never treated as the same as anything, because it holds fines and gifts as well
as fees and insurance. So every case with "other" as a fair answer still expects a question.

Run 3 scored again this way: 12/20 handled right (it was 10/20 with fair options under
the old scoring). The 2 extra are a13 and a14, which it sorted without asking.

## After run 4 (Nov 5, 2026)

- **a09** (Upwork, "Payment to Mateusz K.: mobile app work, 40 hours"): added
  `research_us` as a fair answer. The receipt doesn't say where the work was done, and
  our own sorting rule (since prompt v3) says not to guess that from a person's name.
  The label had assumed offshore from the name, which is the guess the rule forbids.
  Run 4 offered contractor or US research, which is fair under the corrected label.

Kept as real misses: c70 (UX research interviews from a freelancer, asked instead of
sorting as contractor), a19 (cakes, plates and balloons: offered team meal or client
meal, but a client meal isn't a fair answer), a20 (Airbnb for 8 in Lake Tahoe, guessed
travel).

From here on, prompts are not tuned against this set. A separate held-out set
(evals/holdout_cases.py) was written before any held-out run and is reported on its own.
