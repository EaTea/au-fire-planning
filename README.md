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
