# Plan

This is the living plan for building the Australian FIRE Planner. It is
written against [`requirements/REQUIREMENTS.md`](requirements/REQUIREMENTS.md)
and the [desktop mockups](requirements/mockups/README.md).

**Current status:** M0, M1 and the colour scheme are done and deployed. M2 plan drafted, awaiting approval.

| Part | Contents | Status |
| --- | --- | --- |
| 1 | Order in which the requirements are delivered | Agreed |
| 2 | Tech stack, architecture and testing approach | Agreed |
| 3 | Milestone plans: how each milestone is delivered, then a step-by-step plan per milestone | M0 and M1 done. M2 plan in review |

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
  its own columns.
- **Rules as data (NFR-3):** from M5, every statutory rate, threshold and cap
  is stored as dated data, not in calculation code.
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
| [M3 · Retirement drawdown and solvency](#m3--retirement-drawdown-and-solvency) | 1 · Must | 8 | 04, 05 chart (a), 06 |
| [M4 · Coast FIRE](#m4--coast-fire) | 1 · Must | 3 | 05 Coast FIRE section |
| [M5 · Superannuation: accumulation](#m5--superannuation-accumulation) | 1 · Must | 8 | 03d (super), 02 (salary) |
| [M6 · Super access and the bridge period](#m6--super-access-and-the-bridge-period) | 1 · Must | 8 | 01 (access age), 05 bridge check and chart (b), Coast FIRE (c) |
| [M7 · Couples](#m7--couples) | 1 · Must | 7 | 01, 02, 03b, 03d per person |
| [M8 · Personal income tax](#m8--personal-income-tax) | 1 · Must | 4 | 06 tax columns, 05 chart (c) |
| [M9 · Investment income and capital gains](#m9--investment-income-and-capital-gains) | 1 · Must | 6 | 03b complete |
| [M10 · Super in retirement](#m10--super-in-retirement) | 1 · Must | 3 | 03d rules panel, 05 milestones |
| [M11 · Super caps and large balances](#m11--super-caps-and-large-balances) | 1 · Must | 2 | 03d cap warnings and Division 296 toggle |
| [M12 · Home: own or rent](#m12--home-own-or-rent) | 1 · Must | 8 | 03a (home details and holding costs), 02 (rent) |
| [M13 · Mortgage](#m13--mortgage) | 1 · Must | 8 | 03a (mortgage and calculated panel) |
| [M14 · Investment property](#m14--investment-property) | 1 · Must — MVP complete | 5 | 03c |
| [M15 · Spending detail](#m15--spending-detail) | 2 · Should | 4 | 02 complete |
| [M16 · Inputs panel and scenarios](#m16--inputs-panel-and-scenarios) | 2 · Should | 2 | 05b, 07 |
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
- **Mockups:** 04, 05 chart (a), 06
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
| 6 | **IN-24** Employer contributions stop at retirement | Must | all |
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
- **Mockups:** 06 tax columns, 05 chart (c)
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
- **Mockups:** 05b, 07
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
| 2 | **IN-25** Concessional carry-forward amounts | Could | all |
| 3 | **SUPER-10** Transition to retirement | Could | all |
| 4 | **SUPER-11** Downsizer contribution | Could | all |

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
| **IN-24** Employer contributions stop at retirement | Must | M5 |
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
| **OUT-4** Key milestones | Must | M2 → M6 → M10 → M13 |
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
 │  UI (React)            screens 01–07 + 05b, one per mockup       │
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
| `StepPage` | Page title, intro, content and Back/Next footer | 01–04, 06, 07 | M0 | every input step |
| `Card`, `Banner` | Grouping and notices: disclaimer, "not yet modelled", hints | all | M1 | every milestone |
| `AssetSidebar` | Asset list grouped by kind, with net worth and investable totals | 03a–03d | M5 | M9, M12–M14, M18 |
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
| `ExplainPanel` | "How was this calculated?" breakdown (NFR-1) | 05, 06 | M1 | every figure; M8 (year detail), M14 (rental cash flow) |
| `DollarsModeToggle` + `formatMoney` | Today's or nominal dollars for every figure (OUT-2) | 05–07 | M2 | every output |
| `ProjectionTable` | Year rows, phase bands, collapsed gaps, shortfall flags, column groups, row detail | 06 | M2 | M3 (shortfalls), M5–M14 (new columns) |
| `TimeSeriesChart` | Lines with reference lines and markers, hover tooltip, click to open the year | 03b, 05, 07 | M3 (FIRE chart a) | M4, M13, M16 |
| `StackedAreaChart` | Stacked balances over time with a shaded period | 05 | M6 (bridge chart b) | M10 |
| `CashFlowChart` | Money in above the axis, money out below, per year | 05 | M8 (FIRE chart c) | M9–M14 |
| `MilestoneTimeline` | Key years on one line (OUT-4) | 05 | M3 | M4, M6, M7, M10, M13 |
| `StatusMeter` | Need vs projected, with MET / SHORT / OVER status | 03d, 05 | M6 (bridge check) | M11 (cap warnings), M16 |
| `ComparisonTable` | Options or scenarios side by side | 05, 07 | M16 (scenarios) | M17 (Coast FIRE choices) |
| `TornadoChart` | One bar per assumption, earlier vs later | 07 | M16 (sensitivity) | none yet |
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
- **M5: `PerPersonFields` and `AssetSidebar` built for many.** M5 still has
  one person, but building these for N people and N assets is what makes
  couples (M7) and more portfolios (M9) an addition rather than a rework.
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

### Colour scheme: Australian flag: done

Delivered in PRs #9 and #10, and merged into M1. Rules every later
stylesheet must follow:

- **Use only the role variables** (`--colour-…`) from
  `src/ui/styles/tokens.css`. Palette variables (`--flag-…`, `--navy-…`) are
  referenced only inside `tokens.css`.
- **Add any new role to `tokens.css`,** and add every new text-on-background
  pair to `src/ui/styles/tokens.test.ts`, which requires at least 4.5:1
  contrast (WCAG AA).
- **Red (`--colour-accent`) is for fills and borders only, never text on
  navy.** Error text uses `--colour-text-error`.
- **The mockups stay greyscale.** They show layout, not visual design.

### M2 · Growth over time: step-by-step plan

**Status:** approved. Implementation in progress, one step at a time.

**Goal:** the plan gains time. The user enters their age, a target
retirement age, inflation, the portfolio's expected return and regular
contributions. The app projects the portfolio year by year, and shows:

- the **year they reach FI**;
- the FI number in nominal dollars at their target retirement age;
- a **year-by-year table**, viewable in today's or nominal dollars.

**Requirements delivered** (from part 1): IN-2 current age, IN-3 target
retirement age (one person), IN-11 inflation, EXP-3 expenses grow with
inflation, IN-15 expected return (total return only), IN-18 regular
contributions, FIRE-1 FI number in nominal dollars at retirement, OUT-1
year-by-year projection (first columns), OUT-2 today's or nominal dollars,
OUT-4 FI number and FI year.

**Out of scope for M2:**
- withdrawals in retirement and running out of money (M3);
- the projection end age, IN-4 (M3). M2 projects to age 100;
- the earliest feasible retirement age (M3) and Coast FIRE (M4);
- charts (M3);
- splitting return into growth and yield (M9);
- remembering the today's/nominal choice between visits. It's a follow-up,
  kept in memory for now.

**Definition of done:**

- Household (step 1) is a real screen: current age and target retirement
  age. The welcome page leads there.
- Assets adds expected return (default 7%), contributions per year (the
  same dollar amount every year, default $0), and the age contributions stop (default: the target
  retirement age). Assumptions adds inflation (default 2.5%).
- With the worked example below, Results shows an FI number of $1,600,000 in
  today's dollars, $2,375,209 nominal at age 50, and **FI reached in 2038, at
  age 46**.
- Year by year shows a row per year, with a working today's/nominal toggle.
- Everything is saved and survives a reload.
- `npm run check` and `npm run test:e2e` pass, and CI is green.

#### Design decisions for M2

**Projection timing**

Row 0 is today. Row *k* is the end of the *k*-th year from now.

```
  row 0 (today)         row 1                  row 2
  age a, balance B0 ──► age a+1                age a+2 ...
                        growth   = B0 × r
                        contrib  = C             (if a+1 ≤ stop age)
                        B1 = B0 + growth + contrib
                        FI number = FI_today × (1+i)^1
```

- `r` is the expected nominal return and `i` is inflation.
- `C` is the yearly contribution, **the same dollar amount every year**.
  It isn't indexed to inflation: entering $10,000 means $10,000 goes in each
  year, which is what people expect when they type a number. In today's
  dollars, later contributions are therefore worth a little less, which
  errs on the conservative side. Contributions that grow (e.g. with salary)
  can come later as a "grows at" option, using the `GrowthRateField`
  planned for salary in M5.
- `FI_today` is M1's FI number.
- **Every value in row *k* uses the same inflation index, `(1+i)^k`.**
  Converting any value in the row to today's dollars divides by that one
  number.
- **Living expenses** in row *k* are `living × (1+i)^k` (EXP-3).
- **Contributions** are added in row *k* only while `a + k ≤ stop age`, so
  the year you turn the stop age is the last one with a contribution.
- **FI is reached** in the first row where the balance is at least that
  row's FI number, which may be row 0. If no row up to age 100 reaches it,
  FI isn't reached.
- **No withdrawals in M2.** Contributions stop, and growth continues to age
  100. Year by year notes that withdrawals arrive in M3.

**New plan fields (internal types).** All are optional, keeping
"only what the user entered":

```ts
interface Person    { id; label; currentAge?: number; targetRetirementAge?: number }  // whole years
interface Portfolio { id; name; value?; expectedReturn?: number;      // fraction, e.g. 0.07
                      annualContribution?: number;                    // dollars per year, not indexed
                      contributionsStopAge?: number }                 // whole years
assumptions: { safeWithdrawalRate?; inflationRate?: number }          // fraction, e.g. 0.025
```

New defaults (`src/plan/defaults.ts`):
- inflation 0.025;
- expected return 0.07;
- annual contribution 0;
- contributions stop at **the target retirement age**. It's a default that
  depends on another input, and is resolved in `resolvePlanInputs`.

Current age and target retirement age have **no default**.

**Two levels of "complete".** M1's figures (FI number and progress in
today's dollars) need only living expenses. The projection also needs the
two ages. So:
- `summarisePlan(plan, startYear)` keeps M1's `complete`/`incomplete`
  result.
- The `complete` variant gains `projection: ProjectionSummary`, which is
  itself `complete` or `incomplete`:

```ts
type ProjectionSummary =
  | { status: "complete"; rows: readonly ProjectionRow[];
      fiReached?: FiMilestone;          // undefined if not reached by age 100
      fiNumberAtRetirement: Explained } // nominal, at the target retirement age (FIRE-1)
  | { status: "incomplete"; missing: readonly MissingInput[] };

interface ProjectionRow {
  yearIndex: number; calendarYear: number; age: number;
  inflationIndex: number;            // (1+i)^yearIndex; today's dollars = value ÷ this
  openingBalance: number; growth: number; contribution: number; closingBalance: number;
  livingExpenses: number; fiNumber: number;                 // all nominal
}
interface FiMilestone { yearIndex: number; calendarYear: number; age: number;
                        explanation: Explained }          // balance vs FI number that year
```

- `MissingInput.field` gains `"currentAge"` and `"targetRetirementAge"`, both
  mapped to step `household`.
- A target retirement age below the current age is reported as missing:
  "Target retirement age must be at or after your current age".
- `startYear` is passed in. The UI gets it from a `Clock` (the current
  calendar year), and the engine still never reads the clock.

**The engine's projection** is a pure function in `src/engine/projection.ts`:
`projectPortfolio(inputs, startYear): ProjectionRow[]`. `summarisePlan`
calls it. `MAX_PROJECTION_AGE = 100` lives in `src/engine/projection.ts`
until IN-4 replaces it in M3.

**Wire format.** Optional fields are added to `PlanDocumentV1`, with no new
`schemaVersion`:
- `people[].currentAgeYears`, `people[].targetRetirementAgeYears`;
- `assumptions.inflationPercent`;
- `portfolios[].expectedReturnPercent`, `annualContributionDollars`,
  `contributionsStopAgeYears`.

Ages are whole numbers between 0 and 120.

**Today's or nominal dollars (OUT-2):**
- A `DollarsModeProvider` in `src/ui/dollarsMode.tsx` holds the mode:
  `"today"` (the default) or `"nominal"`.
- `useMoneyFormatter()` returns `formatMoney(nominalValue, inflationIndex)`.
  It divides by the index in today's mode, then calls `formatDollars`.
- `DollarsModeToggle` is a `SegmentedToggle` labelled "Show values in", with
  the options "Today's dollars" and "Nominal".
- The mode lives in memory only in M2. It's a follow-up to save it in `meta`.

#### Worked examples

These were checked with an independent script, not the app's code. Each
becomes a fixture in `tests/worked-examples/m2-growth.json`.

| | A: headline | B: by hand | C: never FI |
| --- | --- | --- | --- |
| Current age / retirement / stop age | 34 / 50 / 50 | 40 / 41 / 41 | 60 / 60 / 60 |
| Portfolio, return, contribution | $720,000, 7%, $30,000 | $100,000, 10%, $10,000 | $0, 0%, $0 |
| Inflation, living, rate | 2.5%, $64,000, 4% | 0%, $20,000, 5% | 2%, $50,000, 4% |
| Row 1 | growth $50,400.00, contribution $30,000.00, balance $800,400.00 | growth $10,000, contribution $10,000, balance $120,000 | — |
| Row 2 | balance $886,428.00 | growth $12,000, contribution $0, balance $132,000 | — |
| FI reached | row 12: **2038, age 46**, balance $2,158,231.48 vs FI number $2,151,822.12 | not checked | **not reached** |
| FI number at retirement (nominal) | $2,375,208.99 (age 50) | — | — |

The start year is 2026. Example B's row 2 has no contribution, because age 42
is past the stop age of 41.

#### Pinned versions

No new dependencies.

#### Step 1 · Projection engine

- [x] Done

1. Add the new optional fields to `src/plan/types.ts`, and the new defaults
   to `src/plan/defaults.ts`.
2. Extend `resolvePlanInputs` so it also resolves the projection inputs:
   - current age and target retirement age;
   - inflation, expected return, contribution and stop age, with defaults
     and sources. The stop age defaults to the target retirement age.

   Missing ages are reported as above.
3. Add `src/engine/projection.ts` with `projectPortfolio`, following the
   timing rules above exactly. Also add `findFiReached(rows)`, which returns
   the first row whose closing balance (row 0: the opening balance) is at
   least that row's FI number, with an explanation:
   - "Balance at end of {year} (age {age})";
   - "FI number in {year}";
   - "= FI reached".
4. Extend `summarisePlan(plan, startYear)` with `projection`, as above,
   including `fiNumberAtRetirement`: FI_today × (1+i)^(retirement age −
   current age). Its explanation lines are the FI number today, × the
   inflation growth over those years, and = the FI number at that age.
5. Tests:
   - unit tests for each function;
   - fixture `tests/worked-examples/m2-growth.json` with examples A, B and C.
     Extend `tests/unit/workedExamples.test.ts` to check the projection
     figures: rows 1 and 2, the FI row and the FI number at retirement, to
     the cent;
   - property tests:
     - determinism;
     - with zero inflation, today's and nominal values are equal;
     - a higher return never makes FI later;
     - larger contributions never make FI later;
     - every row's balance equals the previous row's balance plus growth
       plus contribution.

**As built:**
- `findFiReached`'s last line is "FI reached" with operator `=` and the
  margin (balance − FI number) as its value, because explanation lines need
  a number. The FI number line uses `−`.
- A target retirement age below the current age makes the projection
  incomplete, with the `MissingInput` label "Target retirement age must be
  at or after your current age".
- The opening balance is the total of all portfolios; return, contribution
  and stop age come from the first portfolio.
- "Inflation growth over N years" is a `fraction` line, so it would display
  as a percentage (132.13%). Step 4 adds a `factor` unit for it (below).

**Check:** `npm run check` passes. Existing callers of `summarisePlan` now
pass a start year. Update `PlanProvider` to pass one (see step 2), so the
app still works.

#### Step 2 · Plan state

- [x] Done

1. Add reducer actions, each with an `undefined` payload clearing the value
   back to its default:
   - `setCurrentAge { personId, age? }`
   - `setTargetRetirementAge { personId, age? }`
   - `setInflationRate { rate? }`
   - `setExpectedReturn { portfolioId, rate? }`
   - `setAnnualContribution { portfolioId, annual? }`
   - `setContributionsStopAge { portfolioId, age? }`
2. `PlanProvider` takes a `startYear` prop, defaulting to the current
   calendar year from a `Clock`, and passes it to `summarisePlan`. `App`
   passes it through, so tests can fix it at 2026.
3. Tests for each action and for the provider's projection summary.

**Check:** `npm run check` passes. The app works as in M1.

#### Step 3 · Wire format

- [x] Done

1. Add the optional wire fields above to `planDocumentV1Schema`. Ages are
   integers from 0 to 120, and percents are non-negative.
2. Extend `planToWire`/`planFromWire`, converting percent ↔ fraction.
3. Tests:
   - extend the round-trip property test to the new fields;
   - `v1-basic.json` still loads, with the new fields unset;
   - a document with the new fields round-trips;
   - out-of-range ages are rejected.

**Check:** `npm run check` passes.

#### Step 4 · Shared pieces: age field and dollars mode

- [ ] Done

1. `AgeField` in `src/ui/components/`: a `NumberField` for whole years. It
   accepts `34`, rejects `34.5` and text, takes `min`/`max`, and supports the
   dashed default. It needs `parseAge` and `formatAge` in `format.ts`.
2. `src/ui/dollarsMode.tsx`: `DollarsModeProvider`, `useDollarsMode()`,
   `useMoneyFormatter()` and `DollarsModeToggle`, as described above. Wrap
   the app in the provider.
3. Add a `factor` unit to `ExplainedUnit` (src/engine/explained.ts),
   displayed as "× 1.3213" (four decimal places) wherever explanations are
   formatted. Use it for the "Inflation growth over N years" line in
   `calculateFiNumberAtRetirement`.
4. Tests:
   - `AgeField` parsing and limits;
   - the `factor` unit's formatting;
   - `formatMoney` in both modes (e.g. $1,640,000 with index 1.025 shows as
     $1,600,000 in today's mode);
   - the toggle switches the mode.

**Check:** `npm run check` passes.

#### Step 5 · Inputs: household, assets, assumptions

- [ ] Done

1. `src/ui/sections/PersonAgesSection.tsx`, a card "About you":
   - `AgeField` "Current age" (min 15, max 99, no default);
   - `AgeField` "Target retirement age" (min 18, max 100, no default).

   Hint: "Only your age is stored, not your date of birth."
2. `HouseholdScreen` replaces the Household placeholder, using that section.
   The welcome page's "Start planning" now goes to `#/household`, the first
   step. Update its tests and `startFresh`.
3. Extend `PortfolioSection` (Assets):
   - `PercentField` "Expected return per year" (default 7%, min 0%, max 15%).
     Hint: "Total return before inflation: growth plus dividends."
   - `MoneyField` "Contributions per year" (default $0, min $0). Hint: "The
     same dollar amount every year, until the age below."
   - `AgeField` "Contributions stop at age" (min 15, max 100). It defaults to
     the target retirement age, shown dashed. If that isn't set, it shows no
     default.
4. Extend `DrawdownSection`, or add `InflationSection` (Assumptions):
   `PercentField` "Inflation per year" (default 2.5%, min 0%, max 15%).
   Hint: "Grows your spending and FI number, and converts results to
   today's dollars."
5. `missingInputSteps.ts`: map `currentAge` and `targetRetirementAge` to
   `household`.
6. Tests for each new field: entering, clearing to default, and limits.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 6 · Results: nominal FI number and FI year

- [ ] Done

1. On Results, when the projection is complete:
   - **FI number tile:** add a second sub-line, "{nominal} at age {retirement
     age} ({year})". Its explanation adds the `fiNumberAtRetirement` lines
     (FIRE-1).
   - **New "FI reached" tile** (OUT-4):
     - value "{year}", sub-line "Age {age}", with the `FiMilestone`
       explanation;
     - if FI isn't reached, the value "Not by age 100" and the sub-line "With
       today's inputs and no withdrawals".
2. When the projection is incomplete, add the missing ages to the existing
   "Enter these" banner. The M1 tiles still show.
3. Update the "Not yet modelled" banner to "withdrawals in retirement and
   when money runs out (M3), super (M5), tax (M8), property (M12) and more."
4. Tests for the complete, not-reached and incomplete-projection cases,
   using worked example A for the values.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 7 · Year by year

- [ ] Done

1. `ProjectionTable` in `src/ui/components/` (part 2's component map),
   generic over column definitions `{ header, cell(row) }`. It renders one row
   per projection row, with a header row and a highlighted FI row.
2. `YearByYearScreen` replaces the placeholder:
   - a `DollarsModeToggle`;
   - a `ProjectionTable` with columns Year, Age, Contributions, Growth,
     Portfolio balance, Living expenses, FI number and Progress, all money
     through `useMoneyFormatter`;
   - rows from today to the later of the target retirement age and the FI
     row (or to the retirement age if FI isn't reached);
   - a `Banner`: "Withdrawals in retirement aren't modelled yet (M3).
     Balances after you stop contributing assume nothing is spent."
   - if the projection is incomplete, the same "Enter these" banner as
     Results.
3. Tests:
   - the table's rows match worked example A in nominal mode, where the
     contributions all read $30,000, and in today's mode, where row 1's
     contribution reads $29,268 ($30,000 ÷ 1.025);
   - the FI row is highlighted.
4. E2E (`tests/e2e/growth.spec.ts`):
   - enter worked example A through the screens;
   - Results shows FI reached in 2038 at age 46;
   - Year by year shows the 2038 row highlighted;
   - switching to today's dollars changes the balances;
   - after a reload, the values are still there.

   The test fixes the start year at 2026. The app reads it from a `Clock`,
   so the E2E test needs a way to set it, e.g. Playwright's `page.clock`
   API. It must not depend on the real date.

**Check:** `npm run check` and `npm run test:e2e` pass. Check by eye that the
table is readable on navy.

#### Follow-ups

- **Remember the today's/nominal choice** in `meta` between visits.
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
- [ ] Implement M2 (subagent, step by step), then open the M2 PR for verification.
