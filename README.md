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
```

`npm run check` must pass before every commit.
