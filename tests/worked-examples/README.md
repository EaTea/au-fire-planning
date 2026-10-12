# Worked examples

Each `*.json` file here holds scenarios whose expected figures were worked out
**independently of the code** (NFR-6), so a bug in the calculation can't hide by
being wrong in the same way as its test. `tests/unit/workedExamples.test.ts`
loads every file in this folder and checks the engine against it to the cent.

## Fixture format

```json
{
  "milestone": "M1",
  "description": "What the file covers.",
  "scenarios": [
    {
      "name": "Short scenario name",
      "checkedBy": "hand calculation",
      "inputs": { "...": "what the user entered; null means 'not set' (default used)" },
      "arithmetic": ["Each step of the calculation, written out in words and numbers"],
      "expected": { "...": "expected figures, in dollars or as fractions (0.45 = 45%)" }
    }
  ]
}
```

- `inputs` uses the user's own units (dollars per year, fractions such as
  `0.04`). `null` means the user left it unset, so the default applies.
- `checkedBy` says how the figures were independently verified (for example
  `"hand calculation"`, or a named external calculator or spreadsheet).
- `arithmetic` is the working, so a reviewer can re-check it without running code.
- Figures are compared to the nearest cent (within half a cent).
- Files with a projection (M2 onward) add a top-level `startYear`: the
  calendar year of row 0 (today). Their `expected.rows` lists only the rows
  worth checking, each with only the fields worth checking, and
  `expected.fiReached` is the first row where the balance reaches the FI
  number (absent if it's never reached).
- M3 fixtures (`m3-drawdown.json`) add inputs `projectionEndAge`,
  `cashBalance`, `interestRate` and `datedExpenses` (each
  `{ name, annual, fromYear, toYear }`, `annual` in today's dollars), and
  expected row fields `cashInterest`, `cashClosing`, `spending`, `fromCash`,
  `fromPortfolio` and `shortfall`, `fiReached.investableClosing`, and a
  `solvency` answer (`lasts` with `investableClosing`, or `runsOut` with
  `year`, `age`, `shortfallYears` and `shortfall`), and an
  `earliestRetirement` answer (`feasible` with `age` and `year`).
- M4 fixtures (`m4-coast.json`) add an `expected.coast` answer: `number` (the
  Coast FIRE number in today's dollars), `numberInRetirementYearDollars`,
  `reached` (`yearIndex`, `calendarYear`, `age`, `investable` and
  `coastNumber` in that year, or `null` when it isn't reached before
  retirement) and optionally `rows` (`yearIndex`, `investable`,
  `coastNumber`) for rows worth checking by hand.

- M5 fixtures (`m5-super.json`) add inputs `salaryAnnual` and `salaryGrowth`
  (an internal `SalaryGrowth`, e.g. `{ "kind": "inflationPlus", "margin": 0.01 }`)
  and `expected.salaryRows` (`yearIndex`, `salary`). Step 5 adds the input
  `superAccount` (an internal `SuperAccount`: `balance`, `returnRate`,
  `employerRate`, `salarySacrifice` and `nonConcessional` with `annual`,
  `fromYear`, `toYear`, `earningsTaxRate`) and `expected.superRows`
  (`yearIndex` plus any of `salary`, `employerContribution`,
  `salarySacrifice`, `nonConcessional`, `superEarnings`, `superEarningsTax`,
  `contributionsTax`, `fromSuper`, `shortfall`, `superClosing`,
  `investableClosing`). `fiReached.fiNumber` is optional.

Add a new file per milestone as more of the engine is built; the test picks it
up automatically.
