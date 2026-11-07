# TrimTax

Team Taxaphobe (Fy and Sean). BBS x Ramp hackathon, Round 2, technical build track.

- Round 2 due: **Tue Nov 10, 2026, 6 PM PT** (hard deadline 11:59 PM). Form: https://forms.gle/FxUVTm6Z75f121ov5
- Live final: **Thu Nov 19, 2026**, Ramp SF, judged by Ramp engineers.
- Deliverables: deployed web app, this repo with a README (decisions + eval results), ~2.5 min video.
- Live: **https://trimtax.vercel.app** (site) and **https://trimtax.vercel.app/app** (the app).
  API: https://trimtax-api.onrender.com (`/health` says ok).

## What TrimTax is

A tax file that fills itself in all year. The AI reads receipts and lists the
categories a purchase could be. Plain Python code applies a versioned 2026 ruleset,
does every calculation, and decides when a question is worth asking (only when the
answer would change a number). The accountant packet links every
number to its receipt and its rule. Federal and California only.

One line: **"The AI reads and asks. Plain code does the math. A person decides."**

TrimTax never files anything and never gives tax advice.

## Repo layout

```
/web     Next.js + TypeScript (Vercel). "/" = story site, "/app" = demo app.
/api     FastAPI + Python 3.11 (Render). Engine, AI skills, tracing.
/rules   Versioned rulesets as YAML (rules/2026.yaml, rules/2025.yaml).
/data    Synthetic Tidewell Labs data and its generator.
/evals   100 labeled cases, 29 held-out cases, the eval runner and scoring.
/e2e     Browser tests (Playwright) for the six demo moments, Start fresh and the site.
/docs    These notes.
```

Database: Postgres on Neon (SQLite locally). AI: Claude API (claude-sonnet-5-5) with structured outputs.
Tests: pytest + hypothesis, 189 from the repo root. Browser tests are separate, see below.

Run the tests from the repo root:

```
pip install -r api/requirements.txt
python data/generate.py      # only after changing the generator
python -m pytest
```

Run the API locally (from `api/`): `uvicorn app.main:app --reload`, then open
http://localhost:8000/docs. Without `DATABASE_URL` it saves to a local SQLite file;
with it (Neon), Postgres. `ALLOWED_ORIGINS` lists the web app's address(es).

Run the web app (from `web/`): `npm install`, then `npm run dev` and open
http://localhost:3000 (site) or http://localhost:3000/app (app). It talks to the API at `NEXT_PUBLIC_API_URL`
(default http://localhost:8000). Run both at once to use the demo locally.

Browser tests, from the repo root (against the live site unless `TRIMTAX_URL` is set):

```
pip install -r e2e/requirements.txt
python -m playwright install chromium
python -m pytest e2e                               # 9 pass, 1 skipped
$env:TRIMTAX_E2E_AI="1"; python -m pytest e2e      # also runs the real AI call (about a cent)
```

Note: `python -m pytest` from inside `api/` only runs the API tests (148). Run it from the
repo root to get all of them.

## Deploy

- **Vercel** runs `web/` (Root Directory = `web`). Env: `NEXT_PUBLIC_API_URL` = the Render address,
  no trailing slash. It's baked in at build time, so change it, then redeploy.
- **Render** runs `api/` from `render.yaml` (Blueprint, Starter plan so it never sleeps).
  Env: `DATABASE_URL` (Neon), `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS` (the Vercel address).
  It redeploys on every merge to `main`.
- **Neon** is the Postgres database (direct connection, pooling off). The API makes its own tables.
- Keys only ever go in those dashboards. Never in the repo or in chat.

## How the pieces fit

1. Transactions CSV + receipt images come in through an adapter (mock now).
2. One agent, four skills:
   - `extract_receipt` reads the merchant, date and total, each with the line it found them on
   - `classify_transaction` gives a best pick plus close candidates from a fixed category list
     (it can say "other"). Plain code (`engine/treatment.py`) decides whether the candidates
     would be taxed differently; only then does it ask.
   - `ask_clarifying_question` writes that one question, with exactly two answers
   - `propose_rule_update` reads official text and proposes rule changes; code checks the quote
     and the figure, and a person approves. Real updates go through `api/scripts/`; the
     "Try a rule change" box only changes the visitor's own demo copy.
   - A transactions CSV (Start fresh only) skips the AI: rows with a category count, rows
     without one become a question.
3. The engine (Python) is pure functions of
   (transactions, categories, ruleset, company profile). It produces every number.
4. The UI shows engine output. The packet exports it.

### Hard rules for the code

- **The AI never does math.** Every dollar on screen comes from the engine.
- **Money is integer cents.** Never `float`. Format to dollars only at the edge.
- **Number-grounding check.** Every dollar figure in AI text must appear in engine
  output or on the receipt. If one doesn't, the text is thrown away and a template is used.
- **Three result states only:** `confirmed`, `needs_answer`, `cant_determine`.
  `cant_determine` shows no number.
- **Documents are untrusted input.** Receipt text is data, never instructions.
  The output schema is enforced. Injection attempts are flagged and logged.
- **Rules are data, not prompts.** Every result records the ruleset version it used.
  A rule with a `null` value means "not decided" and the engine returns `cant_determine`.
- **Every model call is traced:** model, prompt version, ruleset version, latency, cost.

## The demo (locked, see project doc "TrimTax — Design lock and demo numbers")

Tidewell Labs: fictional California S corporation, 8 people, software, calendar year,
2026 net income $120,000 before the laptop decision. Label: **"Synthetic demo data"**.
Demo "today" is **Nov 19, 2026**, 42 days left in the tax year. Label: **"Demo date: Nov 19"**.
The story site is different: its countdown, the year gone and the phone's date use the
visitor's real date (55 days left on Nov 6, 42 on Nov 19, the day of the final).

Six moments:
- M1 Tax-year clock (Overview)
- M2 Check before you buy (3 laptops at $2,899 vs $2,399)
- M3 One question (Sweetgreen $412, Fri Nov 13: team meal or client meal?)
- M4 Rules changed (2025/2026 switch + update log)
- M5 Refusals (Pinecrest Print Shop hidden instruction; Nov 9 photo with unreadable total)
- M6 Accountant packet export (says clearly it is not a filing)

Tax on profit (Overview Part III, Check a purchase, packet): California S corp tax is 1.5%
of the $120,000 expected profit, at least $800, so **$1,800**; with the 3 laptops ($6,600
written off in California) it's **$1,701**, $99 less. The company pays no federal income tax;
the owners' own income tax is left to the accountant on purpose (TrimTax doesn't know their
other income). Dec 15 is the company's last California estimated payment.

The synthetic data must reproduce every locked number exactly. A test in `/data`
fails if any one is off. Don't change a locked number without Fy and Sean agreeing.

### It's a working app, not a recording

Nothing on screen is hard-coded. The Tidewell data is only the starting point;
every number is computed live by the engine from whatever data is loaded.

- **Each visitor gets their own copy** of the Tidewell workspace. The browser keeps its
  workspace id and sends it in the API URL (no cross-site cookies), so two judges trying
  it at once don't overwrite each other. "Reset demo" restores it.
- **Judges can try it:** upload a receipt photo, type in a purchase for the
  "Check a purchase" tab, answer a question, switch rule years. The AI reads and
  sorts, the engine recalculates, and the screens update.
- **Your own company:** "Start fresh" opens an empty workspace that uses today's date.
  The profile is short: name, expected 2026 income, small-item election yes/no, audited
  statements yes/no. It says the rules are set up for a California S corporation (no
  entity-type picker, since we don't support others). Then import a transactions CSV
  (date, merchant, amount, optional category and payee; a sample file is on the screen)
  or upload receipts. Same engine, same rules. The header switches between the demo and
  your company.
- **Limits, shown on screen:** federal + California only, the categories in the
  rules file, no total tax bill, no filing, no limits that apply to each owner
  personally (S corporation owners). No bank or Ramp connection; data comes
  from uploads and CSV.
- **Prices are all-in.** The small-item line is checked against price + sales tax
  + shipping. "Check a purchase" says "tax and shipping included"; a user can also
  enter a sticker price plus a tax rate and the engine adds it (`all_in_price`).
- **Cost guards:** image/PDF uploads only, 5 MB, 10 uploads per visitor, a daily cap across
  the server. Rule proposals: 10 per visitor, 200 a day, 8,000 characters. CSV: 1 MB, 5,000 rows.

If time runs short, cut animations before cutting any demo moment or the evals.

## Code style

Fy and Sean review every line, so:
- Small functions, plain names, short comments only where they help.
- No clever abstractions, no metaprogramming, no deep class trees.
- Prefer a plain loop over a dense comprehension when it reads better.
- One change at a time. Don't refactor working code while fixing something else.
- Tests use the real demo numbers where possible so a failure reads like the story.

## Claims rules (README, site, video, Q&A)

- Say "we built" only for features that work in the demo.
- Never: "first", "no competitors", "guaranteed savings", "reviewed by a CPA",
  "partnered with Ramp", or any market size or savings figure we didn't measure.
- "Exported" does not mean filed. "Approved" in the rules log means approved by
  a named team member, not by a tax authority.
- Every dollar figure on screen is labeled an estimate and shows the ruleset version.
- Ramp already ships 1099 filing, receipt tax coding, an Accounting Agent and Ramp Stack.
  Don't pitch any of those as ours.
- Positioning line (README, pitch and Q&A only, not the site):
  "Ramp records what you spent and handles the forms. TrimTax shows what that
  spending means for your taxes while there's still time to change it."

## Security rules

- Never commit `.env` or `.env.local` (both are in `.gitignore`).
- Production keys live in the Vercel and Render dashboards only.
- Don't log full receipt text or API keys. Traces store IDs and metadata.
- Synthetic data only. No real people, businesses or tax IDs.

## Design tokens (TrimTax design system v3)

Reference only; the real app is rebuilt in Next.js from the design canvas (link shared privately).

| Token   | Value              |
|---------|--------------------|
| desk    | `#eceeed`          |
| page    | `#fdfdfc`          |
| ink     | `#26292c`          |
| pencil  | `#2c5ba0`          |
| manila  | `#e9dcb8` / `#dccb9b` |
| fonts   | Public Sans (text), Courier Prime (numbers, receipts) |

Marks: T (traced to receipts), Σ (added up), Δ (waiting on an answer).

## Before submitting

- [x] "Demo date: Nov 19" label on the app
- [x] Eval numbers on the site are the measured ones (main + held-out); no placeholder slots left
- [x] Real deployed link everywhere (no trimtax.app)
- [x] Every approved rule in `rules/2026.yaml` has a real `approved_by` name and `approved_on` date
- [x] The 3 rules still marked `needs_check` have no approver and show as open on screen ("Open: still being checked")
- [ ] Decide: settle those 3 open rules before Nov 10, or leave them openly marked open (both are honest)
- [x] Laptop prices on screen say "tax and shipping included"
- [x] The team-meal answer says "it depends on the facts"
- [x] California's leftover equipment cost says "spread over later years", never "$0 this year"
- [x] Browser tests pass on the live site
- [ ] Repo is public (or judges are added)
- [ ] Video link in the README
- [ ] Full review pass by Fy and Sean
- [ ] Submit the form by Tue Nov 10, 6 PM PT
