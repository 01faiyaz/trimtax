# TrimTax

Most small businesses find out what their spending meant for taxes in April. By then the year is over and nothing can change. TrimTax keeps the tax file up to date all year, so you can see where you stand while there's still time to do something about it.

It reads your receipts, sorts each purchase, and keeps a running picture of the federal and California rules that matter for a small company: equipment write-offs, the $2,500 small-item rule, meals, contractor forms and research spending. Before a big purchase, you can check what it will do to your taxes. When it can't tell what something was, it asks you one question. Your accountant gets a packet where every number links back to its receipt and the rule behind it.

The short version: **the AI reads and lists the options, plain code does the math and decides what's worth asking, and a person makes the call.**

TrimTax never files anything and doesn't give tax advice. It's a during-the-year view to bring to your accountant.

Built by Team Taxaphobe (Faiyaz Mashrafi and Sean Zhou) for the Berkeley Business Society x Ramp hackathon.

## The demo company

The app opens on Tidewell Labs, a made-up 8-person software company in California, set up as an S corporation. Its books run from Jan 1 to Nov 19, 2026: 400 card transactions, 142 receipt records and 40 receipt images. The demo's "today" is fixed at Nov 19, 2026, which leaves 42 days in the tax year. Every person, amount and receipt is invented, and each receipt image says so at the bottom.

Each visitor gets their own copy of the workspace, so two people trying it at once won't step on each other. "Reset demo" puts it back the way it started.

## What you can try

**Overview.** How many days are left in the tax year, what has to happen before Dec 31, the next deadlines, and where the company stands on each limit.

**Check a purchase.** Say you're about to buy 3 laptops. At $2,899 each, federal lets you write off all $8,697 this year, but California caps equipment write-offs at $25,000 a year. Tidewell has already used $18,400 of that, so California takes $6,600 now and spreads the other $2,097 over later years. At $2,399 each, they fall under the $2,500 small-item line and all $7,197 is written off now on both returns. Same purchase, different answers, and you see that before you buy instead of after.

**Questions.** A $412 Sweetgreen order was delivered to the office for 22 people. Nothing on the receipt says whether it was a team lunch or a client meeting, and the answer matters: a team meal at the office is 0% deductible federally in 2026 and 100% in California, while a client meal is 50% on both. So TrimTax asks. You can also upload your own receipt here and watch it go through the same steps, with a log of every AI call.

**Rules.** Every rule TrimTax uses, with its source, its value and who approved it. Switch between 2025 and 2026 to see what changed: the 1099 line moved from $600 to $2,000, which drops Tidewell from 13 forms to 4, and office team meals went from 50% to 0% federally.

**Accountant packet.** The open items (right now: the Sweetgreen question, a contractor with no W-9, and an unclear California contractor report), the flagged receipts, and which ruleset version produced each number.

Two receipts get refused on purpose. One from a print shop has faint hidden text telling the AI to mark it 100% deductible. It's treated as plain data, flagged and logged, and nothing is counted. The other is a blurry photo with an unreadable total, and TrimTax says "Can't determine" instead of guessing a number.

## How it works

```
receipt image
   |
   v
extract_receipt          AI reads merchant, date, line items and totals.
   |                     Plain code checks the math adds up and looks
   |                     for instructions hidden in the text.
   v
classify_transaction     AI gives its best category, plus any other
   |                     categories the receipt leaves open.
   v
engine/treatment.py      Plain code: are those categories taxed
   |                     differently? If not, use the best pick.
   v
ask_clarifying_question  Only if the answer changes a number. One
   |                     question, two choices, no dollar figure that
   |                     isn't on the receipt.
   v
engine                   Plain Python computes every number from the
                         transactions, the categories and the ruleset.
```

The AI never does arithmetic and never decides a tax rule. It picks from a fixed list of 14 categories, and the engine does the rest.

Every result is in one of three states: **Confirmed**, **Needs one answer**, or **Can't determine**. That last one shows no number at all.

## Why we built it this way

**Code does the math, not the model.** Tax numbers have to be exact and come out the same every time. A model can be right 99 times and wrong on the 100th, and you wouldn't know which. Code has tests. Money is stored in whole cents, so there's no floating-point rounding anywhere.

**Rules are data, not prompts.** Each tax rule lives in `rules/2026.yaml` (and `rules/2025.yaml`) with its value, the date it takes effect, a link to the primary source, and the name of the person who approved it. Every result records which ruleset version produced it, so old answers stay explainable after the rules change.

**Code decides when to ask.** Our first versions let the model decide when it was unsure. It was inconsistent: across runs it asked on anywhere from 8 to 12 of the same 20 unclear purchases. Now the model just lists what a purchase could be, and the engine checks whether those categories are taxed differently. Software versus advertising? Both are deducted in full, so there's nothing to ask. Equipment versus office supplies? That changes how much California equipment room is left, so it asks. This change, plus the prompt rewrite that went with it, took us from 10 to 17 out of 20 on the unclear cases (18 after we fixed one label that was wrong).

**One agent, a few narrow skills.** Three skills today: reading a receipt, sorting it, and writing the question. Small skills with fixed outputs are easier to test and easier to trust than one big prompt or a swarm of agents.

**Receipts are untrusted.** Text on a receipt is data. The model is told to ignore instructions inside it, plain code scans for them too, and the output has a fixed schema. Five hidden-instruction receipts are in the main test set, and two more with new wording are in the held-out set.

**Numbers in AI text are checked.** Every dollar amount in a question the AI writes has to appear on the receipt or in the engine's output. If one doesn't, the text is thrown out and replaced with a plain template.

**Every AI call is logged.** Model, prompt version, ruleset version, time and cost. Receipt text and keys are never logged.

**Web app, not desktop.** Judges click a link. Unsigned desktop apps throw security warnings on both Windows and Mac.

## How well it works

We test on two sets of made-up receipts. The main set has 100 cases: 75 clear purchases, 20 unclear ones and 5 with hidden instructions. We tuned our prompts against it, so its scores are a bit flattering. The held-out set has 29 new cases, written before we ever ran it and never used to tune anything. If you only trust one table, trust that one.

An unclear purchase counts as handled right if TrimTax asks when the answer would change a number (with two fair choices) and doesn't ask when it wouldn't.

| | Main set | Held-out set |
|---|---|---|
| Clear purchases sorted correctly | 74 / 75 | 17 / 17 |
| Clear purchases sorted wrong | 0 | 0 |
| Unclear purchases handled right | 18 / 20 | 8 / 10 |
| Hidden-instruction receipts caught | 5 / 5 | 2 / 2 |
| Questions with a made-up dollar figure | 0 of 18 | 0 of 9 |
| Failed model calls | 0 of 158 | 0 of 38 |
| Median time per case | 1.52 s | 1.44 s |
| Median cost per case | $0.0035 | $0.0035 |

On the main set, it also read the total, date and store name exactly right on all 40 of the demo's receipt images.

Model: `claude-sonnet-5-5`, sorting prompt v4, ruleset 2026.1. Full results, including every miss, are in [`evals/RESULTS.md`](evals/RESULTS.md) and [`evals/HOLDOUT_RESULTS.md`](evals/HOLDOUT_RESULTS.md).

**What it still gets wrong.** Five misses across both sets:

- A freelancer's invoice for "UX research interviews." It's a contractor payment, but the word "research" made it ask whether it was research spending. At least it asked rather than guessed.
- Cakes, paper plates and balloons from Safeway. It offered "team meal or client meal," but this looks like an office party, and a client meal isn't a fair option.
- An Airbnb in Lake Tahoe that sleeps 8. It filed it as travel without asking. It could just as easily have been a team retreat.
- A Topgolf bill. It asked "client entertainment or team meal at the office," but it didn't happen at the office.
- A Regus meeting room. It asked "rent or other." Our engine treats "Other" as unknown, because it holds fines and gifts as well as fees, so any question involving it gets asked even when the answer wouldn't change anything.

**What these numbers don't show.**

- Every receipt is one we drew ourselves, clean and straight. Real phone photos will score lower, and we haven't measured how much.
- The held-out set is small. 8 out of 10 is encouraging, not proof.
- Each purchase gets exactly one category. In real life, a payment to a freelance developer can be both a 1099 contractor payment and research spending.

We changed a label only when the label itself was wrong, never because the model disagreed with it. Every change and the reason for it is in [`evals/LABEL_CHANGES.md`](evals/LABEL_CHANGES.md).

## The tax rules

All values are for tax year 2026, each with its primary source in the rules file.

| Topic | Federal | California |
|---|---|---|
| Equipment | 100% bonus depreciation (bought after Jan 19, 2025), no dollar cap. Section 179 up to $2,560,000. | No bonus depreciation. Section 179 capped at $25,000, shrinks after $200,000 of purchases, can't exceed business income. |
| Small items | $2,500 per item if the business makes the yearly election ($5,000 with audited statements) | Follows federal |
| Team meals at the office | 0% from 2026 | 100% (California didn't adopt the change). Depends on the facts. |
| Client meals | 50% | 50% |
| Client entertainment | 0% | 50% |
| Contractor forms (1099-NEC) | Required at $2,000 per person from 2026 (was $600) | The EDD's DE 542 report still lists $600, so payments from $600 to $1,999 are unclear for 2026. We flag it for the accountant. |
| Research | US deducted now; outside the US spread over 15 years | Both deducted now |

The rules are cited from primary sources (the tax code, IRS revenue procedures and notices, California's tax code, and FTB and EDD guidance). They were checked against those sources and approved by a named team member. They were not reviewed by a CPA. Three rules are still open and shown as open: office snacks and coffee (federal and California) and the FTB's own 1099 line. None of them feeds a demo number.

## What it doesn't cover

Your total tax bill, the QBI deduction, credits, choosing an entity type, states other than California, limits that apply to each S corporation owner personally, and filing anything. Ramp already files 1099s and codes receipts. TrimTax is the during-the-year view: what your spending means for your taxes while there's still time to change it.

## Run it yourself

You need Python 3.11+ and Node 20+.

Tests, from the repo root:

```
pip install -r api/requirements.txt
python -m pytest
```

That runs 138 tests across the data, the engine, the API, the AI pipeline (with a stand-in model, no key needed) and the eval scoring. Some of them are property tests that throw thousands of random purchases at the equipment math.

The API, from `api/`:

```
uvicorn app.main:app --reload
```

Then open http://localhost:8000/docs. Without `DATABASE_URL` it saves to a local SQLite file. With it, Postgres. Receipt uploads need `ANTHROPIC_API_KEY`. Everything else works without one.

The web app, from `web/`:

```
npm install
npm run dev
```

Then open http://localhost:3000/app. It talks to the API at `NEXT_PUBLIC_API_URL` (default http://localhost:8000).

The evals, from the repo root (these call the real model, so they need the key):

```
python evals/run_evals.py                  # main set, about $0.62
python evals/run_evals.py --set holdout    # held-out set, about $0.12
python evals/rescore.py                    # re-score a saved run after a label fix, free
```

Environment variables:

| Name | Where | What it's for |
|---|---|---|
| `ANTHROPIC_API_KEY` | API | Reading and sorting receipts |
| `DATABASE_URL` | API | Postgres. Leave it out to use SQLite. |
| `ALLOWED_ORIGINS` | API | The web app's address, for CORS |
| `TRIMTAX_MODEL` | API | Optional. Defaults to `claude-sonnet-5-5`. |
| `NEXT_PUBLIC_API_URL` | Web | Where the API lives |

## What's where

```
api/engine/   The tax math. Plain functions, one file per topic, no AI.
api/ai/       The three AI skills, the checks around them, and call logging.
api/app/      FastAPI routes and storage. No tax math in here.
rules/        The 2025 and 2026 rulesets as YAML, with sources and approvals.
data/         Tidewell Labs: the generator, the receipt images, and tests that
              fail if any demo number is off by a cent.
evals/        Both test sets, the runner, the scoring, and every run's results.
web/          The Next.js app.
```

Stack: Next.js and TypeScript for the web app, FastAPI and Python for the API, Postgres (Neon) or SQLite for storage, and Anthropic's API with structured outputs for the AI steps.
