# AU FIRE Planner

A web app for planning financial independence and early retirement (FIRE) in
Australia. See [requirements/REQUIREMENTS.md](requirements/REQUIREMENTS.md) for
what it should do and [PLAN.md](PLAN.md) for how it is being built.

## What it does

Everything is calculated in your browser and saved only on your device.

- **Household:** enter your current age, target retirement age and the age the
  plan runs until.
- **Income & expenses, Assets, Assumptions:** enter your living expenses, how
  much you spend in retirement, dated and one-off expenses (a car, school
  fees), your portfolio (value, expected return and yearly contributions), cash
  savings, inflation, the interest rate on cash and your safe withdrawal rate.
- **Income & expenses, salary:** your gross (before-tax) salary and how it
  grows (with inflation, inflation plus or minus a margin, a fixed rate, or not
  at all). It stops at your target retirement age and shows in Year by year;
  it sets your employer super contributions, but doesn't pay for living
  expenses until tax is modelled.
- **Assets, super:** your super balance, its return net of fees, the employer
  contribution rate (the legislated rate unless you change it), and optional
  salary sacrifice and after-tax (non-concessional) contributions with start
  and end years. Contributions are taxed 15% going in and earnings at 15%
  (or a lower effective rate you enter). Super counts towards investable net
  worth. Employer contributions stop at retirement. The statutory rates live
  in dated data files, not in code.
- **Household, super access age:** "Super accessible at" is when your super
  can be drawn. It is usually 65. You can choose 60 to 64 (your preservation
  age onwards) if you'll have retired by then; super then opens at that age,
  or the year after you retire if that is later, and at 65 regardless. A year
  before it opens that only super could fund shows as a shortfall in Year by
  year, which says "super locked until" that age.
- **Results:** your FI number (in today's dollars, and in nominal dollars at
  your retirement age), your progress to it, the year you reach FI, and
  whether your money lasts to the age you plan until (or the age it runs out),
  and the earliest age you could retire and still have the money last, each
  with a "How is this calculated?" breakdown. A chart of investable net worth
  against the FI number, in today's or nominal dollars, marks the FI year and
  retirement and shades any years that can't be funded; hover for the values,
  or click a year to jump to it in the table below.
- **Results, Coast FIRE:** the savings you need today so that, with no more
  contributions, you still reach your FI number by retirement (in today's
  dollars and in the retirement year's dollars), and whether you've reached it
  or the year you will on your current contributions. A Milestones timeline
  lists Coast FIRE, FI reached, retirement and whether the money lasts, in
  year order. A second chart, "When could you stop contributing?", plots your
  savings on current contributions, today's savings with no more
  contributions, the Coast FIRE number and the FI number up to retirement;
  hover for the values, or click a year to jump to it in the table.
- **Results, the bridge:** "Can you bridge to super?" checks the years you are
  retired before super opens: whether your portfolio and cash cover them (the
  bridge), and whether super plus what is left covers the years after. Each
  part reads MET or SHORT, with the short years listed. A "Super accessible"
  milestone marks the year super opens. A "Bridge period" chart stacks
  outside-super money and super by year, with the bridge years shaded.
- **Results, Coast FIRE split:** "Super and outside super" asks two stricter
  Coast FIRE questions: what you need today outside super to fund the bridge,
  and what you need in super to fund the years after it on its own, each with
  the year you reach it. The combined Coast FIRE above stays the overall answer.
- **Results, year by year:** at the bottom of Results, the projection of cash
  and the portfolio, one row per year to the plan-until age. Retirement
  spending is drawn from cash first, then the portfolio. The year FI is
  reached is highlighted, and years that can't be funded are flagged. One
  today's/nominal toggle at the top of Results covers the whole page.

Tax and property aren't modelled yet; see
[PLAN.md](PLAN.md) for what comes next.

## Project layout

```
src/
  engine/        pure calculations: projection, FI and Coast FIRE figures
  rules/         statutory rules as dated data (NFR-3): wire schema, RuleSet,
                 rulesForYear, and data/fy*.json, one file per financial year
  plan/          Plan types, reducer, defaults
  persistence/   saved-plan wire types, migrations, IndexedDB store
  ui/            screens and shared components
tests/           end-to-end tests (Playwright) and fixtures
```

## How to add next year's rules

Statutory rates and thresholds live in `src/rules/data/`, not in calculation
code. When the ATO publishes a new financial year's figures:

1. Copy the latest file, e.g. `src/rules/data/fy2025-26.json`, to
   `fy2026-27.json`.
2. Update `financialYear`, `effectiveFrom` (the first day the rules apply, e.g.
   `2026-07-01`) and every value. Percentages are written as percentages (12,
   not 0.12) and the contribution base is the per-quarter amount.
3. Give every value a `sources` link to the page you checked it against. Set
   `verification.status` to `"verified"` only once you have opened each page
   and confirmed the value; otherwise leave it `"unverified"` with a note.
4. Run `npm test`. A test parses every file in the folder, so a missing field
   or a negative rate fails there. No code changes are needed: the new file is
   picked up automatically, and replaces the inflation estimate the app uses
   for years after the previous latest file.

## Prerequisites

- Node 22 (see `.nvmrc`)
- npm

## Install

```sh
npm ci
```

## Run

```sh
npm run dev
```

Then open <http://localhost:5173/au-fire-planning/>.

## Build and preview

```sh
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Checks

```sh
npm run typecheck      # TypeScript type-check
npm run lint           # ESLint
npm run format         # rewrite files with Prettier
npm run format:check   # verify formatting without changing files
```

## Tests

```sh
npm test               # run unit and component tests once (Vitest)
npm run test:watch     # re-run tests on every change
npm run check          # type-check, lint, format check and tests
npm run test:e2e       # end-to-end tests in a real browser (Playwright)
```

The end-to-end tests build the app, serve it with `vite preview` on port 4173
and drive it in Chromium. Install the browser once with:

```sh
npx playwright install chromium
```

If Chromium is already installed on your machine, skip that and point
Playwright at it instead:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:e2e
```

`npm run check` (which does not include the end-to-end tests) must pass before
every commit.

## Continuous integration

Every pull request (and any manual run from the Actions tab) runs
`.github/workflows/ci.yml`, which has two jobs that run in parallel:

- **check**: `npm ci` then `npm run check` (type-check, lint, format check and
  unit/component tests).
- **e2e**: `npm ci`, installs Chromium with
  `npx playwright install --with-deps chromium`, then `npm run test:e2e`. If
  it fails, the Playwright HTML report and `test-results/` are uploaded as the
  `playwright-report` artifact.

A new push to the same branch cancels the run still in progress for it.

## Deployment

Every merge to `main` runs `.github/workflows/deploy.yml`, which performs the
same checks as CI (`npm run check` and `npm run test:e2e`), builds the app and
publishes it to <https://eatea.github.io/au-fire-planning/>. You can also run
it by hand from the Actions tab.

One-off setup: in the repository, go to Settings → Pages and set Source to
"GitHub Actions".

Everything runs in the browser, and no data is sent anywhere.
