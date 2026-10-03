# Plan

This is the living plan for building the Australian FIRE Planner. It is
written against [`requirements/REQUIREMENTS.md`](requirements/REQUIREMENTS.md)
and the [desktop mockups](requirements/mockups/README.md).

**Current status:** M0 to M4, the colour scheme and the one-page Results are done. M5 is in progress.

| Part | Contents | Status |
| --- | --- | --- |
| 1 | Order in which the requirements are delivered | Agreed |
| 2 | Tech stack, architecture and testing approach | Agreed |
| 3 | Milestone plans: how each milestone is delivered, then a step-by-step plan per milestone | M0–M4 and one-page Results done. M5 in progress |

## 1. Requirement ordering

### Principles

1. **A working app after every requirement.** Each requirement lands as one
   or more small commits. Each commit leaves the app building, its tests
   passing, and every screen built so far usable. Each milestone ends at a
   point worth merging, so **each milestone is one PR**.
2. **Thin vertical slices.** A milestone adds inputs, calculations and
   outputs together, so each one visibly extends the mockup screens instead
   of building a layer that can't be used yet.
3. **One new dimension at a time.** The model starts as simply as possible
   (one person, one portfolio, no tax). Each milestone then adds a single
   dimension: time, drawdown, Coast FIRE, super, couples, tax, then
   property. Couples come before tax, so tax is built per person from the
   start rather than retrofitted.
4. **Must first, then Should, then Could.** Phase 1 (M1–M14) delivers every
   Must requirement, which is the minimum viable product. Phase 2 (M15–M21)
   adds the Shoulds and Phase 3 (M22–M24) the Coulds. One Should is pulled
   forward: TAX-9 (tax-free threshold and low income offsets) goes into M8,
   because without it the tax on early retirees' low incomes would be wrong.
5. **No mixed kinds.** Every milestone after M0 is a behavior change. If a
   refactor turns out to be needed, it goes in its own PR before the
   milestone that needs it. To avoid the most likely refactors, the model
   holds lists from M1 (a household with one person, a list with one
   portfolio), so adding a partner or more portfolios later extends the
   model rather than reshaping it.

### Applies to every milestone

- **Tests (NFR-6):** unit tests for every calculation, using worked examples
  checked independently, plus an E2E test for each new user-facing flow.
- **Transparency and determinism (NFR-1, NFR-2):** every new figure can be
  traced to its inputs, and the same inputs always give the same projection.
- **Year-by-year projection (OUT-1):** starts in M2. Each later milestone adds
  its own columns. It is the last section of the Results page, not a step of
  its own.
- **Rules as data (NFR-3):** from M5, every statutory rate, threshold and cap
  is stored as dated data, not in calculation code.
- **Each asset grows its own way:** every asset carries its own growth
  settings: cash at the interest rate, each portfolio at its expected
  return, and later super net of fees and tax, and property at its own
  growth rate. No calculation may assume one rate for all savings. More
  advanced growth options per asset (for example rates that change over
  time) are a candidate for the backlog.
- **Mockup conventions:** tables are editable in place, charts have hover
  tooltips, and values can be shown in today's or nominal dollars. Each
  convention applies from the milestone where the table or chart first
  appears. Part 2 maps the shared components to the milestones that
  introduce them. The inputs panel (mockup 05b) arrives in M16. Until then, inputs
  are edited through the steps.
- **Honest about what's missing:** until the MVP is complete, the app shows
  which parts of the model aren't built yet (for example "tax is not yet
  modelled"), so early results aren't mistaken for complete ones.
- **README:** install, build, run and test instructions stay accurate.

### Overview

| Milestone | Phase | Requirements | Mockups |
| --- | --- | --- | --- |
| [M0 · Walking skeleton](#m0--walking-skeleton) | Foundation | 0 | Header and step navigation; empty screens 01–07 |
| [M1 · FI number](#m1--fi-number) | 1 · Must | 11 | 02, 03b, 04, 05 (first versions) |
| [M2 · Growth over time](#m2--growth-over-time) | 1 · Must | 10 | 01, 03b, 04, 05, 06 (first versions) |
| [M3 · Retirement drawdown and solvency](#m3--retirement-drawdown-and-solvency) | 1 · Must | 9 | 04, 05 chart (a) and year by year |
| [M4 · Coast FIRE](#m4--coast-fire) | 1 · Must | 4 | 05 Coast FIRE section |
| [M5 · Superannuation: accumulation](#m5--superannuation-accumulation) | 1 · Must | 8 | 03d (super), 02 (salary) |
| [M6 · Super access and the bridge period](#m6--super-access-and-the-bridge-period) | 1 · Must | 8 | 01 (access age), 05 bridge check and chart (b), Coast FIRE (c) |
| [M7 · Couples](#m7--couples) | 1 · Must | 7 | 01, 02, 03b, 03d per person |
| [M8 · Personal income tax](#m8--personal-income-tax) | 1 · Must | 4 | 05 chart (c) and year-by-year tax columns |
| [M9 · Investment income and capital gains](#m9--investment-income-and-capital-gains) | 1 · Must | 6 | 03b complete |
| [M10 · Super in retirement](#m10--super-in-retirement) | 1 · Must | 3 | 03d rules panel, 05 milestones |
| [M11 · Super caps and large balances](#m11--super-caps-and-large-balances) | 1 · Must | 2 | 03d cap warnings and Division 296 toggle |
| [M12 · Home: own or rent](#m12--home-own-or-rent) | 1 · Must | 8 | 03a (home details and holding costs), 02 (rent) |
| [M13 · Mortgage](#m13--mortgage) | 1 · Must | 8 | 03a (mortgage and calculated panel) |
| [M14 · Investment property](#m14--investment-property) | 1 · Must — MVP complete | 5 | 03c |
| [M15 · Spending detail](#m15--spending-detail) | 2 · Should | 4 | 02 complete |
| [M16 · Inputs panel and scenarios](#m16--inputs-panel-and-scenarios) | 2 · Should | 2 | 05b, 06 |
| [M17 · Coast FIRE choices](#m17--coast-fire-choices) | 2 · Should | 3 | 05 Coast FIRE (c) and comparison table |
| [M18 · More income, fees and debts](#m18--more-income-fees-and-debts) | 2 · Should | 4 | 02, 03b, 03d |
| [M19 · Property events](#m19--property-events) | 2 · Should | 4 | 03a and 03c planned changes |
| [M20 · Tax and super refinements](#m20--tax-and-super-refinements) | 2 · Should | 3 | 04 withdrawal order, 03d |
| [M21 · Further reading](#m21--further-reading) | 2 · Should | 1 | "Learn more" links on every screen |
| [M22 · What-ifs and export](#m22--what-ifs-and-export) | 3 · Could | 3 | 04 temporary changes, 05, export |
| [M23 · Work and super options](#m23--work-and-super-options) | 3 · Could | 4 | 02, 03d |
| [M24 · Tax extras](#m24--tax-extras) | 3 · Could | 4 | 03c, 04 |

### Milestones

### M0 · Walking skeleton

- **Kind:** Internal (scaffolding)
- **Phase:** Foundation
- **Mockups:** Header and step navigation; empty screens 01–07
- **Working app at the end:** The app builds, starts and shows the seven steps from the mockups with placeholder content. Unit and E2E test runners and the README are in place.

### M1 · FI number

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 02, 03b, 04, 05 (first versions)
- **Working app at the end:** One person enters their spending, retirement spending, one portfolio's value and a safe withdrawal rate, and sees their FI number and progress to FI, with a breakdown of how the FI number was worked out.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **NFR-5** Disclaimer | Must | disclaimer on first run |
| 2 | **NFR-4** Privacy (data stays on device) | Must | plan saved only on this device |
| 3 | **EXP-1** Living expenses (after tax) | Must | single total |
| 4 | **EXP-2** Retirement spending | Must | part: amount or % of today |
| 5 | **IN-10** Drawdown rates | Must | part: safe withdrawal rate |
| 6 | **IN-14** Share portfolios and owners | Must | part: one portfolio's value |
| 7 | **FIRE-1** FI number | Must | part: today's dollars |
| 8 | **FIRE-2** Progress to FI | Must | all |
| 9 | **NFR-1** Transparency (trace every figure) | Must | starting with the FI number breakdown; then applies to every milestone |
| 10 | **NFR-2** Determinism | Must | from here, applies to every milestone |
| 11 | **NFR-6** Accuracy tests with worked examples | Must | from here, applies to every milestone |

### M2 · Growth over time

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 01, 03b, 04, 05, 06 (first versions)
- **Working app at the end:** The portfolio grows with returns and contributions year by year. The user sees the year they reach FI and a year-by-year table in today's or nominal dollars.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-2** Current age | Must | all |
| 2 | **IN-3** Target retirement age | Must | part: one target retirement age |
| 3 | **IN-11** Inflation rate | Must | all |
| 4 | **EXP-3** Expenses grow with inflation | Must | all |
| 5 | **IN-15** Expected return (growth + yield) | Must | part: total return only |
| 6 | **IN-18** Regular contributions | Must | all |
| 7 | **FIRE-1** FI number | Must | rest: nominal at target retirement age |
| 8 | **OUT-1** Year-by-year projection | Must | starting with balances, contributions and spending; each later milestone adds its columns |
| 9 | **OUT-2** Today's or nominal dollars | Must | all |
| 10 | **OUT-4** Key milestones | Must | part: FI number and FI year |

### M3 · Retirement drawdown and solvency

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 04, 05 chart (a) and year by year
- **Working app at the end:** The projection continues past retirement, drawing spending from the portfolio and cash. It flags years that can't be funded and finds the earliest feasible retirement age.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-4** Projection end age | Must | part: one person |
| 2 | **IN-10** Drawdown rates | Must | rest: retirement withdrawal |
| 3 | **IN-26** Cash savings | Must | all |
| 4 | **IN-12** General interest rate | Must | part: interest on cash |
| 5 | **EXP-6** Dated and one-off expenses | Must | all |
| 6 | **OUT-3** Shortfall flags | Must | all |
| 7 | **FIRE-3** Earliest feasible retirement age | Must | part: one person |
| 8 | **FIRE-7** FIRE visualisations | Must | part: chart (a) |
| 9 | **OUT-4** Key milestones | Must | part: age money runs out |

### M4 · Coast FIRE

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 05 Coast FIRE section
- **Working app at the end:** The results show the Coast FIRE number in today's and nominal dollars, whether it's reached, and when.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **COAST-1** Coast FIRE number | Must | all |
| 2 | **COAST-2** Coast FIRE reached / when | Must | all |
| 3 | **COAST-6** Coast FIRE visualisations | Must | part: charts (a) and (b) |
| 4 | **OUT-4** Key milestones | Must | part: Coast FIRE year, and the milestones timeline |

### M5 · Superannuation: accumulation

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 03d (super), 02 (salary)
- **Working app at the end:** Salary drives employer contributions. Super grows alongside the portfolio, with contributions and earnings taxed.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **NFR-3** Rules stored as dated data | Must | starting with SG and contributions tax; then every statutory rule as it arrives |
| 2 | **IN-7** Salary and growth | Must | all |
| 3 | **IN-21** Super balance and return | Must | all |
| 4 | **IN-22** Employer contribution rate (SG) | Must | all |
| 5 | **IN-23** Voluntary super contributions | Must | all |
| 6 | **IN-24** Employer contributions stop at retirement | Must | part: stop at retirement (the override comes with IN-9 in M23) |
| 7 | **SUPER-2** Contributions tax | Must | all |
| 8 | **SUPER-5** Accumulation earnings tax | Must | all |

### M6 · Super access and the bridge period

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 01 (access age), 05 bridge check and chart (b), Coast FIRE (c)
- **Working app at the end:** Super stays locked until the access age (default 65). The app checks whether outside-super assets can bridge the gap and flags bridge shortfalls.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-5** Super access age (default 65) | Must | all |
| 2 | **SUPER-1** Preservation | Must | all |
| 3 | **SUPER-8** Tax-free withdrawals from 60 | Must | all |
| 4 | **FIRE-4** Bridge and post-preservation check | Must | all |
| 5 | **FIRE-7** FIRE visualisations | Must | part: chart (b) |
| 6 | **COAST-3** Coast FIRE for super and outside super | Must | all |
| 7 | **COAST-6** Coast FIRE visualisations | Must | rest: (c) |
| 8 | **OUT-4** Key milestones | Must | part: super access ages |

### M7 · Couples

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 01, 02, 03b, 03d per person
- **Working app at the end:** A second person can be added with their own age, salary, super and retirement age. Every rule so far applies per person.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-1** One person or a couple | Must | all |
| 2 | **IN-6** Tax and super rules applied per person | Must | all |
| 3 | **IN-3** Target retirement age | Must | rest: per person |
| 4 | **IN-4** Projection end age | Must | rest: younger partner |
| 5 | **EXP-2** Retirement spending | Must | rest: interim while one is retired |
| 6 | **IN-14** Share portfolios and owners | Must | part: ownership split |
| 7 | **FIRE-3** Earliest feasible retirement age | Must | rest: per person |

### M8 · Personal income tax

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 05 chart (c) and year-by-year tax columns
- **Working app at the end:** Salary and investment income are taxed per person. After-tax spending is grossed up to the pre-tax income or withdrawals that fund it.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **TAX-1** Personal income tax and Medicare levy | Must | all |
| 2 | **TAX-9** Low income offsets, tax-free threshold | Should | Should, pulled forward |
| 3 | **TAX-7** Grossing up after-tax expenses | Must | all |
| 4 | **FIRE-7** FIRE visualisations | Must | rest: chart (c) |

### M9 · Investment income and capital gains

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 03b complete
- **Working app at the end:** Portfolios pay dividends with franking credits. Selling units to fund spending triggers capital gains tax with the 50% discount.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-14** Share portfolios and owners | Must | rest: several portfolios |
| 2 | **IN-15** Expected return (growth + yield) | Must | rest: growth/yield split |
| 3 | **IN-16** Franked proportion | Must | all |
| 4 | **IN-19** Cost base | Must | all |
| 5 | **TAX-2** Franking credits | Must | all |
| 6 | **TAX-3** Capital gains tax | Must | all |

### M10 · Super in retirement

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 03d rules panel, 05 milestones
- **Working app at the end:** Super moves to retirement phase (up to the transfer balance cap) and pays at least the age-based minimum. A fixed, sensible withdrawal order is used; making it configurable is TAX-8 in M20.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **SUPER-6** Retirement phase and transfer balance cap | Must | all |
| 2 | **SUPER-7** Minimum drawdown | Must | all |
| 3 | **OUT-4** Key milestones | Must | part: retirement-phase age |

### M11 · Super caps and large balances

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 03d cap warnings and Division 296 toggle
- **Working app at the end:** Planned contributions are checked against the caps, and Division 296 can be switched on or off.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **SUPER-4** Contribution caps | Must / Should | part: cap warnings |
| 2 | **SUPER-9** Division 296 | Must | all |

### M12 · Home: own or rent

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 03a (home details and holding costs), 02 (rent)
- **Working app at the end:** The household either owns its home outright, with holding costs flowing into spending and the home counted in net worth but not the FI number, or rents.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **PROP-9** Owner-occupied home | Must | all |
| 2 | **PROP-1** Property value, growth, cost base, owners | Must | all |
| 3 | **PROP-2** Property holding costs | Must | all |
| 4 | **EXP-9** Property costs not double-counted | Must | all |
| 5 | **PROP-10** Home excluded from FI number | Must | all |
| 6 | **PROP-11** Home tax treatment | Must | all |
| 7 | **TAX-4** Main residence exemption | Must | all |
| 8 | **EXP-10** Rent for non-owners | Must | all |

### M13 · Mortgage

- **Kind:** Behavior change
- **Phase:** 1 · Must
- **Mockups:** 03a (mortgage and calculated panel)
- **Working app at the end:** The home can carry a mortgage with its current rate, fixed or variable terms, a rate that follows the general interest rate, and an offset account. Repayments flow into spending and stop when the loan is paid off.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **PROP-3** Mortgage balance, term, repayment type | Must | all |
| 2 | **PROP-4** Current mortgage rate, fixed or variable | Must | all |
| 3 | **PROP-5** Offset account | Must | all |
| 4 | **IN-12** General interest rate | Must | rest: rates follow the general interest rate |
| 5 | **PROP-6** Variable rate follows interest rate | Must | all |
| 6 | **PROP-8** Mortgage calculated year by year | Must | all |
| 7 | **EXP-8** Loan repayments come from loans | Must | all |
| 8 | **OUT-4** Key milestones | Must | rest: mortgage paid off |

### M14 · Investment property

- **Kind:** Behavior change
- **Phase:** 1 · Must — MVP complete
- **Mockups:** 03c
- **Working app at the end:** Investment properties earn rent, have deductible costs and interest, are negatively geared, and count toward FI. Every Must requirement is now met.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **PROP-14** Rental income | Must | all |
| 2 | **TAX-6** Interest deductibility | Must | all |
| 3 | **PROP-15** Rental deductions and negative gearing | Must | all |
| 4 | **TAX-5** Negative gearing | Must | all |
| 5 | **FIRE-5** Investment property counts toward FI | Must | all |

### M15 · Spending detail

- **Kind:** Behavior change
- **Phase:** 2 · Should
- **Mockups:** 02 complete
- **Working app at the end:** Spending can be entered in buckets with their own growth rates, and spending can step up or down in retirement.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **EXP-1a** Expense buckets | Should | all |
| 2 | **EXP-4** Custom categories, essential/discretionary | Should | all |
| 3 | **EXP-5** Category growth rates | Should | all |
| 4 | **EXP-7** Retirement spending phases | Should | all |

### M16 · Inputs panel and scenarios

- **Kind:** Behavior change
- **Phase:** 2 · Should
- **Mockups:** 05b, 06
- **Working app at the end:** Inputs can be edited from a drop-down panel without leaving the results (mockup 05b). Scenarios can be saved and compared, with a sensitivity chart.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **OUT-5** Scenarios | Should | all |
| 2 | **OUT-6** Sensitivity | Should | all |

### M17 · Coast FIRE choices

- **Kind:** Behavior change
- **Phase:** 2 · Should
- **Mockups:** 05 Coast FIRE (c) and comparison table
- **Working app at the end:** The results show the minimum income needed once coasting, and compare keeping, reducing or stopping contributions.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **COAST-5** Employer super while coasting | Should | all |
| 2 | **COAST-4** Minimum income once coasting | Should | all |
| 3 | **COAST-7** Contributions after Coast FIRE | Should | all |

### M18 · More income, fees and debts

- **Kind:** Behavior change
- **Phase:** 2 · Should
- **Mockups:** 02, 03b, 03d
- **Working app at the end:** One-off income, portfolio fees, dividends taken as cash, and other debts are modelled.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-8** One-off and time-limited income | Should | all |
| 2 | **IN-17** Portfolio fees | Should | all |
| 3 | **IN-20** Reinvest or take dividends | Should | all |
| 4 | **IN-27** Other debts | Should | all |

### M19 · Property events

- **Kind:** Behavior change
- **Phase:** 2 · Should
- **Mockups:** 03a and 03c planned changes
- **Working app at the end:** Extra repayments, and future purchases, sales or downsizing of the home or an investment property, can be modelled.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **PROP-7** Extra repayments, early payoff | Should | all |
| 2 | **PROP-12** Buying a home later | Should | all |
| 3 | **PROP-13** Selling or downsizing the home | Should | all |
| 4 | **PROP-16** Buying or selling investment property | Should | all |

### M20 · Tax and super refinements

- **Kind:** Behavior change
- **Phase:** 2 · Should
- **Mockups:** 04 withdrawal order, 03d
- **Working app at the end:** The retirement withdrawal order can be set, Division 293 applies, and contribution caps support bring-forward and carry-forward.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **TAX-8** Withdrawal order | Should | all |
| 2 | **SUPER-3** Division 293 | Should | all |
| 3 | **SUPER-4** Contribution caps | Must / Should | rest: bring-forward and carry-forward |

### M21 · Further reading

- **Kind:** Behavior change
- **Phase:** 2 · Should
- **Mockups:** "Learn more" links on every screen
- **Working app at the end:** Each concept links to reputable sources such as the ATO and Moneysmart.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **NFR-7** Further reading links | Should | all |

### M22 · What-ifs and export

- **Kind:** Behavior change
- **Phase:** 3 · Could
- **Mockups:** 04 temporary changes, 05, export
- **Working app at the end:** Assumptions can change for a period, Lean and Fat FIRE variants are shown, and inputs and projections can be exported.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-13** Temporary assumption changes | Could | all |
| 2 | **FIRE-6** Lean and Fat FIRE | Could | all |
| 3 | **OUT-7** Export | Could | all |

### M23 · Work and super options

- **Kind:** Behavior change
- **Phase:** 3 · Could
- **Mockups:** 02, 03d
- **Working app at the end:** Barista FIRE income, concessional carry-forward amounts, transition to retirement, and downsizer contributions are modelled.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **IN-9** Part-time income after retirement | Could | all |
| 2 | **IN-24** Employer contributions stop at retirement | Must | rest: the override, for income after retirement |
| 3 | **IN-25** Concessional carry-forward amounts | Could | all |
| 4 | **SUPER-10** Transition to retirement | Could | all |
| 5 | **SUPER-11** Downsizer contribution | Could | all |

### M24 · Tax extras

- **Kind:** Behavior change
- **Phase:** 3 · Could
- **Mockups:** 03c, 04
- **Working app at the end:** Depreciation, the Medicare levy surcharge, HELP repayments, and calculated stamp duty and land tax are modelled.

| # | Requirement | Priority | Scope in this milestone |
| --- | --- | --- | --- |
| 1 | **PROP-17** Depreciation | Could | all |
| 2 | **TAX-10** Medicare levy surcharge | Could | all |
| 3 | **TAX-11** HELP repayments | Could | all |
| 4 | **TAX-12** Stamp duty and land tax | Could | all |

### Coverage index

Every requirement, and the milestone(s) that deliver it. Where a requirement
is split, it is finished in the last milestone listed.

| Requirement | Priority | Milestone(s) |
| --- | --- | --- |
| **IN-1** One person or a couple | Must | M7 |
| **IN-2** Current age | Must | M2 |
| **IN-3** Target retirement age | Must | M2 → M7 |
| **IN-4** Projection end age | Must | M3 → M7 |
| **IN-5** Super access age (default 65) | Must | M6 |
| **IN-6** Tax and super rules applied per person | Must | M7 |
| **IN-7** Salary and growth | Must | M5 |
| **IN-8** One-off and time-limited income | Should | M18 |
| **IN-9** Part-time income after retirement | Could | M23 |
| **EXP-1** Living expenses (after tax) | Must | M1 |
| **EXP-1a** Expense buckets | Should | M15 |
| **EXP-2** Retirement spending | Must | M1 → M7 |
| **EXP-3** Expenses grow with inflation | Must | M2 |
| **EXP-4** Custom categories, essential/discretionary | Should | M15 |
| **EXP-5** Category growth rates | Should | M15 |
| **EXP-6** Dated and one-off expenses | Must | M3 |
| **EXP-7** Retirement spending phases | Should | M15 |
| **EXP-8** Loan repayments come from loans | Must | M13 |
| **EXP-9** Property costs not double-counted | Must | M12 |
| **EXP-10** Rent for non-owners | Must | M12 |
| **IN-10** Drawdown rates | Must | M1 → M3 |
| **IN-11** Inflation rate | Must | M2 |
| **IN-12** General interest rate | Must | M3 → M13 |
| **IN-13** Temporary assumption changes | Could | M22 |
| **IN-14** Share portfolios and owners | Must | M1 → M7 → M9 |
| **IN-15** Expected return (growth + yield) | Must | M2 → M9 |
| **IN-16** Franked proportion | Must | M9 |
| **IN-17** Portfolio fees | Should | M18 |
| **IN-18** Regular contributions | Must | M2 |
| **IN-19** Cost base | Must | M9 |
| **IN-20** Reinvest or take dividends | Should | M18 |
| **PROP-1** Property value, growth, cost base, owners | Must | M12 |
| **PROP-2** Property holding costs | Must | M12 |
| **PROP-3** Mortgage balance, term, repayment type | Must | M13 |
| **PROP-4** Current mortgage rate, fixed or variable | Must | M13 |
| **PROP-5** Offset account | Must | M13 |
| **PROP-6** Variable rate follows interest rate | Must | M13 |
| **PROP-7** Extra repayments, early payoff | Should | M19 |
| **PROP-8** Mortgage calculated year by year | Must | M13 |
| **PROP-9** Owner-occupied home | Must | M12 |
| **PROP-10** Home excluded from FI number | Must | M12 |
| **PROP-11** Home tax treatment | Must | M12 |
| **PROP-12** Buying a home later | Should | M19 |
| **PROP-13** Selling or downsizing the home | Should | M19 |
| **PROP-14** Rental income | Must | M14 |
| **PROP-15** Rental deductions and negative gearing | Must | M14 |
| **PROP-16** Buying or selling investment property | Should | M19 |
| **PROP-17** Depreciation | Could | M24 |
| **IN-21** Super balance and return | Must | M5 |
| **IN-22** Employer contribution rate (SG) | Must | M5 |
| **IN-23** Voluntary super contributions | Must | M5 |
| **IN-24** Employer contributions stop at retirement | Must | M5 → M23 |
| **IN-25** Concessional carry-forward amounts | Could | M23 |
| **IN-26** Cash savings | Must | M3 |
| **IN-27** Other debts | Should | M18 |
| **FIRE-1** FI number | Must | M1 → M2 |
| **FIRE-2** Progress to FI | Must | M1 |
| **FIRE-3** Earliest feasible retirement age | Must | M3 → M7 |
| **FIRE-4** Bridge and post-preservation check | Must | M6 |
| **FIRE-5** Investment property counts toward FI | Must | M14 |
| **FIRE-6** Lean and Fat FIRE | Could | M22 |
| **FIRE-7** FIRE visualisations | Must | M3 → M6 → M8 |
| **COAST-1** Coast FIRE number | Must | M4 |
| **COAST-2** Coast FIRE reached / when | Must | M4 |
| **COAST-3** Coast FIRE for super and outside super | Must | M6 |
| **COAST-4** Minimum income once coasting | Should | M17 |
| **COAST-5** Employer super while coasting | Should | M17 |
| **COAST-6** Coast FIRE visualisations | Must | M4 → M6 |
| **COAST-7** Contributions after Coast FIRE | Should | M17 |
| **SUPER-1** Preservation | Must | M6 |
| **SUPER-2** Contributions tax | Must | M5 |
| **SUPER-3** Division 293 | Should | M20 |
| **SUPER-4** Contribution caps | Must / Should | M11 → M20 |
| **SUPER-5** Accumulation earnings tax | Must | M5 |
| **SUPER-6** Retirement phase and transfer balance cap | Must | M10 |
| **SUPER-7** Minimum drawdown | Must | M10 |
| **SUPER-8** Tax-free withdrawals from 60 | Must | M6 |
| **SUPER-9** Division 296 | Must | M11 |
| **SUPER-10** Transition to retirement | Could | M23 |
| **SUPER-11** Downsizer contribution | Could | M23 |
| **TAX-1** Personal income tax and Medicare levy | Must | M8 |
| **TAX-2** Franking credits | Must | M9 |
| **TAX-3** Capital gains tax | Must | M9 |
| **TAX-4** Main residence exemption | Must | M12 |
| **TAX-5** Negative gearing | Must | M14 |
| **TAX-6** Interest deductibility | Must | M14 |
| **TAX-7** Grossing up after-tax expenses | Must | M8 |
| **TAX-8** Withdrawal order | Should | M20 |
| **TAX-9** Low income offsets, tax-free threshold | Should | M8 |
| **TAX-10** Medicare levy surcharge | Could | M24 |
| **TAX-11** HELP repayments | Could | M24 |
| **TAX-12** Stamp duty and land tax | Could | M24 |
| **OUT-1** Year-by-year projection | Must | M2 → every milestone adds its columns |
| **OUT-2** Today's or nominal dollars | Must | M2 |
| **OUT-3** Shortfall flags | Must | M3 |
| **OUT-4** Key milestones | Must | M2 → M3 → M4 → M6 → M10 → M13 |
| **OUT-5** Scenarios | Should | M16 |
| **OUT-6** Sensitivity | Should | M16 |
| **OUT-7** Export | Could | M22 |
| **NFR-1** Transparency (trace every figure) | Must | M1 → every milestone |
| **NFR-2** Determinism | Must | M1 → every milestone |
| **NFR-3** Rules stored as dated data | Must | M5 → every milestone with statutory rules |
| **NFR-4** Privacy (data stays on device) | Must | M1 |
| **NFR-5** Disclaimer | Must | M1 |
| **NFR-6** Accuracy tests with worked examples | Must | M1 → every milestone |
| **NFR-7** Further reading links | Should | M21 |
### Decisions

Agreed in review of part 1:

1. **Couples stay at M7.** The first milestones model one person.
2. **Property stays at M12–M14.** Until then, homeowners include housing
   costs in their living expenses.
3. **The MVP line is M14**, the end of Phase 1. Scenarios (M16) stay in
   Phase 2.

## 2. Tech stack, architecture and testing

### Constraints that drive the choices

These come straight from the requirements and mockups:

- **The data never leaves the device** (NFR-4, and the §10 non-goal of no
  backup or sync). So there is no server: every calculation runs on the
  user's own machine.
- **Desktop web first** (mockups), with mobile later (BL-6).
- **Deterministic, traceable calculations** (NFR-1, NFR-2) that can be
  tested against independently checked worked examples (NFR-6).
- **Statutory rules stored as dated data** (NFR-3), not in code.
- **Charts with hover and click** (FIRE-7, COAST-6, mockup conventions), and
  tables that are edited in place.
- **CLAUDE.md rule 6:** separate wire types and internal types, with
  explicit mapping functions at every boundary.

### Proposed stack

| Concern | Choice | Why | Alternatives considered |
| --- | --- | --- | --- |
| App type | **Client-only single-page web app**, built to static files | No server means no place for data to leak to (NFR-4). Runs locally with one command and can be hosted as plain static files. | Python/FastAPI backend: needs a server holding financial data. Electron/Tauri desktop app: heavier to build and test. It can wrap the same web app later if needed. |
| Language | **TypeScript** (strict mode) | Types catch unit and shape mistakes in a calculation-heavy codebase. The same language for engine and UI. | Python engine compiled to WebAssembly (Pyodide): slow start, two languages. |
| UI | **React** with **Vite** | Mature and widely known, with the largest ecosystem for charts and testing. Vite gives fast builds and a simple static output. | Svelte/SvelteKit: lighter, but a smaller ecosystem. Vue: comparable, no strong reason to prefer it. |
| Charts | **Recharts** | Line, stacked area and bar charts, reference lines and tooltips cover every chart in the mockups (FIRE-7, COAST-6, sensitivity) without hand-written D3. | D3 directly: most flexible but most code. Chart.js: canvas-based, harder to test and annotate. Observable Plot: good, but less interactive out of the box. |
| App state | **React state with a reducer** around a single `Plan` | The whole app is one plan document plus derived results. A reducer keeps every edit explicit, which makes undo (mockup 05b) straightforward later. | Redux/Zustand: more machinery than one document needs. Can be adopted later if state grows. |
| Validation at boundaries | **Zod** | Parses and validates the wire formats (saved plans, rules data) before mapping them to internal types. | Hand-written validators: more code, easy to miss a field. |
| Storage | **IndexedDB**, via the `idb` library | Keeps the plan on the device (NFR-4) with no server. See [Data representations and storage](#data-representations-and-storage) for the schema, the library and why not localStorage. | localStorage, Dexie.js: compared in that section. |
| Money arithmetic | **JavaScript numbers (64-bit floats)**, rounded to cents only for display and comparison | A projection compounds rates over decades, so the model is approximate by nature, and floats are deterministic in JavaScript (NFR-2). Tests compare to the cent. | Decimal library (decimal.js): exact cents but slower and noisier code, with no real accuracy gain for a projection. |
| Hosting | **GitHub Pages**, deployed by GitHub Actions on every merge to `main` | Free static hosting next to the code. Nothing is sent anywhere: the app runs entirely in the browser. See [Hosting and deployment](#hosting-and-deployment). | Local-only: no shareable URL. Netlify/Vercel: another account to manage, with no benefit for static files. |
| Tooling | **Node 22 LTS**, npm, ESLint, Prettier, TypeScript type-checking | Standard, and already available in this environment. | pnpm/yarn: no need yet. |

Library versions are pinned in M0. Current majors at the time of writing:
React 19, Vite 8, Recharts 3, Zod 4, TypeScript 6.0, Vitest 5, Playwright 1.63.
TypeScript stays on 6.0 rather than the newer 7.x: typescript-eslint, which
gives ESLint its type-aware rules, supports TypeScript below 6.1 only.
Move to 7.x once typescript-eslint supports it.

### Architecture

The core idea: a **pure calculation engine** that knows nothing about the
UI or storage. It takes a plan and a rule set and returns a projection. Everything else is plumbing around it.

```
 ┌──────────────────────────── Browser ─────────────────────────────┐
 │                                                                  │
 │  UI (React)            screens 01–06 + 05b, one per mockup       │
 │    │  ▲                                                          │
 │    │  │ view models: formatted figures, chart series,            │
 │    │  │ today's ↔ nominal conversion (OUT-2)                     │
 │    ▼  │                                                          │
 │  Plan state (reducer) ──────────► Engine (pure TypeScript)       │
 │    │  ▲                            plan + rules → projection     │
 │    │  │                            + explanations (NFR-1)        │
 │    │  │                                 ▲                        │
 │    ▼  │                                 │                        │
 │  Persistence                       Rules                         │
 │  PlanDocument (wire) ⇄ Plan        RulesFile (wire) ⇄ RuleSet    │
 │    │  ▲                            dated data per FY (NFR-3)     │
 │    ▼  │                                                          │
 │  IndexedDB (this device only, NFR-4)                             │
 └──────────────────────────────────────────────────────────────────┘
```

**Engine** (`src/engine/`)
- One entry point: `project(plan, ruleSet, startYear) → Projection`.
  `startYear` is passed in rather than read from the clock, so the same
  inputs always give the same result (NFR-2).
- A year-by-year loop. Each year applies, in a fixed and documented order:
  income → contributions → growth → tax → spending and withdrawals →
  shortfall check. Each milestone adds its own step (super in M5, tax in
  M8, property in M12, and so on) without changing the others.
- Headline figures (FI number, FI age, Coast FIRE number and more) are
  derived from the projection by small, separately tested functions.
- **Explanations (NFR-1):** each headline figure and each year's key
  amounts carry a structured breakdown (label, value, the inputs and rules
  it came from). The UI renders these as the "how was this calculated?"
  panels in the mockups.
- No React, no storage, no dates from the clock. That keeps it fast to
  test and reusable, e.g. for scenarios (OUT-5) and sensitivity runs
  (OUT-6), which are just repeated engine calls with changed inputs.

**Internal and wire types** (CLAUDE.md rule 6)

| Boundary | Wire type | Internal type | Mapping |
| --- | --- | --- | --- |
| Saved plan in IndexedDB, later export (OUT-7) | `PlanDocument` (versioned, validated with Zod) inside a `PlanRecord` | `Plan` | `planFromWire` / `planToWire`, plus migrations between versions. See [Data representations and storage](#data-representations-and-storage) |
| Statutory rules data | `RulesFile` (JSON per financial year, validated with Zod) | `RuleSet` | `ruleSetFromWire` |
| Engine output to UI | none: stays in memory | `Projection` → view models | Formatting functions in the UI layer |

**Rules data** (`src/rules/data/`): one JSON file per financial year, e.g.
`fy2025-26.json`, holding brackets, caps, rates and minimum drawdowns, with
the date each takes effect. Years after the latest file use the latest
known rules, indexed where the law says so. Updating rules for a new year
means adding a file, not changing the engine.

**UI** (`src/ui/`): one folder per mockup screen, built from shared
components that match the mockup conventions. See
[Reusable UI views and components](#reusable-ui-views-and-components).

**Proposed layout**

```
src/
  engine/        pure calculations: project(), FI and Coast FIRE metrics
  rules/         RuleSet types, wire parsing, data/fy*.json
  plan/          Plan types, reducer, defaults
  persistence/   PlanDocument wire types, migrations, PlanStore (IndexedDB)
  ui/            screens/ (one per mockup) and components/
tests/
  worked-examples/   NFR-6 fixtures: inputs, expected outputs, how checked
  e2e/               Playwright user flows
```

### Data representations and storage

Data handling is where projects like this usually get hard, so storage is
kept away from the calculations and designed up front.

#### Three representations, kept apart

The same plan exists in three forms. Only the mapping functions between
them know about more than one form.

```
  UI form state            In-memory model                Serialised (wire)
  (what is being typed)    (what the engine computes on)  (what is stored)

  "4.0" in a % field  ──►  Plan                      ──►  PlanDocumentV1
                           safeWithdrawalRate: 0.04       safeWithdrawalRatePercent: 4
                           (fractions, numbers,           (explicit units in names,
                            IDs, no defaults missing)      only user-set values,
                                │                          schemaVersion, ISO dates)
                                ▼                               │
                           Engine → Projection                  ▼
                           (never serialised:              IndexedDB (and, in M22,
                            recomputed on load, NFR-2)      export files)
```

- **The in-memory model and the engine never import anything from
  persistence.** They can be written and tested without any thought of
  storage. That's what keeps the calculations simple: storage-format
  questions (versions, units, missing fields) are answered once, in the
  mappers, instead of throughout the engine.
- **Representation decisions are made at the boundary.** They come up the
  first time anything is written to IndexedDB (M1), and are settled then:
  - **Units:** the wire format spells units out in field names
    (`…Percent`, `…Dollars`). Internally, rates are fractions.
  - **Defaults:** the wire format, and the in-memory `Plan`, hold only
    values the user has set. Defaults are applied just before calculating,
    by `resolvePlanInputs` (refined in the M1 plan), so an improved default
    (e.g. a new inflation default) reaches plans that never overrode it, and
    the UI can show dashed "default" fields, as in the mockups.
  - **Identifiers:** every person, portfolio, property and row has a stable
    string ID (`crypto.randomUUID()`) assigned when it is created, never
    derived from its position in a list.
  - **Dates:** ISO 8601 strings in the wire format.
  - **Derived data is never stored:** projections, FI numbers and
    explanations are always recomputed, so stored data can't disagree with
    the engine.
- **Statutory rules** (`RulesFile` → `RuleSet`) ship with the app as static
  JSON. They are not stored in IndexedDB.

#### Why IndexedDB and not localStorage

| | localStorage | IndexedDB |
| --- | --- | --- |
| API | Synchronous: every save blocks the page, and autosave runs on every edit | Asynchronous: saving never freezes typing or charts |
| What it stores | Strings only: the whole plan is re-stringified and rewritten on each save | Structured objects, written per record |
| Space | About 5 MB per origin, and the GitHub Pages origin is shared with every other Pages site on the account | Much larger quotas (a share of free disk space). Persistence can be requested with `navigator.storage.persist()` to make eviction less likely |
| Many records | One key per value, no transactions | Object stores with keys and indexes. Plans and scenarios (OUT-5) are separate records written in atomic transactions |
| Schema changes | None built in | A versioned database with an upgrade hook (`onupgradeneeded`) for adding stores and indexes |
| Failure modes | Throws when full | Errors per transaction, which can be caught and reported |

localStorage would be enough for M1 alone, a single small plan. But
scenarios (M16), autosave on every edit, and schema changes over 25
milestones all point to IndexedDB. Starting there avoids a data migration
between storage technologies later, which is the riskiest kind.

#### Library: `idb`

- **[`idb`](https://github.com/jakearchibald/idb)** (version 8, about 1 kB)
  wraps IndexedDB in promises and lets the database schema be declared as a
  TypeScript type (`DBSchema`). Store names, keys and record shapes are then
  type-checked. It stays close to the standard API, so its behaviour is
  predictable and well documented.
- **Alternative: [Dexie.js](https://dexie.org/)** (version 4). It's richer:
  declarative schema versions, query helpers and live queries. Our access
  pattern is simple (get, put and list records by key), so Dexie's extra
  layer isn't needed yet. If querying grows (e.g. many scenarios with
  filtering), Dexie can replace `idb` behind the same `PlanStore`
  interface.
- All IndexedDB access goes through one module, `src/persistence/`, behind
  a small interface:

  ```ts
  interface PlanStore {
    loadActivePlan(): Promise<LoadResult>;     // migrated + validated, or an error
    savePlan(plan: Plan): Promise<SaveResult>; // maps to wire, validates, writes
    listPlans(): Promise<PlanSummary[]>;       // for scenarios (M16)
  }
  ```

  The rest of the app never touches IndexedDB directly.

#### Database schema

Database `au-fire-planner`, **database version 1**. The database version
covers the *structure* (stores and indexes). It is separate from the
*document* version inside each record (`schemaVersion`), which covers the
shape of the plan itself.

| Object store | Key | Indexes | Record | Introduced |
| --- | --- | --- | --- | --- |
| `plans` | `id` | `byUpdatedAt`, `byBaseId` | `PlanRecord`: `{ id, name, kind: "base" \| "scenario", baseId?, createdAt, updatedAt, document: PlanDocument }` | M1 (one base plan). Scenarios use `kind`/`baseId` from M16 |
| `meta` | `key` | none | `{ key, value }`: active plan ID, when the disclaimer was accepted, display preferences (e.g. today's or nominal dollars) | M1 |

The plan document, as first written in M1. It is defined once as a Zod
schema, and its TypeScript type is inferred from it:

```ts
const PlanDocumentV1 = z.object({
  schemaVersion: z.literal(1),
  household: z.object({
    people: z.array(z.object({ id: z.string(), label: z.string().optional() })),
  }),
  expenses: z.object({
    livingAnnualDollars: z.number().nonnegative().optional(),
    retirement: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("amount"), annualDollars: z.number().nonnegative() }),
        z.object({ kind: z.literal("percentOfToday"), percent: z.number().nonnegative() }),
      ])
      .optional(),
  }),
  assumptions: z.object({ safeWithdrawalRatePercent: z.number().positive().optional() }),
  portfolios: z.array(z.object({ id: z.string(), name: z.string(), valueDollars: z.number() })),
});
```

Each later milestone that adds inputs either adds optional fields (no new
version needed) or, when the meaning of existing fields changes, bumps
`schemaVersion` and adds a migration.

#### Save and load paths

```
 save:  edit ─► reducer ─► Plan ─► (debounce ~500 ms) ─► planToWire
        ─► validate (Zod) ─► check updatedAt hasn't moved ─► put in a transaction

 load:  get record ─► read schemaVersion ─► migrate step by step to latest
        ─► validate (Zod) ─► planFromWire (apply defaults) ─► Plan
        ─► if migrated: write the upgraded record back
```

- **Migrations** are pure functions (`migrateV1toV2(document)`), applied in
  sequence. Every released `schemaVersion` keeps a fixture file in
  `tests/fixtures/plan-documents/`, and tests migrate each one to the
  latest version, so old saved plans keep loading.
- **Never overwrite what can't be read.** If a stored record fails
  validation or migration, it is left untouched, the app reports the
  problem, and the user can start a new plan without losing the old record.
- **Several tabs open:** each save checks that the stored `updatedAt`
  matches the version this tab loaded. If another tab saved in between,
  the app warns instead of silently overwriting. A `BroadcastChannel`
  tells other open tabs to reload. When the database version is upgraded,
  older tabs get a `versionchange` event and are asked to reload.
- **Unavailable storage:** in some private-browsing modes, IndexedDB is
  missing or cleared on close. The app then runs on in-memory data and
  shows that the plan won't be kept.

#### Testing the data layer

- **Mappers and migrations:** Vitest unit tests for round trips
  (`Plan → PlanDocument → Plan`), defaults, unit conversion, rejection of
  malformed documents, and every stored fixture version.
- **`PlanStore` against IndexedDB:** Vitest with
  [`fake-indexeddb`](https://github.com/dumbmatter/fakeIndexedDB), an
  in-memory implementation of the IndexedDB API, so tests run in Node
  without a browser.
- **Real browser:** Playwright E2E tests that edit a plan, reload the page
  and check that the plan is still there.

### Reusable UI views and components

The mockups repeat the same building blocks across screens. Building each
one once, in `src/ui/components/`, keeps the screens consistent and makes
later milestones mostly a matter of assembly. Each component is introduced
in the first milestone that needs it, built generally enough for its later
uses, and covered by React Testing Library tests.

**Layout and views**

| Component | Purpose | Mockups | Introduced | Reused in |
| --- | --- | --- | --- | --- |
| `AppShell` + `StepNav` | Header, step navigation, plan picker and export slots | all | M0 | every milestone |
| `StepPage` | Page title, intro, content and Back/Next footer | 01–06 | M0 | every input step |
| `Card`, `Banner` | Grouping and notices: disclaimer, "not yet modelled", hints | all | M1 | every milestone |
| `AssetSidebar` | Asset list grouped by kind, with net worth and investable totals | 03a–03d | M9 | M12–M14, M18 |
| `InputsPanel` | Drop-down panel that edits any input without leaving the page | 05b | M16 | all result screens |

**Inputs**

| Component | Purpose | Mockups | Introduced | Reused in |
| --- | --- | --- | --- | --- |
| `MoneyField`, `PercentField` | Number fields with units, validation and a dashed "default" state | all inputs | M1 | every input milestone |
| `AgeField`, `YearField` | Ages and years, with plan-aware limits | 01, 02 | M2 | M3, M6, M7, M19 |
| `SegmentedToggle` | Two or three exclusive options | 01, 02, 03a, 05 | M1 (amount or % of today) | M2 (today's/nominal), M7 (single/couple), M12 (own/rent) |
| `RadioOptionGroup` | Choices that need a sentence each | 03a, 03c | M13 (rate after fixed period) | M14 (keep or sell in retirement) |
| `PerPersonFields` | Renders a field once per person | 01, 03d | M5 (one person, built for N) | M7 onward |
| `OwnershipField` | Splits an asset between people | 03a–03c | M7 | M9, M12, M14 |
| `GrowthRateField` | "Grows at" dropdown that becomes a number field for custom rates | 02, 03a, 03c | M5 (salary growth) | M12, M14, M15 |
| `EditableTable` | Click-to-edit cells, ⋯ row menu (Duplicate, Delete), add row in edit mode | 02, 03a, 03c, 03d, 04 | M3 (dated expenses, EXP-6) | M12, M15, M18, M19, M22 |

**Outputs**

| Component | Purpose | Mockups | Introduced | Reused in |
| --- | --- | --- | --- | --- |
| `MetricTile` | Headline figure with a sub-line and status | 05, 05b | M1 (FI number, progress) | M2–M6, M16 |
| `ExplainPanel` | "How was this calculated?" breakdown (NFR-1) | 05 | M1 | every figure; M8 (year detail), M14 (rental cash flow) |
| `DollarsModeToggle` + `formatMoney` | Today's or nominal dollars for every figure (OUT-2) | 05, 06 | M2 | every output |
| `ProjectionTable` | Year rows, phase bands, collapsed gaps, shortfall flags, column groups, row detail | 05 | M2 | M3 (shortfalls), M5–M14 (new columns) |
| `TimeSeriesChart` | Lines with reference lines and markers, hover tooltip, click to jump to the year's row | 03b, 05, 06 | M3 (FIRE chart a) | M4, M13, M16 |
| `StackedAreaChart` | Stacked balances over time with a shaded period | 05 | M6 (bridge chart b) | M10 |
| `CashFlowChart` | Money in above the axis, money out below, per year | 05 | M8 (FIRE chart c) | M9–M14 |
| `MilestoneTimeline` | Key years on one line (OUT-4) | 05 | M4 | M6, M7, M10, M13 |
| `StatusMeter` | Need vs projected, with MET / SHORT / OVER status | 03d, 05 | M6 (bridge check) | M11 (cap warnings), M16 |
| `ComparisonTable` | Options or scenarios side by side | 05, 06 | M16 (scenarios) | M17 (Coast FIRE choices) |
| `TornadoChart` | One bar per assumption, earlier vs later | 06 | M16 (sensitivity) | none yet |
| `LearnMoreLink` | Link to further reading (NFR-7) | all | M21 | every screen |

**Milestones where introducing a component early pays off**

- **M1: input groups as self-contained form sections.** Each group of
  inputs (e.g. "living expenses", "drawdown") is its own component that
  takes the plan and dispatches edits, with no page layout baked in. The
  steps use them from M1, and the inputs panel in M16 reuses the same
  sections instead of re-implementing every input.
- **M1: `MetricTile` with `ExplainPanel`.** This sets the pattern that every
  headline figure can show its breakdown (NFR-1), before there are many
  figures to retrofit.
- **M2: all money formatting through `formatMoney`.** It is
  dollars-mode aware from the first figure, because retrofitting the
  today's/nominal toggle (OUT-2) across finished screens is easy to get
  subtly wrong.
- **M3: a generic `EditableTable` and a shared chart wrapper.** The first
  table input (dated expenses) and first chart are built from column and
  series configuration, with the hover and click behaviour in one place,
  because almost every later milestone adds a table or a chart.
- **M5: `PerPersonFields` and per-person data built for many.** M5 still
  has one person, but storing salary and super per person, and rendering
  fields per person, is what makes couples (M7) an addition rather than a
  rework. `AssetSidebar` follows in M9, built for many assets, when more
  portfolios arrive.
- **M16: `InputsPanel` is assembly.** If the M1 rule above holds, the panel
  is mostly tabs around existing form sections, plus undo from the
  reducer.

### Hosting and deployment

- **Build:** `npm run build` produces static files in `dist/`. Vite's `base`
  is set to `/au-fire-planning/` so asset paths work under the Pages URL
  (`https://eatea.github.io/au-fire-planning/`).
- **Deploy:** a `deploy.yml` GitHub Actions workflow runs on every push to
  `main`. It builds the app, runs the full checks, then publishes `dist/`
  with GitHub's official Pages actions (`upload-pages-artifact`,
  `deploy-pages`). A PR that fails its checks can't reach the live site.
  The deploy workflow is added in M0, so the skeleton is live from the start.
- **One-off setup by the repository owner:** in the repository's Settings →
  Pages, set the source to "GitHub Actions".
- **No tracking:** no analytics, fonts or scripts are loaded from other
  sites, so a visit sends nothing beyond the request for the static files.
- **Shared-origin caveat:** every GitHub Pages project site under an account
  shares one origin (`https://eatea.github.io`). Browser storage,
  IndexedDB and localStorage alike, is scoped per origin, so any other
  Pages site published from this account could read this app's stored
  plan. That's acceptable while every site on the account is the owner's
  own. If that changes, the fix is a custom subdomain
  (e.g. `fire.example.com`), which gives the app an origin of its own.
  Accepted for now (decision 4 on part 2).

### Testing approach

**Two test frameworks, with a clear split:**

1. **[Vitest](https://vitest.dev/)** for every test that doesn't need a real
   browser: unit, worked-example, property-based, data-layer and component
   tests. One runner, one configuration, one command (`npm test`).
2. **[Playwright Test](https://playwright.dev/)** (`@playwright/test`) for
   every test that drives the real app in a real browser: the end-to-end
   user flows. One command (`npm run test:e2e`).

Everything else is a helper library that plugs into one of those two
runners, not a separate framework.

**Why these two**

| Choice | Over | Reasons |
| --- | --- | --- |
| Vitest | Jest | It shares Vite's configuration and transforms, so TypeScript, ES modules and JSX work without Babel or `ts-jest`. Its API is Jest-compatible, so the usual `describe`/`it`/`expect` patterns apply. Its watch mode is fast. |
| Playwright Test | Cypress | Already used to render the mockups. Waits for elements automatically, so tests are less flaky. Runs tests in parallel. Supports Chromium, Firefox and WebKit. Produces trace files for debugging CI failures, and is well supported on GitHub Actions. |

**What runs where**

| Kind of test | Framework | Helper libraries | Location | What it covers |
| --- | --- | --- | --- | --- |
| Unit | Vitest | none | `src/**/*.test.ts`, next to the code | Every calculation, mapper and reducer action, with small hand-checked cases |
| Worked examples (NFR-6) | Vitest | none | `tests/worked-examples/` | Whole-plan scenarios. Each fixture records its inputs, the expected key figures, and how they were independently checked (e.g. spreadsheet, ATO calculator, hand calculation) |
| Property-based | Vitest | fast-check (`@fast-check/vitest`) | `src/**/*.test.ts` | Invariants for any input: same inputs give the same projection; today's ⇄ nominal conversion is lossless; balances only go negative in years flagged as shortfalls; zero inflation makes today's and nominal dollars equal |
| Data layer | Vitest | fake-indexeddb | `src/persistence/*.test.ts`, `tests/fixtures/plan-documents/` | Wire round trips, defaults, malformed documents, migrations of every stored version, `PlanStore` reads and writes |
| Components | Vitest (jsdom environment) | React Testing Library | `src/ui/**/*.test.tsx` | Shared components (editable tables, toggles, explanations) and form sections, tested the way a user sees them |
| End-to-end | Playwright Test (Chromium) | none | `tests/e2e/*.spec.ts` | Real user flows in the built app. Each milestone adds or extends a flow, e.g. M1 "enter spending and a portfolio, see the FI number", and data still there after reload |
| Static checks | TypeScript, ESLint, Prettier | none | whole repository | Types, lint and formatting |

**Commands**

| Command | Runs |
| --- | --- |
| `npm test` | All Vitest tests once |
| `npm run test:watch` | Vitest in watch mode while developing |
| `npm run test:e2e` | Playwright tests against a production build |
| `npm run check` | Type-checking, ESLint, Prettier check, then `npm test` |

Both `npm run check` and `npm run test:e2e` must pass before any commit is
proposed (CLAUDE.md rule 4).

**Continuous integration** (GitHub Actions, added in M0):

- `ci.yml` runs on every PR: the `check` job runs `npm run check`, and the
  `e2e` job runs `npm run test:e2e`. It uploads Playwright traces when a
  test fails.
- `deploy.yml` runs on every push to `main`: it runs the same checks, then
  publishes to GitHub Pages only if they pass.

## Decisions on part 2

Agreed in review:

1. **Hosting:** GitHub Pages, deployed by GitHub Actions from `main`. Set up in M0.
2. **No file save before M22:** saving to and opening from a file stays with
   export (OUT-7) in M22. No backup mechanism for now.
3. **CI:** GitHub Actions checks on every PR, from M0.
4. **Shared origin accepted:** the app stays on `eatea.github.io` with no
   custom subdomain for now. Revisit if Pages sites that aren't the
   owner's are ever published from this account.

## 3. Milestone plans

### How each milestone is delivered

Agreed with the repository owner. Every milestone goes through the same
four stages:

1. **Plan.** The lead agent writes a step-by-step plan for the milestone in
   this section of `PLAN.md` and opens a PR containing **only that plan**.
2. **Approve.** The owner reviews the plan PR. Implementation does not start
   until the owner **explicitly approves** it. Feedback is worked into the
   plan until then.
3. **Implement.** A lower-cost implementer subagent (e.g. Sonnet or Haiku)
   is given **only this file** and instructions to implement the approved
   milestone, one step at a time. When anything is unclear, it stops and asks
   instead of guessing. The lead answers, and any change of approach is
   written into the plan explicitly, so the plan stays the source of truth.
4. **Verify.** The lead reviews each step's work, runs the checks, and
   commits it, one commit per step with a message explaining why. When the
   milestone is complete, the lead opens a PR for the owner to verify.

### Rules for the implementer

The implementer sees only this file, so the rules that matter for writing
code are repeated here.

- **Work one step at a time, in order.** Do only what the current step
  says. When it's done and its checks pass, stop and report back: the files
  changed, the commands run and their results, and anything that surprised
  you.
- **Don't commit, push or open PRs.** The lead reviews and commits each
  step.
- **Ask, don't guess.** If a step is ambiguous, a command fails in a way the
  step doesn't explain, or doing it properly seems to need something the
  step doesn't mention (a new dependency, a different file layout, a skipped
  check), stop and ask. Don't work around it.
- **Use exactly the versions pinned in the milestone plan**, installed with
  `--save-exact`. Don't add dependencies the plan doesn't list.
- **Document every function.** Each function, component and module gets a
  short comment saying what it is for and how it connects to the rest of
  the app (its callers, its role in a larger flow, any side effects), not a
  restatement of its signature.
- **Write for the reader.** Use descriptive names (no abbreviations or
  single letters outside trivial loops), leave blank lines between logical
  steps, and add comments wherever intent isn't obvious.
- **Tests come with the code.** Any step that adds behaviour adds tests for
  it in the same step. Never skip or disable a test to get a pass.
- **Keep the README accurate.** If a step changes how to install, build,
  run or test the app, update `README.md` in the same step.
- **Keep wire and internal types separate.** Never store or serialise an
  in-memory type directly. Always go through explicit mapping functions.
  (This matters from M1, when data is first saved.)
- **In the lead's development environment**, Chromium is preinstalled at
  `/opt/pw-browsers/chromium`. Don't run `npx playwright install` there. Set
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium` when
  running E2E tests instead (`playwright.config.ts` reads it).

### M0 · Walking skeleton: done

Delivered in PR #7: the app shell and seven-step hash-routed navigation,
ESLint and Prettier, Vitest with React Testing Library, Playwright E2E,
CI on every PR, and deployment to GitHub Pages. The full step-by-step plan
is in git history.

Conventions settled while building M0, which later milestones rely on:

- `tsconfig.json` has `skipLibCheck: true`. Library declaration files
  aren't type-checked, but our own code is.
- `eslint.config.js` uses ESLint's `defineConfig()`, with browser globals and
  React Hooks rules for `src/**`, `tests/unit/**` and `tests/setup/**`, and
  Node globals for `*.config.*` and `tests/e2e/**`.
- `src/vite-env.d.ts` references `vite/client`, so CSS imports type-check.
- `tests/setup/vitest.setup.ts` calls React Testing Library's `cleanup()`
  after each test, because Vitest globals are off.
- The steps are defined once, in `src/ui/navigation/steps.ts`. The page
  layout is `StepPage`, and screens live in `src/ui/screens/`.
- E2E tests run against the production build. Locally,
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` points them at a preinstalled
  Chromium.

### M1 · FI number: done

Delivered in PR #11: the FI number and progress to FI with breakdowns, the
input screens, IndexedDB autosave, and the welcome page. The full
step-by-step plan is in git history.

Conventions settled while building M1, which later milestones rely on:

- **Plan, engine and storage are separate layers.**
  - `src/plan/` holds the in-memory `Plan`, which contains **only
    user-entered values** (unset values are `undefined`), plus `defaults.ts`,
    `resolvePlanInputs`, `planReducer` and `PlanProvider`.
  - `src/engine/` holds the pure calculations. Every figure is an `Explained`
    with lines of working (NFR-1), and resolved values carry
    `Sourced<T> = { value, source: "input" | "default" }`.
  - The engine never throws on user data: impossible inputs come back as
    `incomplete` with a `MissingInput` (a field name and a label). The UI maps
    each field to a step in `src/ui/screens/missingInputSteps.ts`.
- **Storage:**
  - `src/persistence/` stores only `PlanDocumentV1`, the Zod wire format,
    through `planToWire`/`planFromWire`.
  - Adding **optional** fields doesn't need a new `schemaVersion`. The
    `v1-basic.json` fixture must keep loading.
  - Percent ↔ fraction conversion rounds to 12 significant digits.
  - `PlanStore` has `getMeta`/`setMeta` for small settings.
- **Screens are built from self-contained form sections** in
  `src/ui/sections/`, which read with `usePlan()` and edit with
  `usePlanDispatch()`.
- **Fields:**
  - Number fields are `MoneyField`/`PercentField` on a shared `NumberField`.
    They commit on blur or Enter, select their text on focus, show dashed
    defaults when unset, and reject negatives.
  - Every field on a page has a unique label.
- **E2E tests:**
  - Specs import `test`, `expect` and `startFresh` from
    `tests/e2e/fixtures.ts`.
  - `startFresh(page)` accepts the welcome page.
  - Every test also asserts no requests to other origins.
- **Styles use colour role variables only** (see the colour scheme below).
  New text/background pairs go in the contrast test.

### Colour scheme: green and gold: done

Delivered in PRs #13 (plan) and #14: Australia's national green and gold,
replacing the navy scheme, plus an in-browser contrast sweep. The full plan
is in git history.

Rules every later stylesheet must follow:

- **Use only role variables** (`--colour-…`) in stylesheets. Palette
  variables (`--aus-green`, `--aus-gold`, `--green-deep` and so on) are
  referenced only inside `src/ui/styles/tokens.css`.
- **Add any new role to `tokens.css`, and every new text-on-background pair
  to `src/ui/styles/tokens.test.ts`.** Text needs WCAG AA, 4.5:1.
  Graphics (chart lines, outlines, markers) need 3:1.
- **Gold is never text on the header green** (3.2:1). Gold text is fine on
  the deep green page (6.7:1). Text on a gold fill uses `--colour-on-accent`.
- **Errors** use `--colour-text-error` and `--colour-border-error` (pink),
  never the gold accent, so "invalid" never looks like "selected".
- **Every new page goes into the in-browser sweep**,
  `tests/e2e/contrast.spec.ts`, with its fields empty, valid and invalid,
  and with its explanation panels open. The sweep catches inherited colours
  and browser default styles that the token test can't see.
- The mockups stay greyscale. They show layout, not visual design.

### M2 · Growth over time: done

Delivered in PR #15: ages, inflation, expected return and flat
contributions; a year-by-year projection; the FI year and the nominal FI
number at retirement; the Year by year table with a today's/nominal toggle.
The full step-by-step plan is in git history.

Conventions settled while building M2, which later milestones rely on:

- **Projection timing** (`src/engine/projection.ts`):
  - Row 0 is today, with no flows. Row *k* is the end of year *k*, labelled
    `startYear + k`.
  - Every value in row *k* is nominal and shares one inflation index,
    `(1+i)^k`. Today's dollars = nominal ÷ that index.
  - Growth is on the opening balance, and flows are added at the end of the
    year.
  - Contributions are flat dollars (not indexed). They are added while
    `age ≤ stop age`, which defaults to the target retirement age.
- **Two levels of "complete":** `summarisePlan(plan, startYear)` returns
  M1's figures once living expenses are known. Its `projection` part has its
  own `complete`/`incomplete` status, because it also needs the ages.
- **The start year comes from a `Clock`** (`src/plan/clock.ts`) through
  `PlanProvider`'s `startYear` prop. The engine never reads the date. Unit
  tests pass 2026. E2E tests fix it with `page.clock.install`.
- **Money on screen goes through `useMoneyFormatter()`**, which follows the
  `DollarsModeProvider` (in memory, starting on nominal dollars).
  Figures that are nominal by definition, such as "FI number at
  retirement", say so and don't follow the toggle.
- **Explanation units** are `dollars`, `fraction` (shown as a percentage)
  and `factor` (shown as a plain multiplier, such as 1.4845). The line's
  operator supplies the ×, ÷, − or =.
- **Fields:** `AgeField` takes whole years. Stored ages are accepted from
  0 to 120, looser than any form, so that tightening a form never makes a
  saved plan unreadable.
- **Worked-example fixtures** with a projection have a top-level
  `startYear`, and list only the rows and fields worth checking.
- **Shared screen pieces:** `MissingInputsBanner` ("Enter these") and
  `ProjectionTable` (generic over `{ header, cell(row) }` columns).

### M3 · Retirement drawdown and solvency: done

Delivered in PRs #19 (A: drawdown and solvency) and #21 (B: earliest
retirement age and the FIRE chart):
- the projection runs to the plan-until age;
- cash earns interest;
- retirement spending is drawn from cash, then the portfolio;
- dated and one-off expenses;
- shortfall flags;
- "Money lasts";
- the earliest feasible retirement age;
- chart (a).

The full step-by-step plan is in git history.

Conventions settled while building M3, which later milestones rely on:

- **Projection rules** (`src/engine/projection.ts`, extending M2's):
  - **Phases:** retired years are those with `age > target retirement age`.
    Each row has `phase`.
  - **Spending to fund each year:** retirement spending in retired years,
    plus dated expenses in any year, both grown with inflation. It's drawn
    from cash first, then the portfolio. What's left over is that row's
    `shortfall`, and the projection carries on.
  - **Dated expenses** are in today's dollars, for calendar years from the
    start year + 1. A one-off has From = To.
  - **Investable net worth** is cash + portfolio (`investableClosing`). It
    is used for progress to FI and for FI reached.
  - **Validation:** impossible combinations of ages (end age, retirement
    age) are reported as `MissingInput`s, so the projection shows as
    incomplete with a clear message.
- **Solvency and search:**
  - `assessSolvency(rows)` says whether the money lasts.
  - `findEarliestRetirementAge` scans retirement ages from the current age
    to end age − 1, reusing `projectPortfolio` and `assessSolvency`. A stop
    age left at its default follows the age being tried.
  - New engine features build on these functions rather than copying
    their rules.
- **Explanation units:** `dollars`, `fraction`, `factor` and `years`.
- **Sections that need the start year** use `usePlanStartYear()`, never
  `new Date()`.
- **`EditableTable`** (`src/ui/components/`):
  - `onAdd()` returns the new row's id.
  - On Enter, the editor closes only when the field shows no error
    (`aria-invalid`).
  - Escape is guarded against a commit on blur.
  - Its browser behaviour is covered by E2E tests, because jsdom can't
    reproduce blur on removal.
- **`ProjectionTable`** supports band rows between phases, and
  `scrollToKey`. Year by year reads `?year=` to scroll to and outline a
  row.
- **Charts:**
  - `TimeSeriesChart` is the only file that imports Recharts.
  - Series colours come from CSS classes setting `--series-colour` from
    role variables, never from colour props.
  - Each chart is a `role="img"` with a name, plus a visually hidden data
    table.
  - Graphics colours are checked at 3:1, in their own list in
    `tokens.test.ts`, separate from text at 4.5:1.
  - **Testing:**
    - In jsdom, pass an explicit `width` and `height` (the `ResizeObserver`
      stub reports no size).
    - In E2E, call `scrollIntoViewIfNeeded()` before hovering.
    - Assert the series' rendered stroke, so a lost class can't fall back
      to the library's blue.
  - Chart data comes from a pure builder in `src/ui/charts/`, with its own
    unit tests.
- **Hidden data tables repeat figures.** Scope text queries in tests to a
  tile or card, rather than the whole page.
- **Results tiles show fixed figures and say which dollars they're in.**
  Only charts and Year by year follow the today's/nominal toggle, which
  starts on nominal.

### Results and Year by year on one page: done

Delivered in PR #23 (plan in PR #20). Results and Year by year are one
step, so the app has six steps, and Scenarios is step 6. The full plan is
in git history.

Conventions every later milestone follows:

- **The Results page, top to bottom:**
  - page header with the dollars toggle;
  - "On this page" links;
  - the missing-inputs banner (only if incomplete);
  - the tiles;
  - the runs-out banner;
  - the charts;
  - the "Not yet modelled" banner;
  - the Year by year section.

  New sections (milestones, more charts) go between the charts and Year by
  year, and each adds an "On this page" link.
- **One dollars toggle**, in `StepPage`'s `headerAction` slot, covers the
  tiles, the charts and the table. Figures that are nominal by definition
  still say so and don't follow it.
- **In-page links:**
  - `#/results?year=2038` scrolls to that row and outlines it;
  - `#/results?view=<section-id>` scrolls to a section, which is a `Card`
    with an `id`;
  - chart clicks and the runs-out banner use these.
- **Old routes redirect:** `#/year-by-year` (with or without `?year=`)
  lands on Results.
- **`YearByYearSection`** renders only when the projection is complete.
  The page shows one missing-inputs banner, at the top.

### M4 · Coast FIRE: done

Delivered in PR #24 (plan in PR #22):
- the Coast FIRE number and when it's reached;
- a Milestones section;
- the "When could you stop contributing?" chart.

The full step-by-step plan is in git history.

Conventions settled while building M4, which later milestones rely on:

- **Coast FIRE** (`src/engine/coastFire.ts`):
  - `coast(k)` = the assets whose path doesn't depend on the contributions
    you'd stop (cash so far), plus the portfolio needed. That portfolio
    amount has a closed form: what reaches the FI number at retirement,
    after covering any dated expenses those assets can't pay.
  - **"Reached at row k"** means exactly: stop contributing after year *k*
    and you still reach FI by retirement. A property test checks this
    against the real projection. Keep it true when adding assets.
  - The "no more contributions" path is `projectPortfolio` with
    contributions switched off. Never a copy of its rules.
  - Coast FIRE comes no later than FI only when every asset grows at
    least as fast as inflation.
- **Milestones:** `MilestoneTimeline` (`src/ui/components/`) is generic over
  `{ year?, label, detail?, status }`. Later milestones add items in
  `buildMilestoneItems` (`src/ui/sections/MilestonesSection.tsx`).
- **Charts:**
  - `TimeSeriesChart` series take
    `strokeStyle: "solid" | "dashed" | "dotted"`. Lines on one chart
    differ by style as well as colour.
  - The chart's right margin leaves room for a marker label on the last
    year.
  - Each chart's E2E spec asserts its series' rendered strokes, and flow
    specs don't repeat that.
- **Tests on a busy Results page:**
  - Unit tests open a tile's breakdown by its label (`openExplanation`),
    never by position.
  - Text queries are scoped to a tile or card, because sections repeat
    figures.
- **Local E2E caveat:** `reuseExistingServer` is on outside CI, so a local
  run can test a stale preview build. Restart the preview server after
  pulling or editing before trusting a local failure. CI is unaffected.

### M5 · Superannuation: accumulation: step-by-step plan

**Status:** approved (PR #25). PR A (steps 1 to 4) in progress, one step
at a time.

**Kind:** behavior change.
- PR A's first step adds the rules-as-data foundation (NFR-3), which
  changes nothing the user sees on its own.

**Goal:** super becomes part of the plan. Salary drives employer
contributions. Super grows with contributions and earnings, both taxed as
the law says. It counts towards investable net worth, and is drawn on once
it's accessible. From this milestone, statutory rates live in dated data
files, not in code.

**Requirements in scope:**
- NFR-3 rules stored as dated data: the foundation, starting with the super
  rules;
- IN-7 salary and its growth;
- IN-21 super balance and return, net of fees;
- IN-22 the employer contribution rate (SG), defaulting to the legislated
  rate;
- IN-23 voluntary concessional (salary sacrifice) and non-concessional
  contributions, each with start and end years;
- IN-24 employer contributions stop at retirement (the default behaviour;
  see the decisions for the override);
- SUPER-2 the 15% contributions tax on concessional contributions;
- SUPER-5 the accumulation earnings tax.

**Out of scope (later milestones):**
- **M6:**
  - a configurable super access age, preservation (SUPER-1), the bridge
    check (FIRE-4) and chart (b);
  - Coast FIRE split into super and outside super (COAST-3). M5 draws
    super only from 65, the default access age.
- **M7:** a second person. M5 builds per-person data but shows one person.
- **M8:** tax on salary, and salary paying for living expenses.
  Contributions to the portfolio are still entered directly.
- **M10:** retirement phase (SUPER-6), when earnings become tax-free.
  Until then, earnings stay taxed at 15% after retirement, which is
  conservative.
- **M11, M20 and M23:**
  - contribution caps (SUPER-4, M11 and M20);
  - Division 293 (SUPER-3, M20);
  - carry-forward (IN-25, M23).
- **M23:** IN-24's override (employer contributions after retirement),
  which only matters once there is income after retirement (IN-9, M23).
  This moves part of a Must requirement into a later milestone, so it's
  called out for review.
- **M9 (moved from M5):** `AssetSidebar`. Assets has three cards (super,
  portfolio and cash), which still read fine as a page. Part 2's
  component map is updated in this PR.

**Two PRs:**
- **PR A, rules as data and salary (steps 1 to 4).** It adds the dated
  rules files and the code that loads them, then salary with its growth.
  Salary shows in Year by year. It affects nothing else until PR B,
  which the hint says.
- **PR B, super (steps 5 to 10).** Super accounts, contributions and taxes,
  drawing super from 65, investable net worth including super, Coast FIRE
  with super, and the outputs.

**Definition of done:**

- `src/rules/data/fy2025-26.json` holds the FY2025–26 super rules, each with
  its source link. The engine reads every statutory rate from it.
- Income & expenses has a Salary card: the gross salary, and how it grows.
- Assets has a Super card:
  - the balance, and the return net of fees;
  - the employer rate (dashed when following the law);
  - salary sacrifice and non-concessional contributions, each with years;
  - an advanced "tax on earnings" field.
- Year by year shows salary, money into super, and the super balance.
  Investable includes super.
- Results:
  - progress to FI, FI reached, Coast FIRE, the earliest retirement age
    and the charts all count super;
  - the breakdowns show it as its own line.
- Super is drawn only from age 65, after cash and the portfolio. Years
  before that which only super could fund are flagged as shortfalls.
- With the worked examples below, the figures match to the cent.
- Plans saved by M1 to M4 still load.
- `npm run check` and `npm run test:e2e` pass, and CI is green.

#### Design decisions for M5

**Rules as data (NFR-3)** (`src/rules/`):

```
  src/rules/data/fy2025-26.json  ──parse (Zod)──►  RulesFile (wire)
                                                      │ ruleSetFromWire
                                                      ▼
                                   RuleSet: snapshots sorted by effective date
                                                      │ rulesForYear(ruleSet, year, inflation)
                                                      ▼
                                   YearRules: the rates and thresholds for one row
```

- **One JSON file per financial year,** for example:

  ```json
  {
    "schemaVersion": 1,
    "financialYear": "2025-26",
    "effectiveFrom": "2025-07-01",
    "superannuation": {
      "guaranteeRatePercent": 12,
      "maximumContributionBaseQuarterlyDollars": 62500,
      "contributionsTaxPercent": 15,
      "earningsTaxPercent": 15,
      "discountedCapitalGainsTaxPercent": 10
    },
    "sources": { "guaranteeRatePercent": "https://www.ato.gov.au/…", "…": "…" }
  }
  ```

  Every value has a source link. **The implementer checks each value against
  its source.** If any differs from this plan, they stop and ask. The 10%
  capital gains rate is stored now for M9, but not used yet.
- **Wire and internal types are separate** (CLAUDE.md rule 6):
  `RulesFile` (Zod) is mapped to the `RuleSet` internal type by
  `ruleSetFromWire`. Percentages become fractions, and the quarterly base
  becomes an annual amount (× 4).
- **The rules ship with the app:** imported as JSON and parsed once at
  start-up. A unit test parses every file in `src/rules/data/`, so a bad
  file fails the build, not the user.
- **Which rules a row uses:** row *k* (calendar year *Y*) uses the rules in
  effect on **1 January *Y***, which is the financial year that began the
  July before.
  - Rows are 12-month steps, not financial years, so this is the closest
    single choice.
  - A row before the earliest file uses the earliest file.
- **Years after the latest file** use the latest file's rates. Its dollar
  thresholds (the maximum contribution base) grow with the plan's
  inflation, one year at a time from that file's year.
  - The real thresholds are indexed to wages in $2,500 steps. Inflation
    is the closest thing the plan models, and it keeps "today's dollars"
    meaningful.
  - Adding next year's file later simply replaces the estimate.
- **The engine takes the rule set as a parameter:**
  `summarisePlan(plan, startYear, ruleSet)`, as Part 2 intended. The
  engine never imports the data files. `PlanProvider` passes the bundled
  set, and tests can pass their own.
- **A new value source:** `Sourced` gains `"rule"`, so a value that comes
  from the law (the employer rate) says "FY2025–26 rules" in breakdowns,
  rather than "default".

**Salary** (IN-7), per person:
- **Fields:** the gross (pre-tax) salary per year (default $0), and how it
  grows.
  - **Growth options:** "Inflation", "Inflation + …%", "Inflation − …%",
    "Fixed …%" or "No growth". The default is "Inflation".
  - **Internal type:**
    `SalaryGrowth = { kind: "inflationPlus"; margin } | { kind: "fixed"; rate } | { kind: "none" }`.
    "Inflation" is `inflationPlus` with a margin of 0.
- **Timing:** row *k* pays `salary × (1 + growth)^k` while
  `age ≤ retirement age`, and nothing after. This matches M2's "one index
  per row" rule: like living expenses, the first projected year's salary is
  already one year's growth on today's.
- **What salary does in M5:** it sets employer contributions. It doesn't
  pay for living expenses until tax arrives in M8, so the field's hint
  says: "Before tax. Sets your employer super contributions; tax and
  take-home pay come in a later version."
- **UI pieces:**
  - `GrowthRateField`, a dropdown that becomes a percentage field for the
    custom options (Part 2's component map, introduced here);
  - `PerPersonFields`, which renders a field once per person. With one
    person it adds no name. Couples use it in M7.

**The super account** (IN-21 to IN-24), one per person. Every field is
optional:

| Field | Default |
| --- | --- |
| Balance | $0 |
| Return, net of fees | 7% |
| Employer contribution rate | the legislated rate each year (12% in FY2025–26), shown dashed as "12% (legislated)" |
| Salary sacrifice | $0. When set: from next year to the retirement year |
| Non-concessional contributions | $0. When set: from next year to the retirement year |
| Tax on earnings (advanced) | the legislated rate (15%) |

- **Employer contributions stop at retirement** (IN-24): they follow
  salary, which stops then. The override (contributions continuing after
  retirement) only matters once there's income after retirement (IN-9), so
  it comes with that in M23. Until then there's nothing after retirement
  for employer contributions to be paid on.
- **Salary sacrifice is paid only while working,** because it comes out of
  salary. **Non-concessional contributions follow their years,** whether
  working or not.

**Super each year** (row *k*, in this order):

```
  salary(k)        = as above
  employer(k)      = employer rate × min(salary(k), maximum contribution base(k))
  sacrifice(k)     = salary sacrifice, if working and in its years
  concessional(k)  = employer(k) + sacrifice(k)
  contributions tax= concessional(k) × 15%                     (SUPER-2)
  earnings(k)      = super opening × return (net of fees)
  earnings tax     = earnings(k) × tax on earnings (15%)       (SUPER-5)
  super available  = opening + earnings − earnings tax
                   + concessional − contributions tax
                   + non-concessional(k)
```

- **Employer contributions are worked out on salary before salary
  sacrifice,** as the law has required since 2020. They're capped at the
  maximum contribution base ($250,000 a year in FY2025–26).
- **Non-concessional contributions aren't taxed on entry.**
- **Where the money for voluntary contributions comes from** (take-home
  pay) isn't modelled until M8. The hint says so.

**Tax on super earnings** (SUPER-5): the default applies 15% to all
earnings. This is the most the law charges (the "up to 15%" in SUPER-5),
so it errs on the conservative side.
- **Real funds pay less overall**, typically: capital gains on assets held
  over a year are taxed at 10%, and franking credits offset tax.
- **The mix depends on the fund,** so it's an advanced, per-account field
  ("Tax on earnings"). It shows the legislated 15% as its default, dashed.
  A user who knows their fund's effective rate can enter it.
- This follows the "each asset grows its own way" principle.

**Drawing on super.** In M5, super is drawn only from **age 65** (IN-5's
default access age), and only after cash and the portfolio. The order
each year is cash, then the portfolio, then super if the person is 65 or
over.
- **Before 65,** a year that only super could fund is a shortfall, and the
  shortfall banner explains why.
- **M6** makes the access age an input, and adds the bridge check that
  explains these years properly.

**Investable net worth = cash + portfolio + super.**
- **What it feeds:** progress to FI, FI reached, the charts and the
  earliest retirement search all use it. That's the usual Australian FIRE
  definition.
- **Why super can't be spent early:** the access rule above stops locked
  super being spent, so "money lasts" stays honest.
- **Breakdowns** show super as its own line.

**Coast FIRE with super.** M4's rule extends naturally.
- **What stops when you coast:** coasting means you stop the
  contributions you choose to make: the portfolio, salary sacrifice and
  non-concessional. Employer contributions continue, because you're still
  working until retirement.
- **The formula:** cash, and super on that "employer contributions only"
  path, join the "assets that follow their own path" part of M4's formula.
  The portfolio needed covers the rest:

  ```
  coast(k) = cash(k) + super(k) + portfolioNeeded(k)
      where portfolioNeeded uses cashLeft(k) and superLeft(k), super grown
      from row k with employer contributions only
  ```

- **"Reached at row k" still means exactly** "stop your voluntary
  contributions after year k and still reach FI by retirement". The
  property test now stops portfolio and voluntary super contributions
  together.
- **In the breakdown,** "Your super, growing at {return} net of fees and
  tax, with employer contributions, to {year}" is a new line.
- **COAST-3 (M6)** later shows super and outside super separately.
- **COAST-5's intent** (employer contributions continuing while coasting)
  is covered here for the default case.

**Outputs:**
- **Year by year columns:**
  - "Salary" (PR A);
  - "Into super" (contributions after contributions tax);
  - "Super" (balance).

  "Contributions" becomes "Into portfolio". "Investable" includes super.
  The table already scrolls sideways inside its own box.
- **Breakdowns:**
  - progress to FI's investable lines gain "Super";
  - the Coast FIRE breakdown gains the super line;
  - "Money runs out" in a locked year adds the line "Super (not accessible
    until 65)".
- **The "Not yet modelled" banner** becomes: "super is only drawn from 65
  (M6 lets you change this and checks the years before), tax (M8),
  property (M12) and more."

#### Worked examples

These were checked with an independent script, not the app's code. Each
becomes a fixture in `tests/worked-examples/m5-super.json`. The start year
is 2026. The FY2025–26 rules are 12% SG, a $250,000 annual base grown with
inflation, and 15% contributions and earnings tax.

**S1: super by hand.** Age 40, retire at 42, plan until 44. Salary $100,000.
0% inflation. Super $50,000 at 8% net of fees.

| Year | Age | Salary | Employer | Earnings | Earnings tax | Contributions tax | Super |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2027 | 41 | $100,000 | $12,000 | $4,000.00 | $600.00 | $1,800.00 | $63,600.00 |
| 2028 | 42 | $100,000 | $12,000 | $5,088.00 | $763.20 | $1,800.00 | $78,124.80 |
| 2029 | 43 | — | — | $6,249.98 | $937.50 | — | $83,437.29 |
| 2030 | 44 | — | — | $6,674.98 | $1,001.25 | — | $89,111.02 |

**S2: the cap on employer contributions.** S1 with a $300,000 salary, one
year:
- employer contributions are $30,000 (12% of $250,000), not $36,000;
- contributions tax is $4,500;
- super ends at $25,500.

**S3: voluntary contributions with years.** S1 with a $0 balance and 0%
return. $10,000 salary sacrifice from 2027 to 2030, and $20,000
non-concessional in 2028 only.

| Year | Age | Employer | Sacrifice | Non-concessional | Contributions tax | Super |
| --- | --- | --- | --- | --- | --- | --- |
| 2027 | 41 | $12,000 | $10,000 | — | $3,300.00 | $18,700.00 |
| 2028 | 42 | $12,000 | $10,000 | $20,000 | $3,300.00 | $57,400.00 |
| 2029 | 43 | — | — (retired) | — | — | $57,400.00 |

**S4: super locked until 65.**
- **Inputs:** age 60, retired, plan until 67. Only super: $500,000 at 0%.
  0% inflation, $20,000 spending.
- **2027 to 2030 (ages 61 to 64):** each is a $20,000 shortfall, and super
  stays at $500,000.
- **From 2031 (age 65):** spending is drawn from super, which ends 2031
  to 2033 at $480,000, $460,000 and $440,000.

**A: headline.** M4's example A, plus:
- super of $185,000 at 7% net of fees;
- a salary of $145,000 growing at inflation + 1%;
- $10,000 of salary sacrifice a year from 2027 to 2042.

Results:
- **Row 1 (2027):**
  - salary $150,075.00, employer $18,009.00, sacrifice $10,000;
  - earnings $12,950.00, earnings tax $1,942.50, contributions tax
    $4,201.35;
  - super $219,815.15, investable $1,041,015.15.
- **2042 (age 50):** salary $251,427.98, employer $30,171.36, super
  $1,175,633.85.
- **FI reached:** **2033, age 41**: $1,932,046.19 against $1,901,897.21
  (M4 without super: 2038, age 46).
- **Money lasts:** to 95 (2087).
- **Earliest retirement:** age **40**.
- **Coast FIRE:** $672,262.87 (cash $20,000 + super $185,000 + portfolio
  $467,262.87), **already reached**.

**C: Coast FIRE later.** A, with a $300,000 portfolio, a $120,000 salary
growing at inflation, and $100,000 of super. Salary sacrifice is still
$10,000 from 2027 to 2042.
- **Row 1 (2027):** salary $123,000.00, employer $14,760.00, contributions
  tax $3,714.00, super $126,996.00, investable $498,796.00.
- **Coast FIRE:** $698,765.82 (cash $20,000 + super $100,000 + portfolio
  $578,765.82), reached in **2037, at age 45**. Checked against the real
  projection, with the FI number at retirement $2,375,208.99:
  - stopping voluntary contributions after 45 gives $2,385,819.60;
  - stopping after 44 gives $2,332,394.93.
- **FI reached:** **2041, age 49**.
- **Earliest retirement:** age **47**.

#### Pinned versions

No new dependencies.

---

**PR A · Rules as data and salary**

#### Step 1 · Rules as data (NFR-3)

- [x] Done (values verified by the owner on 2026-10-03)

1. Add `src/rules/`:
   - `rulesFile.ts`: the Zod schema for one file (above);
   - `ruleSet.ts`: the `RuleSet`, `RuleSnapshot` and `YearRules` internal
     types, `ruleSetFromWire`, and
     `rulesForYear(ruleSet, calendarYear, inflationRate)`;
   - `data/fy2025-26.json`, with a source link for each value. **Check each
     value against its source.** If any differs from this plan, stop and
     ask;
   - `bundledRuleSet.ts`: imports every data file and builds the rule set
     once.
2. Add `"rule"` to `ValueSource`.
3. Tests:
   - every file in `src/rules/data/` parses;
   - a file missing a field, or with a negative rate, is rejected;
   - percent → fraction, and quarterly → annual;
   - `rulesForYear` picks by 1 January, uses the earliest file for earlier
     years, and grows dollar thresholds with inflation after the latest
     file (e.g. $250,000 → $256,250 for 2027 at 2.5%);
   - two snapshots: the later one replaces the earlier one from its date.
4. Document `src/rules/` in the README's project layout. Add a short "How
   to add next year's rules" section.

**Kind:** behaviour-neutral foundation. Nothing reads the rules yet.

**Check:** `npm run check` passes.

**As built:**
- **The values are unverified.** The network policy blocked ato.gov.au and
  legislation.gov.au, so the pages could not be opened. The values match
  what web search reported from ATO pages (SG 12%, $62,500 per quarter,
  15% and 15%, one-third discount on the 15% rate = 10%). The file records
  this as `"verification": { "status": "unverified", ... }`. Later, the
  network was opened to the ATO, but its site blocks automated clients
  (Akamai "Access Denied"). The owner chose to commit with the values
  unverified, then **checked all five against these pages on 2026-10-03
  and confirmed them**. The file now says `"status": "verified"`. URLs, as
  stored in `sources`:
  - SG 12%:
    https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee
  - Maximum contribution base $62,500 per quarter:
    https://www.ato.gov.au/businesses-and-organisations/super-for-employers/quarterly-super-to-30-june-2026/how-much-super-to-pay
  - Contributions tax 15%, earnings tax 15% and discounted capital gains
    10% (the 10% is a one-third discount on 15%, so check the page states
    the discount):
    https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/self-managed-super-funds-smsf/smsf-administration-and-reporting/how-smsfs-are-taxed
- Differs from the plan: the rules file has a required top-level
  `verification` field (`status` is `"verified"` or `"unverified"`, plus an
  optional `note`).
- `"rule"` was added to `ExplanationLine.source` in `src/engine/explained.ts`
  as well as `ValueSource`, because the engine's explanation lines are
  assigned from `ValueSource`. Nothing displays it yet.
- The README had no project layout, so a "Project layout" section was added
  alongside "How to add next year's rules".
- `rulesForYear` also returns `isEstimated`, true when the thresholds are an
  inflation estimate past the latest file.

#### Step 2 · Engine: salary

- [x] Done

1. Add `salary?: { annual?: number; growth?: SalaryGrowth }` to `Person`,
   with defaults ($0, inflation). Resolve it in `resolvePlanInputs`.
2. `summarisePlan(plan, startYear, ruleSet)`: thread the rule set through,
   and update every caller. `PlanProvider` passes the bundled set.
3. `ProjectionRow` gains `salary`, following the timing rule above.
4. Tests:
   - each growth kind;
   - no salary after retirement;
   - fixture `tests/worked-examples/m5-super.json`, starting with example
     A's salary in 2027 ($150,075.00) and 2042 ($251,427.98);
   - a property test: "No growth" keeps salary flat while working.

**Check:** `npm run check` passes. Every earlier figure is unchanged.

**As built:**
- `Person.salary` (`Salary`, `SalaryGrowth`) in `src/plan/types.ts`, defaults
  in `defaults.ts`, resolved into `ResolvedProjectionInputs.salaryAnnual` and
  `salaryGrowth`.
- `ProjectionInputs.salary` is optional (absent means no salary), so the
  existing engine tests didn't need editing. `ProjectionRow.salary` is
  required. Row 0 is the salary today (`annual`, if working), consistent with
  the formula at k = 0.
- `summarisePlan(plan, startYear, ruleSet)`: the rule set is accepted but not
  read yet, so the parameter carries an `eslint-disable` for
  `no-unused-vars`. Remove it in step 5 when super reads the rules.
- Worked examples A (2027 $150,075.00, 2042 $251,427.98, 2043 $0) and B (flat,
  by hand) are in `tests/worked-examples/m5-super.json`, checked by a new
  `salaryRows` field in `tests/unit/workedExamples.test.ts`.

#### Step 3 · Salary state, wire format and shared fields

- [ ] Done

1. Reducer actions:
   - `setSalary { personId, annual? }`;
   - `setSalaryGrowth { personId, growth? }`.
2. Wire: `people[].salary { annualDollars?, growth? }`, where growth is
   `{ kind: "inflationPlus", marginPercent }`,
   `{ kind: "fixed", ratePercent }` or `{ kind: "none" }`. Add the fixture
   `v1-salary.json`. Older fixtures still load.
3. `GrowthRateField` and `PerPersonFields` in `src/ui/components/`, with
   tests:
   - every option;
   - switching from a custom option back to "Inflation" clears the number;
   - limits (−10% to +15%);
   - keyboard use.

**Check:** `npm run check` passes.

#### Step 4 · Salary on screen (end of PR A)

- [ ] Done

1. Income & expenses: a "Salary" card, first on the page as in mockup 02,
   with "Gross salary per year" and "Grows at". Use the hint above.
2. Year by year: a "Salary" column after "Age".
3. Add the card to the contrast sweep.
4. E2E (`tests/e2e/salary.spec.ts`):
   - enter a salary and "Inflation + 1%";
   - Year by year shows the grown salary until retirement, and "—" after;
   - after a reload, it's still there.
5. README "What it does": add salary.
6. ~~Before PR A merges, the owner checks the FY2025–26 values.~~ Done: the
   owner verified them on 2026-10-03, and the file says so.

**Check:** `npm run check` and `npm run test:e2e` pass. **Open PR A.**

---

**PR B · Super**

#### Step 5 · Engine: super accumulation and access

- [ ] Done

1. Add `superAccount?: SuperAccount` to `Person`, with the fields and
   defaults above. Resolve it, with the employer rate's source as `"rule"`
   when it's left to the law.
2. In `projectPortfolio`, apply the "super each year" rules and the
   drawing order (cash, portfolio, then super from 65). `ProjectionRow`
   gains:
   - `employerContribution`, `salarySacrifice`, `nonConcessional`;
   - `superEarnings`, `superEarningsTax`, `contributionsTax`;
   - `superOpening`, `superClosing`, `fromSuper`.

   `investableClosing` includes super.
3. Progress to FI's investable gains a "Super" line.
4. Tests:
   - unit tests for each rule, including:
     - the cap;
     - salary sacrifice only while working;
     - non-concessional after retirement;
     - no drawing before 65;
     - drawing from 65;
   - fixtures S1 to S4, A and C: the rows above, FI reached, money lasts
     and the earliest retirement age, to the cent. Coast FIRE is added in
     step 6;
   - every M1 to M4 fixture still passes (no super, no salary, so
     unchanged);
   - property tests:
     - super each row: opening + earnings − earnings tax + concessional −
       contributions tax + non-concessional − drawn = closing;
     - employer contributions ≤ rate × the maximum contribution base;
     - super is never drawn before 65;
     - more starting super never creates a shortfall.

**Check:** `npm run check` passes.

#### Step 6 · Engine: Coast FIRE with super

- [ ] Done

1. Extend `calculateCoastFire` as described above. Super's "employer
   contributions only" path from each row comes from `projectPortfolio`
   with voluntary contributions switched off from that row. Don't copy its
   rules.
2. Add the super line to the Coast FIRE breakdown.
3. Tests:
   - examples A (already reached, $672,262.87) and C (2037, age 45,
     $698,765.82);
   - the M4 fixtures still pass;
   - the "reached means stoppable" property stops portfolio and voluntary
     super contributions together.

**Check:** `npm run check` passes.

#### Step 7 · Super state and wire format

- [ ] Done

1. Reducer actions for each super field, including clearing back to the
   default. The contribution years keep `toYear ≥ fromYear`, as dated
   expenses do.
2. Wire: `people[].superAccount`, with:
   - `balanceDollars?`, `returnPercent?`, `employerRatePercent?`;
   - `salarySacrifice? { annualDollars?, fromYear?, toYear? }`;
   - `nonConcessional? { annualDollars?, fromYear?, toYear? }`;
   - `earningsTaxPercent?`.

   Add the fixture `v1-super.json`. Older fixtures still load.
3. The round-trip property test generates super accounts, including empty
   ones.

**Check:** `npm run check` passes.

#### Step 8 · Super on the Assets screen

- [ ] Done

1. Add a "Super" card, first on Assets as in mockup 03d, with:
   - "Super balance";
   - "Return, net of fees";
   - "Employer contribution rate", dashed as "12% (legislated)" when
     following the law;
   - "Salary sacrifice per year", with From and To years;
   - "Non-concessional contributions per year", with From and To years;
   - an "Advanced" disclosure holding "Tax on earnings".
2. **Hints:**
   - **Return:** "After fees, before tax. The app takes off the tax on
     earnings."
   - **Salary sacrifice:** "Before tax, from your salary while you work.
     Taxed 15% going in."
   - **Non-concessional:** "From after-tax money. Not taxed going in."
   - **Tax on earnings:** "15% is the most the law charges. Funds often pay
     less because of the 10% rate on long-held gains and franking credits.
     Enter your fund's rate if you know it."
3. Add the card, with Advanced open, to the contrast sweep.
4. Tests for each field: entering, clearing to default, limits, and the
   years.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 9 · Super in the outputs

- [ ] Done

1. Year by year:
   - "Contributions" becomes "Into portfolio";
   - add "Into super" (after contributions tax) and "Super";
   - "Investable" includes super;
   - a shortfall year before 65 says "Super not accessible until 65" in
     its status detail.
2. Results: the breakdown lines described above, and the new "Not yet
   modelled" wording. The charts need no change: they already plot
   investable.
3. Tests:
   - example A's 2027 row;
   - example S4's locked years and its first year drawing from super;
   - the breakdowns' super lines.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 10 · E2E, README and wrap-up (end of PR B)

- [ ] Done

1. E2E (`tests/e2e/super.spec.ts`), with the clock fixed in 2026:
   - **Example A:**
     - enter it through the screens;
     - Results shows FI reached 2033, age 41;
     - earliest retirement age 40;
     - Coast FIRE "Reached: contributions are now optional";
     - Year by year's 2027 row shows salary $150,075 and super $219,815;
   - **Example S4:** shortfalls from 2027 to 2030, then none;
   - **Reload:** the super inputs are still there.
2. README "What it does": add super. PLAN.md: the M5 status, Next steps,
   and "As built" notes.

**Check:** `npm run check` and `npm run test:e2e` pass. **Open PR B.**

#### Follow-ups

- **Remember the today's/nominal choice** in `meta` between visits (from
  M2).
- **Advanced growth options per asset** (from M4's review). Needs a
  backlog requirement.
- **The FY2026–27 rules file,** once the ATO publishes it, replaces the
  inflation estimate for the maximum contribution base.
- **M11: clarify the "Tax on earnings" hint** (owner's decision). The field
  is for a fund's effective rate below 15%, not for approximating Division
  296, which M11 models from the rules. Confirm Division 296's legislative
  status when planning M11.
- **Carried from M1:**
  - flush unsaved edits when the tab closes;
  - write back migrated records once the first migration exists;
  - two tabs on an empty database (M16).

## Next steps

- [x] Part 1: agree the requirement ordering.
- [x] Part 2: agree the tech stack, architecture and testing approach.
- [x] Part 3: approve the M0 step-by-step plan.
- [x] Implement M0 (subagent, step by step).
- [x] Owner verifies and merges the M0 PR.
- [x] Approve the M1 step-by-step plan.
- [x] Implement M1 (subagent, step by step).
- [x] Owner verifies and merges the M1 PR.
- [x] Approve the colour scheme plan.
- [x] Implement the colour scheme (steps 1 and 2), one PR.
- [x] Approve the M2 step-by-step plan.
- [x] Approve the green and gold colour scheme plan.
- [x] Implement the green and gold scheme (steps 1 to 3), one PR.
- [x] Implement M2 (subagent, step by step), then open the M2 PR for verification.
- [x] Owner verifies and merges the M2 PR.
- [x] Approve the M3 step-by-step plan.
- [x] Implement M3 PR A, drawdown and solvency (steps 1 to 7), then open it
      for verification.
- [x] Owner verifies and merges M3 PR A.
- [x] Implement M3 PR B, earliest retirement age and the FIRE chart (steps
      8 to 10), then open it for verification.
- [x] Owner verifies and merges M3 PR B.
- [x] Approve the one-page Results plan.
- [x] Implement the one-page Results (steps A and B), then open it for
      verification.
- [x] Owner verifies and merges the one-page Results PR.
- [x] Approve the M4 step-by-step plan.
- [x] Implement M4 (steps 1 to 5), then open the M4 PR for verification.
- [x] Owner verifies and merges the M4 PR.
- [x] Approve the M5 step-by-step plan.
- [ ] Implement M5 PR A, rules as data and salary (steps 1 to 4), then open
      it for verification.
- [ ] Implement M5 PR B, super (steps 5 to 10), then open it for
      verification.
