# AU FIRE Planner

A web app for planning financial independence and early retirement (FIRE) in
Australia. See [requirements/REQUIREMENTS.md](requirements/REQUIREMENTS.md) for
what it should do and [PLAN.md](PLAN.md) for how it is being built.

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
