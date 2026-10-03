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
| [M3 · Retirement drawdown and solvency](#m3--retirement-drawdown-and-solvency) | 1 · Must | 9 | 04, 05 chart (a), 06 |
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
| **OUT-4** Key milestones | Must | M2 → M3 → M6 → M10 → M13 |
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
| `MilestoneTimeline` | Key years on one line (OUT-4) | 05 | M4 | M6, M7, M10, M13 |
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
  `DollarsModeProvider` (in memory, starting on today's dollars).
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

### M3 · Retirement drawdown and solvency: step-by-step plan

**Status:** approved. PR A (steps 1 to 7) in progress, one step at a time.

**Kind:** behavior change.

**Goal:** the projection keeps going after retirement. Each retired year,
the plan's spending is drawn from cash and then the portfolio. The app
shows whether the money lasts to the end of the plan, flags any year it
can't be funded, and finds the earliest age you could retire and still be
solvent.

**Requirements in scope:**
- IN-4 projection end age (one person);
- IN-10 the retirement withdrawal (constant, inflation-adjusted);
- IN-26 cash savings;
- IN-12 the general interest rate, for interest on cash only;
- EXP-6 dated and one-off expenses;
- OUT-3 shortfall flags;
- FIRE-3 the earliest feasible retirement age (one person);
- FIRE-7 chart (a): investable net worth against the FI number over time;
- OUT-4, part: the age money runs out, if it does.

**Out of scope (later milestones):**
- salary and other income (M5), so before retirement, contributions are
  still entered directly;
- super, preservation age and the bridge period (M5, M6);
- tax, and a tax-aware withdrawal order (M8, M20). M3 always draws from cash
  first, then the portfolio;
- a cash buffer, more than one cash account, and interest on offset
  accounts and loans (IN-12's other parts arrive with mortgages in M13);
- temporary changes to inflation and interest (IN-13, M18);
- the milestones timeline (`MilestoneTimeline`, moved to M4, where Coast
  FIRE gives it enough milestones to be worth a component);
- collapsing quiet years and "milestones only" in Year by year;
- remembering the today's/nominal choice between visits. It's still a
  follow-up.

**Two PRs.** The work splits at a point where the app is coherent:
- **PR A, drawdown and solvency (steps 1 to 7).** The money is spent in
  retirement, shortfalls are flagged, and Results says whether the money
  lasts.
- **PR B, earliest retirement age and the FIRE chart (steps 8 to 10).** It
  builds on the solvency check from PR A.

**Definition of done:**

- Household has "Plan until age" (default 95).
- Assets has "Cash savings" (default $0).
- Assumptions has "General interest rate" (default 4%) and states the
  withdrawal rule.
- Income & expenses has a "Dated and one-off expenses" table.
- Year by year runs to the end age, with the following:
  - Working and Retired bands;
  - spending, cash and investable columns;
  - shortfall flags, with a banner listing the years that can't be funded.
- Results shows:
  - whether the money lasts, or the age it runs out;
  - the earliest feasible retirement age;
  - chart (a), with hover values, and markers for the FI year and
    retirement.
- With the worked examples below, the figures match to the cent.
- Everything is saved and survives a reload. Plans saved by M2 still load.
- `npm run check` and `npm run test:e2e` pass, and CI is green.

#### Design decisions for M3

**Projection timing, extended.** M2's rules still hold. Row *k* (age
`a + k`, inflation index `(1+i)^k`) now also has cash and spending:

```
  start of year k                                 end of year k
  cash C0  ──► + interest  = C0 × g  ──────────► cash available
  port P0  ──► + growth    = P0 × r
           ──► + contribution (if age ≤ stop age) ► portfolio available

  spending to fund (nominal) =
      retirement spending × index    (only if age > retirement age)
    + dated expenses for this year × index

  take it from: 1. cash available   2. portfolio available
  anything left over = shortfall for this year (cash and portfolio end at $0)
```

- `g` is the general interest rate. `r` is the portfolio's expected return.
- **Retired years are those with `age > target retirement age`.** M2 makes
  the year you turn the retirement age the last year with a contribution,
  so the first retired row is the year after.
- **The withdrawal in retirement is the year's spending** (IN-10's
  "constant, inflation-adjusted withdrawal"). It is retirement spending in
  today's dollars, grown by inflation. There is no separate "withdrawal
  rate" field. The safe withdrawal rate still sizes the FI number only.
- **Order: cash first, then the portfolio.** This is fixed until the
  withdrawal order arrives (TAX-8, M20).
- **Living expenses before retirement aren't drawn from savings.** They're
  assumed to be paid from salary, as in M2: contributions are what's left
  over.
- **Dated expenses are drawn from savings in any year, including before
  retirement.** Until salary arrives (M5), there is nothing else to pay
  them from. A $40,000 car in 2030 comes out of cash and then the
  portfolio that year, even while working.
- **Dated expenses are in today's dollars and grow with inflation** (EXP-3,
  "all expenses grow with inflation"), like living expenses. That differs
  from contributions, which are flat. Hints on both fields say so.
- **A dated expense applies in rows whose calendar year is from its "From"
  year to its "To" year, inclusive.** A one-off has From = To. Row 0 is
  today and has no flows, so years start next year: the year fields'
  minimum is the start year + 1.
- **Investable net worth = cash + portfolio.** It replaces "the portfolio"
  in progress to FI (M1) and in the FI reached check (M2). Plans without
  cash give the same figures as before.
- **A shortfall year** is any row where spending can't be fully funded. The
  unfunded amount is recorded, and the row is flagged. The projection
  carries on, so later years can be flagged too.
- **The projection runs to the end age** (IN-4, default 95, "Plan until
  age"). It replaces M2's fixed `MAX_PROJECTION_AGE = 100`. If FI isn't
  reached, Results says "Not by age {end age}".
- **Validation**, reported as missing inputs so the projection shows as
  incomplete with a clear message:
  - the end age must be after the current age;
  - the target retirement age must be before the end age.

**Earliest feasible retirement age (FIRE-3).**
- It tries every retirement age from the current age up to the end age, in
  order. It returns the first one whose projection has no shortfall year.
- Everything else stays the same, except that a stop age left at its
  default follows the retirement age being tried. A stop age the user
  entered is kept.
- Retiring later never makes the plan less solvent: it means fewer years of
  withdrawals and, with the default stop age, more contributions. So the
  first solvent age is the earliest. A linear scan runs at most about 80
  short projections, which is instant.
- **If no age works** (for example, a dated expense larger than everything
  you'll ever have), the result is "not feasible by age {end age}".
- **Explanation lines:** the last unsuccessful age and why, then the answer:
  - "Retiring at 42: runs short in 2085 (age 93)", valued at that year's
    shortfall;
  - "Retiring at 43: lasts to age 95", valued at the investable net worth
    at the end;
  - "= Earliest feasible retirement age", valued at 43.

  The last line needs a new explanation unit, `years`, shown as a plain
  whole number.

**New plan fields (internal types).** All are optional, keeping "only what
the user entered":

```ts
household:   { people; projectionEndAge?: number }        // whole years, default 95
cash?:       { balance?: number }                          // dollars today, default $0
assumptions: { ...; interestRate?: number }                // fraction, default 0.04
expenses:    { ...; datedExpenses?: readonly DatedExpense[] }   // default: none

interface DatedExpense {
  id: string;
  name: string;           // e.g. "Replace car"; may be ""
  annual?: number;        // today's dollars per year; unset counts as $0
  fromYear: number;       // calendar year, set when the row is added
  toYear: number;         // ≥ fromYear; equal for a one-off
}
```

- **One cash balance, not a list of accounts.** IN-26 asks only for cash
  savings. A list (mockup 03d) can come later without a schema change,
  because the wire field is optional.
- **A new dated expense row starts as** `{ name: "", fromYear: startYear +
  1, toYear: startYear + 1 }`, so it's always valid. Its amount shows a
  dashed "$0" until typed.

**Wire format** (optional additions to `PlanDocumentV1`, no
`schemaVersion` bump):
- `household.projectionEndAgeYears`;
- `cash.balanceDollars`;
- `assumptions.interestPercent`;
- `expenses.datedExpenses[]`, each `{ id, name, annualDollars?, fromYear,
  toYear }`. Years are integers from 1900 to 2200. The schema checks
  `toYear ≥ fromYear`, and rejects the document otherwise.

**Projection types.** `ProjectionRow` gains:
- `phase: "working" | "retired"`;
- `cashOpening`, `cashInterest`, `cashClosing`;
- `spending` (nominal, to fund this year), `fromCash`, `fromPortfolio` and
  `shortfall`;
- `investableClosing` (cash + portfolio).

M2's `openingBalance`, `growth` and `closingBalance` are renamed
`portfolioOpening`, `portfolioGrowth` and `portfolioClosing` (step 1), so
"balance" is never ambiguous once cash exists.

`ProjectionSummary`'s `complete` variant gains:
- `endAge`;
- `solvency: Solvency`, which is either
  - `{ status: "lasts"; explanation }`, the investable net worth at the end
    age, or
  - `{ status: "runsOut"; year; age; shortfallYears: number[]; explanation }`,
    with the lines "Spending to fund in {year}", "− Cash and portfolio
    available" and "= Shortfall".
- PR B adds `earliestRetirement: { status: "feasible"; age; year;
  explanation } | { status: "notFeasible"; explanation }`.

**The Year by year table.**
- **Columns:** Year, Age, Contributions, Growth & interest, Spending, Cash,
  Portfolio, Investable, FI number, Status.
- **Status** is "✓", or the unfunded amount (for example "−$6,729") in
  error text with a "Shortfall" label, so it never relies on colour alone.
- **Band rows** start each phase: "Working · contributing" and "Retired ·
  spending drawn from cash, then the portfolio".
- **The FI row highlight** stays.
- **Progress and Living expenses columns are dropped.** Progress is on
  Results, and pre-retirement living expenses aren't drawn from savings,
  so showing them in the table would mislead.
- **A shortfall banner** above the table reads "{N} years can't be funded:
  2051 – 2053", with consecutive years shown as ranges.

**Results.**
- **"Money lasts" tile** (OUT-3, OUT-4), with its explanation:
  - "To age 95 ✓", sub-line "{investable} left in {year}"; or
  - "Runs out at age 65", sub-line "2031 · 1 year can't be funded".
- **"Earliest retirement" tile** (PR B):
  - "Age 43", sub-line "{year} · your target is {age} ({year})"; or
  - "Not feasible by age 95".
- **Chart (a)** (PR B): investable net worth and the FI number, by year,
  following the dollars toggle. It has a vertical marker at the FI year and
  at retirement, and a red-pink band on any shortfall years.
  - Hovering shows the year's values.
  - Clicking a year opens Year by year scrolled to that row, which is
    briefly outlined. This uses `#/year-by-year?year=2038`.
- **The "Not yet modelled" banner** becomes "super (M5), the bridge to super
  (M6), tax (M8), property (M12) and more."

**Charts (PR B).**
- **Recharts 3.10.1**, as chosen in part 2, behind one wrapper:
  `TimeSeriesChart` in `src/ui/components/`.
  - It is generic over series `{ key, label, className, dashed? }`, vertical
    markers `{ year, label }` and shaded bands `{ fromYear, toYear, label }`.
  - It owns the tooltip and the click-to-year behaviour.
  - Later charts (M4, M13, M16) reuse it.
- **Colours come from CSS classes on the series, not props.** SVG
  presentation attributes can't read `var(--…)`, so the series get a
  `className`, and `app.css` sets `stroke` from role variables.
- **New roles**, checked at 3:1 against the page background (graphics,
  WCAG 1.4.11):
  - `--colour-chart-primary` (gold) for investable net worth;
  - `--colour-chart-reference` (white, dashed) for the FI number and
    markers;
  - `--colour-chart-band` (error pink, low opacity) for shortfall years.
    The band label is text, so it's checked at 4.5:1.
- **The data for the chart** comes from a pure function,
  `buildFireChartSeries(projection, dollarsMode)` in `src/ui/charts/`. Unit
  tests check it, so the component tests only need a smoke test.
  - jsdom has no layout, so the wrapper takes an explicit `width` and
    `height` in tests.
  - The real page uses Recharts' `ResponsiveContainer`, with a
    `ResizeObserver` stub in the test setup.

#### Worked examples

These were checked with an independent script, not the app's code. Each
becomes a fixture in `tests/worked-examples/m3-drawdown.json`. The start
year is 2026.

**A: headline.** M2's example A, plus cash and an end age.
- **Inputs:**
  - age 34, retire at 50, plan until 95;
  - $720,000 at 7%, with $30,000 a year. The stop age is left at its
    default, so contributions stop at the retirement age being tried;
  - $20,000 cash at 4%;
  - 2.5% inflation, $64,000 living, retirement spending at the default
    100%, and a 4% safe withdrawal rate.
- **Row 1 (2027):** interest $800.00, growth $50,400.00, contribution
  $30,000.00, cash $20,800.00, portfolio $800,400.00.
- **FI reached:** row 12 (2038, age 46). Investable is $2,190,252.13
  against an FI number of $2,151,822.12. Cash adds to the M2 figure, but
  the year doesn't change.
- **Row 17 (2043, age 51), the first retired year:** spending $97,383.57,
  from cash $38,958.01, from the portfolio $58,425.56. Cash ends at $0.00
  and the portfolio at $3,111,127.91.
- **Money lasts:** to age 95 (2087), with $24,101,430.35 investable
  (nominal).
- **Earliest retirement:** age 43. Retiring at 42 runs short in 2085, at
  age 93.

**B: by hand, runs out.**
- **Inputs:** age 60, retire at 60, plan until 65. $100,000 at 10%, no
  contributions. $10,000 cash at 5%. 0% inflation. Living and retirement
  spending $30,000 (as an amount), and a 4% safe withdrawal rate.

  | Year | Age | Interest | Growth | Spending | From cash | From portfolio | Shortfall | Portfolio |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 2027 | 61 | $500 | $10,000 | $30,000 | $10,500 | $19,500 | — | $90,500 |
  | 2028 | 62 | — | $9,050 | $30,000 | — | $30,000 | — | $69,550 |
  | 2029 | 63 | — | $6,955 | $30,000 | — | $30,000 | — | $46,505 |
  | 2030 | 64 | — | $4,650.50 | $30,000 | — | $30,000 | — | $21,155.50 |
  | 2031 | 65 | — | $2,115.55 | $30,000 | — | $23,271.05 | **$6,728.95** | $0 |

- **Results:** FI is not reached. The money runs out at age 65 (2031), and
  only 2031 can't be funded. The earliest retirement age is 61.

**C: dated expenses, before and after retirement.**
- **Inputs:**
  - age 40, retire at 45, plan until 50;
  - $200,000 at 5%, with $20,000 a year, and the stop age left at its
    default;
  - no cash;
  - 2% inflation, $40,000 living, spending 100%, and a 4% safe withdrawal
    rate;
  - dated expenses: "Replace car" $30,000 in 2028 only, and "School fees"
    $10,000 a year from 2029 to 2030.
- **2028 (age 42, working):** spending $31,212.00, all from the portfolio,
  which ends at $230,288.00.
- **2029:** spending $10,612.08, and the portfolio ends at $251,190.32.
- **2032 (age 46, the first retired year):** spending $45,046.50, and the
  portfolio ends at $276,853.88.
- **2036 (age 50, the end):** the portfolio ends at $132,703.89, so the
  money lasts.
- **Earliest retirement:** age 44. Retiring at 43 runs short in 2036, at
  age 50.

#### Pinned versions

PR B adds `recharts` 3.10.1 and its peer `react-is` 19.3.0, matching
React 19.3.0. They are installed with `--save-exact`. PR A adds no
dependencies.

---

**PR A · Drawdown and solvency**

#### Step 1 · Rename the portfolio fields in projection rows

- [x] Done

**Kind:** internal refactor. Behaviour doesn't change.

1. In `ProjectionRow`, rename `openingBalance`, `growth` and
   `closingBalance` to `portfolioOpening`, `portfolioGrowth` and
   `portfolioClosing`.
2. Update every use, the worked-examples test and the M2 fixture's field
   names.

**Check:** `npm run check` and `npm run test:e2e` pass, with no other
changes to tests.

#### Step 2 · Engine: cash, spending, dated expenses and shortfalls

- [ ] Done

1. Add the new optional fields to `src/plan/types.ts` (`DatedExpense`, cash,
   interest rate, end age), and the defaults to `src/plan/defaults.ts`: end
   age 95, interest 0.04, and cash $0.
2. Extend `resolvePlanInputs`:
   - resolve the end age, interest rate, cash balance and dated expenses,
     with defaults and sources. Dated expenses resolve to `annual ?? 0`;
   - add the two validations from the design decisions to the
     projection's missing inputs, with these labels:
     - "Plan until age must be after your current age";
     - "Target retirement age must be before your plan-until age".
3. Extend `projectPortfolio` to follow the timing rules above exactly, and
   remove `MAX_PROJECTION_AGE`. `findFiReached` compares
   `investableClosing`.
4. Add `assessSolvency(rows)` in `src/engine/solvency.ts`, returning
   `Solvency` with its explanation. Add `endAge` and `solvency` to
   `ProjectionSummary`.
5. Change investable (M1's progress to FI) to portfolios + cash. Its
   explanation gains a "Cash savings" line.
6. Tests:
   - unit tests for each function, including:
     - a dated expense before retirement;
     - one spanning retirement;
     - cash exactly covering spending;
     - a shortfall followed by more shortfall years;
   - fixture `tests/worked-examples/m3-drawdown.json` with examples A, B and
     C, checking the rows listed above, FI reached and solvency to the cent.
     Earliest retirement is added in step 8;
   - the M1 and M2 fixtures still pass unchanged;
   - property tests:
     - every row conserves money: opening cash + interest + opening
       portfolio + growth + contribution = closing cash + closing portfolio
       + spending − shortfall;
     - balances are never negative;
     - more cash never creates a shortfall that wasn't there;
     - a later end age never removes a shortfall year that's still in range.

**Check:** `npm run check` passes.

#### Step 3 · Plan state and wire format

- [ ] Done

1. Add reducer actions. An `undefined` value clears back to the default.
   - `setProjectionEndAge { age? }`
   - `setCashBalance { balance? }`
   - `setInterestRate { rate? }`
   - `addDatedExpense { id, startYear }`, using the defaults above
   - `updateDatedExpense { id, changes: Partial<{ name, annual, fromYear,
     toYear }> }`. It keeps `toYear ≥ fromYear` by moving `toYear` up when
     `fromYear` passes it.
   - `duplicateDatedExpense { id, newId }`, inserted after the original
   - `removeDatedExpense { id }`
2. Wire fields as above, through `planToWire`/`planFromWire`.
   - Add the fixture `tests/fixtures/plan-documents/v1-drawdown.json`.
   - `v1-basic.json` and `v1-growth.json` must still load unchanged.
3. Tests:
   - each action;
   - the round-trip property test generates the new fields, including empty
     and several dated expenses;
   - the schema rejects `toYear < fromYear` and non-integer years.

**Check:** `npm run check` passes. The app works as in M2.

#### Step 4 · Shared pieces: `YearField` and `EditableTable`

- [ ] Done

1. `YearField` in `src/ui/components/`: a `NumberField` for whole calendar
   years, with `min`/`max`. It needs `parseYear` in `format.ts`, and is
   formatted without a thousands separator ("2030", not "2,030").
2. `EditableTable` in `src/ui/components/`, generic over rows and column
   definitions `{ header, cell(row), editor?(row, commit, cancel) }`.
   - **Display:** a cell with an editor shows its value as a button.
     Clicking the button, or pressing Enter on it, swaps in the editor (a
     field). Enter or blur commits the edit, and Escape cancels it. Focus
     returns to the cell.
   - **Row menu:** each row has a "⋯" button labelled "Actions for {row
     name}", opening a small menu with Duplicate and Delete. Escape closes
     it.
   - **Adding rows:** an "+ Add {noun}" button under the table. The new
     row's first editable cell opens for editing.
   - **When the table is empty,** it shows one line of text, passed in.
   - **Keyboard and screen readers:** everything works without a mouse.
     Cells have accessible names such as "Amount for Replace car".
3. Tests:
   - `YearField` parsing and limits;
   - `EditableTable`:
     - editing commits on Enter and on blur;
     - Escape cancels;
     - Duplicate and Delete;
     - adding a row opens its first cell;
     - keyboard-only use.

**Check:** `npm run check` passes.

#### Step 5 · Inputs: end age, cash, interest, withdrawal rule, dated expenses

- [ ] Done

1. **Household:** add `AgeField` "Plan until age" (default 95, min 50,
   max 110). Hint: "The projection runs to this age."
2. **Assets:** add a `CashSection` card "Cash" with `MoneyField` "Cash
   savings" (default $0, min $0). Hint: "Earns the general interest rate
   (Assumptions). Spent before the portfolio in retirement."
3. **Assumptions:**
   - In the Inflation card, rename the card "Economy" and add
     `PercentField` "General interest rate" (default 4%, min 0%, max 15%).
     Hint: "Paid on cash savings."
   - In the drawdown card, add a read-only line: "Withdrawal in retirement:
     constant, inflation-adjusted. Each year's spending is drawn from cash
     first, then the portfolio." Other strategies are in the backlog
     (BL-1).
4. **Income & expenses:** add a `DatedExpensesSection` card "Dated and
   one-off expenses", using `EditableTable`.
   - **Columns:** Expense (text), Per year (money, "today's dollars"), From
     (year), To (year, shown as "(once)" when equal to From).
   - **Year limits:** From and To accept the start year + 1 up to the year
     you reach the plan-until age. "+ Add expense" adds a row.
   - **Hint:** "In today's dollars, grown with inflation. Paid from cash and
     then the portfolio in those years, even before you retire."
5. `missingInputSteps.ts`: map the new validation messages to `household`.
6. Tests for each new field and section: entering, clearing to default,
   limits, and the table's add, edit, duplicate and delete.
7. Add Household's new field and the dated expenses table to the contrast
   sweep (`tests/e2e/contrast.spec.ts`). Valid and invalid passes cover the
   table with one row.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 6 · Year by year: drawdown, phases and shortfalls

- [ ] Done

1. Replace the table's columns with the M3 set above, all money through
   `useMoneyFormatter`. Rows now run from today to the end age.
2. Extend `ProjectionTable` with band rows between phases. Each is a full-
   width row with the phase text, so a screen reader reads it in order.
3. Status cells: "✓", or "Shortfall −$6,729" in error text.
4. A shortfall `Banner` above the table, with year ranges. The "No
   withdrawals" banner is removed.
5. **Scroll to a year:** if the URL has `?year=`, the matching row is
   scrolled into view and outlined for a few seconds. PR B uses this, but it
   is built here with the table.
6. Tests:
   - example B's five rows and the 2031 shortfall flag, in nominal mode;
   - example C's 2028 row (a dated expense while working);
   - the band rows;
   - the banner text for a range and for a single year;
   - `?year=` highlights the row.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 7 · Results: does the money last? (end of PR A)

- [ ] Done

1. Add the "Money lasts" tile, with its explanation, as described above.
2. When the projection runs out, show a `Banner` on Results linking to Year
   by year: "Your money runs out at age {age} ({year}). See the years that
   can't be funded."
3. Update the "Not yet modelled" banner, and change "Not by age 100" to use
   the end age.
4. Tests for both solvency outcomes, using examples A and B.
5. E2E (`tests/e2e/drawdown.spec.ts`):
   - enter example B through the screens, with the clock fixed in 2026;
   - Results shows "Runs out at age 65";
   - Year by year flags 2031 and shows the banner;
   - add a dated expense in Income & expenses, and check Year by year's
     spending changes for that year;
   - after a reload, the cash, end age and dated expense are still there.

**Check:** `npm run check` and `npm run test:e2e` pass. **Open PR A** for
the owner to verify.

---

**PR B · Earliest retirement age and the FIRE chart**

#### Step 8 · Engine: earliest feasible retirement age

- [ ] Done

1. Add `findEarliestRetirementAge(inputs, startYear)` in
   `src/engine/earliestRetirement.ts`, following the design decisions above.
   It reuses `projectPortfolio` and `assessSolvency`, without copying their
   rules.
2. Add the `years` explanation unit, and its formatting in `ExplainPanel`
   (a plain whole number).
3. Add `earliestRetirement` to `ProjectionSummary`.
4. Tests:
   - examples A (43), B (61) and C (44) in the fixture;
   - "retire now" (feasible at the current age);
   - not feasible at all;
   - an explicit stop age is kept;
   - a property test: the plan is solvent at the returned age, and not
     solvent at the age before it, unless that is below the current age.

**Check:** `npm run check` passes.

#### Step 9 · Results: earliest retirement tile

- [ ] Done

1. Add the "Earliest retirement" tile, with its explanation, as described
   above. It sits after "FI reached".
2. Tests for the feasible and not-feasible cases, using examples A and B.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 10 · FIRE chart (a) (end of PR B)

- [ ] Done

1. Install `recharts` 3.10.1 and `react-is` 19.3.0 with `--save-exact`.
   Add a `ResizeObserver` stub to the Vitest setup.
2. Add `TimeSeriesChart` in `src/ui/components/`, as described above.
   - It has an accessible name, and a visually hidden table of the same
     data, so the figures aren't only in the picture.
   - Hover shows a tooltip with the year, age and each series' value.
   - Clicking a year calls `onSelectYear(year)`.
3. Add `buildFireChartSeries` in `src/ui/charts/fireChart.ts`, which builds
   the chart's data. It covers:
   - investable net worth and the FI number for each year, in the current
     dollars mode;
   - the FI year and retirement markers;
   - shortfall bands.
4. Add a `FireChartSection` card on Results, below the tiles: "Investable
   net worth vs FI number". Clicking a year goes to
   `#/year-by-year?year={year}`.
5. Add the chart roles to `tokens.css`. Add the graphics pairs (3:1) and the
   band-label pair (4.5:1) to `tokens.test.ts`. Add the Results page with
   data to the contrast sweep.
6. Tests:
   - `buildFireChartSeries` for examples A and B, in both modes;
   - a smoke test that `TimeSeriesChart` renders its series, markers and
     hidden table.
7. E2E (`tests/e2e/fireChart.spec.ts`):
   - enter example A;
   - Results shows "Earliest retirement: Age 43";
   - hovering the chart shows a tooltip with a year and two dollar values;
   - clicking a year opens Year by year with that row outlined.

**Check:** `npm run check` and `npm run test:e2e` pass. Check by eye that
the chart reads clearly on the deep green page. **Open PR B** for the owner
to verify.

#### Follow-ups

- **Remember the today's/nominal choice** in `meta` between visits (from
  M2).
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
- [ ] Implement M3 PR A, drawdown and solvency (steps 1 to 7), then open it
      for verification.
- [ ] Implement M3 PR B, earliest retirement age and the FIRE chart (steps
      8 to 10), then open it for verification.
