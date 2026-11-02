# TrimTax

Team Taxaphobe (Fy and Sean). BBS x Ramp hackathon, Round 2, technical build track.

- Round 2 due: **Tue Nov 10, 2026, 6 PM PT** (hard deadline 11:59 PM). Form: https://forms.gle/FxUVTm6Z75f121ov5
- Live final: **Thu Nov 19, 2026**, Ramp SF, judged by Ramp engineers.
- Deliverables: deployed web app, this repo with a README (decisions + eval results), ~2.5 min video.

## What TrimTax is

A tax file that fills itself in all year. The AI reads receipts and sorts purchases.
Plain Python code applies a versioned 2026 ruleset and does every calculation.
When the AI isn't sure, it asks one question. The accountant packet links every
number to its receipt and its rule. Federal and California only.

One line: **"The AI reads and asks. Plain code does the math. A person decides."**

TrimTax never files anything and never gives tax advice.

## Repo layout

```
/web     Next.js + TypeScript (Vercel). "/" = story site, "/app" = demo app.
/api     FastAPI + Python 3.11 (Render). Engine, AI skills, tracing.
/rules   Versioned rulesets as YAML (rules/2026.yaml, rules/2025.yaml).
/data    Synthetic Tidewell Labs data and its generator.
/evals   100 labeled cases and the eval runner.
```

Database: Postgres on Neon. AI: Claude API with structured outputs.
Tests: pytest + hypothesis (engine), Playwright (the six demo moments).

## How the pieces fit

1. Transactions CSV + receipt images come in through an adapter (mock now).
2. One agent, five skills:
   - `extract_receipt` reads line items, each with the source page and excerpt
   - `classify_transaction` picks from a fixed category list and is allowed to abstain
   - `ask_clarifying_question` runs when classification abstains (one question only)
   - `explain_meter` writes plain-English text built only from engine output
   - `propose_rule_update` proposes a rule change; a person approves it
3. The engine (Python) is pure functions of
   (transactions, categories, ruleset, company profile). It produces every number.
4. The UI shows engine output. The packet exports it.

### Hard rules for the code

- **The AI never does math.** Every dollar on screen comes from the engine.
- **Money is integer cents.** Never `float`. Format to dollars only at the edge.
- **Number-grounding check.** Every dollar figure in AI text must appear in engine
  output or on the receipt. If not, regenerate once, then fall back to a template.
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

Six moments:
- M1 Tax-year clock (Overview)
- M2 Check before you buy (3 laptops at $2,899 vs $2,399)
- M3 One question (Sweetgreen $412, Fri Nov 13: team meal or client meal?)
- M4 Rules changed (2025/2026 switch + update log)
- M5 Refusals (Pinecrest Print Shop hidden instruction; Nov 9 photo with unreadable total)
- M6 Accountant packet export (says clearly it is not a filing)

The synthetic data must reproduce every locked number exactly. A test in `/data`
fails if any one is off. Don't change a locked number without Fy and Sean agreeing.

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

- [ ] "Demo date: Nov 19" label on the app
- [ ] Fill the "[after Nov 7]" eval slots with measured results, or remove them
- [ ] Replace the placeholder trimtax.app with the real deployed link
- [ ] Every rule in `rules/2026.yaml` has a real `approved_by` name and `approved_on` date
- [ ] Rules with `check_status: needs_check` are resolved or shown as open on screen
