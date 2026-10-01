# Plan

This is the living plan for building the Australian FIRE Planner. It is
written against [`requirements/REQUIREMENTS.md`](requirements/REQUIREMENTS.md)
and the [desktop mockups](requirements/mockups/README.md).

**Current status:** M0 done and deployed. M1 implemented, awaiting the owner's verification.

| Part | Contents | Status |
| --- | --- | --- |
| 1 | Order in which the requirements are delivered | Agreed |
| 2 | Tech stack, architecture and testing approach | Agreed |
| 3 | Milestone plans: how each milestone is delivered, then a step-by-step plan per milestone | M0 done. M1 implemented, in review |

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
  running E2E tests instead (see M0 step 5).

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

### M1 · FI number: step-by-step plan

**Status:** implemented, all eight steps done. Awaiting the owner's verification in the M1 PR.

**Goal:** the first real feature. One person enters their living expenses,
their retirement spending, one share portfolio's value and a safe
withdrawal rate. The Results page then shows their **FI number** and
**progress to FI**, each with a "how was this calculated?" breakdown. The
plan is saved in the browser (IndexedDB) and survives a reload. A first-run
welcome page shows the disclaimer.

**Requirements delivered** (from part 1): NFR-5 disclaimer, NFR-4 data saved
only on this device, EXP-1 living expenses (single total), EXP-2 retirement
spending (amount or % of today), IN-10 safe withdrawal rate, IN-14 one
portfolio's value, FIRE-1 FI number in today's dollars, FIRE-2 progress to
FI, NFR-1 breakdown of the FI number and progress, NFR-2 determinism, NFR-6
worked examples.

**Out of scope for M1:** anything over time (ages, inflation, growth,
contributions and nominal dollars all arrive in M2), several portfolios or
people, super, tax, property, the asset sidebar (M5), the inputs panel
(M16), scenarios (M16), and listing several plans (M16).

**Definition of done:**

- A first-time visitor sees a welcome page with the disclaimer. After
  accepting, they don't see it again on this device.
- On Income & expenses, Assets and Assumptions, the user can enter living
  expenses, retirement spending (as a % of today or a dollar amount), a
  portfolio's value, and a safe withdrawal rate. Unset values with a default
  (retirement spending 100%, rate 4%, portfolio $0) show as dashed "default"
  fields.
- With living expenses of $64,000, retirement spending at the default 100%,
  a portfolio of $720,000 and the default 4%, Results shows an FI number of
  **$1,600,000** and progress of **45%**. Each figure can show its
  breakdown. If living expenses aren't entered, Results says so and links to
  Income & expenses instead of showing a number.
- Reloading the page keeps every input.
- Results states what isn't modelled yet.
- `npm run check` and `npm run test:e2e` pass, and CI is green.

#### Design decisions for M1

These refine part 2 now that the first data is stored.

**Defaults stay unset in the in-memory plan.** Part 2 said defaults are
applied when a saved plan is loaded. To show dashed default fields, the
in-memory `Plan` must know which values the user hasn't set, so instead:

- `Plan` holds **only what the user entered**. Unset values are `undefined`.
- `resolvePlanInputs(plan)` (in `src/plan/`) applies the defaults from
  `src/plan/defaults.ts` and returns the complete inputs the engine needs,
  or a list of what's missing. The engine never sees `undefined` values.
- The UI shows a field as "default" when the plan's value is `undefined`,
  displaying the default value.

This keeps part 2's intent: an improved default still reaches plans that
never overrode it.

**The in-memory plan (internal types)**, `src/plan/types.ts`:

```ts
interface Plan {
  readonly household: { readonly people: readonly Person[] }; // M1: exactly one person
  readonly expenses: {
    readonly livingAnnual?: number;                           // dollars per year, after tax
    readonly retirementSpending?: RetirementSpending;
  };
  readonly assumptions: { readonly safeWithdrawalRate?: number }; // fraction, e.g. 0.04
  readonly portfolios: readonly Portfolio[];                    // M1: exactly one portfolio
}
interface Person { readonly id: string; readonly label: string }  // label e.g. "Person 1"
interface Portfolio { readonly id: string; readonly name: string; readonly value?: number }
type RetirementSpending =
  | { readonly kind: "amount"; readonly annual: number }            // dollars per year
  | { readonly kind: "percentOfToday"; readonly fraction: number }; // e.g. 0.9
```

Defaults (`src/plan/defaults.ts`): safe withdrawal rate 0.04; retirement
spending 100% of today (`{ kind: "percentOfToday", fraction: 1 }`); portfolio
value 0. Living expenses have **no default**: without them there's nothing
to calculate.

**Engine output carries its explanation** (NFR-1), in `src/engine/`:

```ts
interface Explained {
  readonly value: number;
  readonly unit: "dollars" | "fraction";
  readonly lines: readonly ExplanationLine[]; // the breakdown shown by ExplainPanel
}
interface ExplanationLine {
  readonly label: string;   // e.g. "Retirement spending (90% of $60,000)"
  readonly value: number;
  readonly unit: "dollars" | "fraction";
  readonly operator?: "+" | "−" | "×" | "÷" | "="; // how this line combines with the ones above
  readonly source: "input" | "default" | "calculated";
}
type PlanSummary =
  | { readonly status: "complete"; readonly fiNumber: Explained; readonly progressToFi: Explained;
      readonly investable: Explained; readonly retirementSpending: Explained;
      readonly safeWithdrawalRate: number }  // the last two feed the FI number's sub-line
  | { readonly status: "incomplete"; readonly missing: readonly MissingInput[] };
interface MissingInput { readonly field: "livingExpenses" | "retirementSpending"; readonly label: string }
// The engine names the missing field. The UI maps each field to the step where it is entered.
```

`summarisePlan(plan): PlanSummary` is M1's engine entry point. It calls
`resolvePlanInputs`, then the pure functions `retirementSpendingAnnual`,
`calculateFiNumber` and `calculateProgressToFi`. Part 2's `project()`
arrives in M2, when there's a projection over time. The engine imports
nothing from `src/ui/` or `src/persistence/`, and never reads the clock.

**The stored plan (wire types)**, `src/persistence/`. `PlanDocumentV1` is
exactly the Zod schema shown in part 2, with one change: `valueDollars` on
portfolios is optional, matching "store only what the user set". Units are in
the field names: `livingAnnualDollars`, `annualDollars`,
`percent` (e.g. `90`), `safeWithdrawalRatePercent` (e.g. `4`). The mappers
convert percent ↔ fraction. `PlanRecord` and the database schema (`plans` and
`meta` stores, database version 1) are as in part 2. `PlanStore` in M1 has
`loadActivePlan` and `savePlan`, plus `getMeta`/`setMeta` for the disclaimer.
`listPlans` waits for M16.

**IDs and time are injected.** IDs come from an `IdGenerator` (default
`() => crypto.randomUUID()`), and timestamps from a `Clock` (default
`() => new Date()`). Both are passed in rather than called directly, so tests
are deterministic.

**Money display in M1:** `formatDollars(value)` uses
`Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })`,
and `formatPercent(fraction)` shows one decimal place at most (e.g. "45%",
"4.5%"). The today's/nominal-aware `formatMoney` replaces `formatDollars`
in M2.

#### Pinned versions (new in M1)

| Package | Version | Kind |
| --- | --- | --- |
| `zod` | 4.6.5 | dependency |
| `idb` | 8.0.3 | dependency |
| `fake-indexeddb` | 6.2.5 | dev |
| `fast-check` | 4.10.2 | dev |
| `@fast-check/vitest` | 0.5.0 | dev |

#### Step 1 · Plan types and the FI calculations

- [x] Done

1. Add `src/plan/types.ts` (types above), `src/plan/defaults.ts`, and
   `src/plan/resolvePlanInputs.ts`. `resolvePlanInputs` returns either
   `{ status: "complete", inputs }` with every value filled in, or
   `{ status: "incomplete", missing }`. Living expenses are the only input
   that can be missing in M1. They're missing when `undefined`, reported as
   `{ field: "livingExpenses", label: "Living expenses" }`. Resolved values
   carry their source as `Sourced<T> = { value, source: "input" | "default" }`
   (in `src/plan/types.ts`), so explanation lines can say where each value
   came from.
2. Add `src/plan/createNewPlan.ts`: `createNewPlan(generateId)` returns a plan
   with one person labelled "Person 1", one portfolio named "Share
   portfolio", and nothing else set.
3. Add `src/engine/explained.ts` (the `Explained` and `ExplanationLine`
   types) and `src/engine/fiNumber.ts` with:
   - `retirementSpendingAnnual(livingAnnual, retirementSpending): Explained`.
     For an amount, it's the amount. For a percentage, it's
     `livingAnnual × fraction`, with a line showing the multiplication.
   - `calculateFiNumber(retirementSpending: Explained, safeWithdrawalRate, rateSource): Explained`,
     equal to `retirementSpending ÷ safeWithdrawalRate`. It throws a
     `RangeError` if the rate isn't greater than 0 (the UI prevents this).
   - `calculateProgressToFi(investable: Explained, fiNumber: Explained): Explained`,
     equal to `investable ÷ fiNumber` as a fraction. It isn't capped at 100%,
     so 1.25 means 125%.
   - `summarisePlan(plan): PlanSummary`. The investable amount is the
     portfolio's value (the sum over portfolios, ready for M9). If retirement
     spending works out to $0 or less (so the FI number would be $0), it
     returns `incomplete` with
     `{ field: "retirementSpending", label: "Retirement spending must be more than $0" }`
     instead of calculating. The engine never crashes on odd stored data.
   Each explanation line records whether the value came from an input, a
   default or a calculation.
4. Tests (Vitest, next to the code):
   - Worked values: $64,000 ÷ 4% = $1,600,000. 90% of $60,000 = $54,000, so
     an FI number of $1,350,000 at 4%. $720,000 of $1,600,000 = 45%. A
     $0 portfolio gives 0%. $2,000,000 of $1,600,000 = 125%.
   - Living expenses missing → `incomplete`, with the `livingExpenses` field.
   - Defaults used when unset (4%, 100% of today, $0), and their explanation
     lines say `"default"`.
   - A rate ≤ 0 throws.
   - Retirement spending of $0 (living expenses $0 at a percentage, or a $0
     amount) → `incomplete`, with the `retirementSpending` field.
5. Add `tests/worked-examples/`:
   - `README.md` explaining the fixture format: inputs, expected figures to
     the cent, and how each was independently checked;
   - `m1-fi-number.json` with three scenarios: $64,000 with defaults and
     $720,000 invested; 90% of $60,000 with $0 invested; and a $64,000
     amount with $2,000,000 invested. Each has
     `"checkedBy": "hand calculation"` and the arithmetic written out;
   - `tests/unit/workedExamples.test.ts`, which loads every fixture file and
     checks `summarisePlan` against it to the cent.
6. Property-based tests with `@fast-check/vitest` (install `fast-check` and
   `@fast-check/vitest` now):
   - **determinism**: summarising the same plan twice gives deep-equal
     results;
   - doubling retirement spending doubles the FI number;
   - a higher withdrawal rate never gives a higher FI number;
   - progress × FI number equals the investable amount, to the cent.

**Check:** `npm run check` passes. The app is unchanged in the browser, since
nothing uses this code yet.

#### Step 2 · Plan state: reducer and provider

- [x] Done

1. Add `src/plan/planReducer.ts`: a pure `planReducer(plan, action)` with
   these actions:
   - `setLivingExpenses { annual?: number }`
   - `setRetirementSpending { spending?: RetirementSpending }`
   - `setSafeWithdrawalRate { rate?: number }`
   - `setPortfolioValue { portfolioId, value?: number }`
   - `renamePortfolio { portfolioId, name }`
   - `replacePlan { plan }` (used when a saved plan loads)

   Passing `undefined` clears a value back to its default. It returns a new
   plan object and never mutates the old one.
2. Add `src/plan/PlanProvider.tsx`: a React context holding the plan (via
   `useReducer`) and its derived `PlanSummary` (memoised with `useMemo`).
   Hooks: `usePlan()`, `usePlanSummary()`, `usePlanDispatch()`.
   `PlanProvider` takes an optional `initialPlan` prop. It defaults to
   `createNewPlan`.
3. Wrap the app in `PlanProvider` in `App.tsx`. The plan is kept in memory
   only for now. Saving arrives in step 7.
4. Tests: each reducer action, including clearing to default and not mutating
   the input. The provider's hooks give the summary for a dispatched change
   (render a tiny test component).

**Check:** `npm run check` passes. The app still works as in M0.

#### Step 3 · Shared input and output components

- [x] Done

Add the first shared components from part 2's component map, in
`src/ui/components/`, with styles in `app.css` following
`requirements/mockups/src/wireframe.css` (`.card`, `.field`, `.input`,
`.input.default`, `.toggle`, `.metric`, `.banner`):

1. `Card` (a titled box) and `Banner` (a notice, with a `tone` of `"info"` or
   `"warning"`).
2. `src/ui/format.ts`: `formatDollars(value)` and `formatPercent(fraction)`
   as described above, plus `parseDollars(text)` (accepts `60000`,
   `60,000`, `$60,000` and `60000.50`, and returns `undefined` for empty
   text and `NaN` for anything else) and `parsePercent(text)` (accepts `4`,
   `4.5` and `4.5%`, and returns a fraction).
3. `MoneyField` and `PercentField`: a labelled text input. Props: `label`,
   `value?: number` (the plan's value; `undefined` means "not set"),
   `defaultValue?: number`, `onChange(value?: number)`, optional `hint`, and
   optional `min`/`max` (in the field's own unit: dollars, or a fraction for percentages). Behaviour:
   - While typing, keep a local text draft. Commit on blur or Enter.
   - Empty text commits `undefined`. If there's a `defaultValue`, the field
     then shows it in the dashed "default" style, labelled "default".
   - Invalid text, or out-of-range numbers, show an inline error and commit
     nothing.
   - The input has an accessible label, so tests can find it with
     `getByLabelText`.
   As built: both are thin wrappers around a shared `NumberField`, which holds
   the draft, commit and validation logic. Leaving a field without changing
   its text commits nothing, so tabbing through a default doesn't set it.
   Negative numbers are rejected. Later milestones that need negatives
   (e.g. losses) must extend the parsers explicitly.
4. `TextField`: a labelled text input that commits on blur or Enter (used for
   the portfolio name).
5. `SegmentedToggle`: two or three exclusive options shown as the mockups'
   toggle, built with buttons that have `aria-pressed`.
6. `MetricTile`: a label, a large value, a sub-line, and an optional
   "How is this calculated?" button that reveals an `ExplainPanel` beneath it.
7. `ExplainPanel`: renders an `Explained` as the mockups' breakdown table.
   One row per line, with its operator, label and formatted value. Default
   values are marked "(default)", and the result line is bold.
8. Component tests (React Testing Library and user-event) for every
   component: drafts commit on blur and Enter; empty → default style;
   invalid input shows an error and doesn't commit; the toggle's
   `aria-pressed`; the metric tile reveals its explanation; and the parse
   and format functions, including the edge cases above.

**Check:** `npm run check` passes.

#### Step 4 · Input screens: income & expenses, assets, assumptions

- [x] Done

Replace three placeholders with real screens, each built from
**self-contained form sections** (part 2: the M16 inputs panel will reuse
them). A section reads the plan with `usePlan()`, dispatches with
`usePlanDispatch()`, and has no page layout of its own.

1. `src/ui/sections/LivingExpensesSection.tsx` (EXP-1): a card "Living
   expenses today" with a `MoneyField` "Per year, after tax" (minimum $1). Hint: "What
   your household spends in a year, after tax. Leave out mortgage repayments
   and rent: they come later."
2. `src/ui/sections/RetirementSpendingSection.tsx` (EXP-2): a card "Spending
   in retirement" with a `SegmentedToggle` "% of today" / "$ amount", and
   then a `PercentField` (default 100%, min 1%, max 300%) or a `MoneyField`
   (minimum $1) labelled "Retirement spending per year". Every field on a
   page needs a unique label, so screen readers and tests can tell them apart.
   Switching the toggle keeps the equivalent value where possible (e.g. 90%
   of $60,000 becomes $54,000), or clears it if living expenses aren't set.
3. `src/ui/sections/PortfolioSection.tsx` (IN-14, one portfolio): a card
   with a `TextField` "Name" and a `MoneyField` "Current value" (default $0).
4. `src/ui/sections/DrawdownSection.tsx` (IN-10): a card "Drawdown" with a
   `PercentField` "Safe withdrawal rate" (default 4%, min 0.5%, max 10%).
   Hint: "FI number = retirement spending ÷ this rate".
5. Screens in `src/ui/screens/`: `IncomeExpensesScreen` (living expenses and
   retirement spending), `AssetsScreen` (portfolio) and `AssumptionsScreen`
   (drawdown). Each is a `StepPage` with an intro sentence. Route them in
   `App.tsx` in place of their placeholders. The other steps keep their
   placeholders, and "arrives in" for Results stays until step 5.
6. **Fix in `NumberField` (step 3), found while building this step:**
   select the field's text when it gets focus, so typing replaces the shown
   value (including a dashed default) rather than appending to it, e.g.
   "4%3.5". Add a test: focus a field showing its default, type a value, and
   the new value is committed. Also leave a small gap between a
   `SegmentedToggle` and the field below it.
7. Tests: for each section, entering a value dispatches the right action and
   the field shows it; clearing restores the dashed default; the toggle
   conversion works.

**Check:** `npm run check` passes. In `npm run dev`, all three screens take
input, and values survive moving between steps (but not a reload yet).

#### Step 5 · Results: FI number and progress

- [x] Done

1. `src/ui/screens/ResultsScreen.tsx`, using `usePlanSummary()`:
   - **complete:** two `MetricTile`s. "FI number" (FIRE-1): value, then a
     sub-line "{retirement spending}/yr ÷ {rate}", read from the summary's
     `retirementSpending` and `safeWithdrawalRate` (not from explanation line
     positions, which may change). "Progress to FI"
     (FIRE-2): value, then a sub-line "{investable} invested of
     {FI number}". Each has its `ExplainPanel`.
   - **incomplete:** a `Banner` listing what's missing, each item a link to
     the step where it's entered (e.g. "Living expenses → Income & expenses").
     The field-to-step map (`livingExpenses` → `income-expenses`) lives in the
     UI, in `src/ui/screens/missingInputSteps.ts`, so the engine never
     imports UI code. Both `livingExpenses` and `retirementSpending` map to
     `income-expenses`.
   - Always: a `Banner` "Not yet modelled: growth over time and retirement
     age (M2), super (M5), tax (M8), property (M12) and more. These figures
     use today's spending and today's portfolio only." The milestone
     numbers come from `PLAN.md` part 1.
2. Route it in place of the Results placeholder.
3. Tests: complete and incomplete states. The worked values ($1,600,000 and
   45%) appear and the explanation shows its lines. Missing-input links go to
   the right step.
4. Add `tests/e2e/fiNumber.spec.ts`: enter living expenses $64,000,
   retirement spending 100%, portfolio $720,000 and rate 4% (by typing
   into the fields and pressing Tab). Results then shows $1,600,000 and 45%,
   and the FI number's breakdown can be opened.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 6 · Wire format and mappers

- [x] Done

1. Install `zod`. Add `src/persistence/planDocument.ts`: the
   `PlanDocumentV1` Zod schema (as in part 2, with optional `valueDollars`),
   its inferred type, and `CURRENT_SCHEMA_VERSION = 1`.
2. Add `src/persistence/planMapping.ts`:
   - `planToWire(plan): PlanDocumentV1`, which writes only values that are
     set and converts fractions to percent;
   - `planFromWire(document): Plan`, the inverse, which leaves unset values
     `undefined`.
   As built: percent ↔ fraction conversion rounds to 12 significant digits,
   so a stored 4.1% becomes exactly 0.041, without floating-point noise. A
   person stored without a label is labelled "Person N". Unset values are
   omitted from the wire document, not written as `undefined`.
3. Add `src/persistence/migrations.ts`: `parsePlanDocument(unknownJson)`.
   It reads `schemaVersion`, applies migrations up to the current version
   (none yet, but the loop and a version-to-migration map exist),
   validates with Zod, and returns `{ ok: true, document }` or
   `{ ok: false, error }`. It never throws for bad input.
4. Add `tests/fixtures/plan-documents/v1-basic.json`, a complete v1
   document. Keep it forever. Future versions add their own fixture.
5. Tests:
   - round trip `Plan → wire → Plan` gives a deep-equal plan, including
     unset values (property-based, with arbitrary plans from fast-check);
   - percent ↔ fraction conversion (4% ↔ 0.04);
   - the fixture parses;
   - malformed documents are rejected with an error, not a throw: wrong
     types, a missing `schemaVersion`, an unknown future `schemaVersion`.

**Check:** `npm run check` passes.

#### Step 7 · Saving to IndexedDB

- [x] Done

1. Install `idb` and `fake-indexeddb`. Add `src/persistence/database.ts`:
   `openPlannerDatabase()` using `idb`'s `openDB` with a typed `DBSchema`.
   It sets up database `au-fire-planner` version 1, with the `plans` store
   (key `id`, indexes `byUpdatedAt` and `byBaseId`) and the `meta` store
   (key `key`). It handles `versionchange` by closing the connection.
2. Add `src/persistence/planStore.ts`: the `PlanStore` interface and
   `IndexedDbPlanStore` (taking the database, `Clock` and `IdGenerator`):
   - `loadActivePlan()` → `{ status: "none" }` |
     `{ status: "loaded", plan, recordId, updatedAt }` |
     `{ status: "unreadable", recordId, error }`. The active plan's ID is in
     `meta` under `activePlanId`;
   - `savePlan(plan, { recordId?, expectedUpdatedAt? })`. On first save it
     creates a `PlanRecord` (`kind: "base"`, name "My plan") and sets
     `activePlanId`. If the stored `updatedAt` differs from
     `expectedUpdatedAt`, it returns `{ status: "conflict" }` and writes
     nothing. Otherwise it writes in one transaction and returns
     `{ status: "saved", recordId, updatedAt }`;
   - `getMeta(key)` and `setMeta(key, value)`;
   - **never overwrites an unreadable record**: when one is found, the app
     saves new work under a new record ID.
   Also add `InMemoryPlanStore`, which has the same interface. It's used
   when IndexedDB can't be opened, and in component tests.
3. Add `src/persistence/PersistenceProvider.tsx`, inside `PlanProvider`:
   - On start, it opens the store. If that fails, it uses
     `InMemoryPlanStore` and shows a warning `Banner`: "Your browser isn't
     letting this app store data, so your plan won't be kept after you close
     this tab."
   - It loads the active plan. While loading, it shows "Loading your plan…".
     If the plan is loaded, it dispatches `replacePlan`. If it's
     unreadable, it shows a warning `Banner`: "Your saved plan couldn't be
     read. It has been kept unchanged, and your new changes will be saved
     separately."
   - It **autosaves** 500 ms after the last change, through `planToWire`. On
     the first successful save, it calls `navigator.storage.persist?.()`
     once.
   - On `conflict`, it shows a `Banner`: "This plan was changed in another
     tab. Reload to see the latest version." Then it stops autosaving.
4. Tests:
   - `IndexedDbPlanStore` with `fake-indexeddb` (`import "fake-indexeddb/auto"`
     in that test file): save then load gives an equal plan; `none` on an
     empty database; an unreadable record is reported and kept untouched
     after a later save; a conflict is detected when `expectedUpdatedAt` is
     stale;
   - `PersistenceProvider` with `InMemoryPlanStore` and fake timers: one
     save after a burst of edits.
5. E2E (`tests/e2e/persistence.spec.ts`): enter values, wait for the save,
   reload, and the values and FI number are still there. Also add a check to
   every E2E test that the page makes **no requests to any other origin**
   (NFR-4): record `page.on("request")` and assert every URL starts with the
   base URL's origin.

**Check:** `npm run check` and `npm run test:e2e` pass. In `npm run dev`,
values survive a reload.

#### Step 8 · Welcome page and disclaimer

- [x] Done

1. Add `src/ui/screens/WelcomeScreen.tsx` at route `#/welcome`. It's not in
   the step list or the header navigation. It shows:
   - what the app does (two sentences);
   - the disclaimer (NFR-5): "This app gives general information and
     modelling only. It isn't personal financial, tax or legal advice.
     Consider getting advice for your situation.";
   - the privacy note (NFR-4): "Your plan is stored only in this browser on
     this device. Nothing is sent anywhere.";
   - a "Start planning" button. It stores `disclaimerAcceptedAt` (ISO time
     from the `Clock`) in `meta`, then goes to `#/income-expenses`, the first
     step with inputs in M1.
2. On start, if `disclaimerAcceptedAt` isn't set, `PersistenceProvider`
   redirects to `#/welcome`, whatever the URL. The header hides the step
   navigation on `#/welcome`, so a first-time visitor can't skip past the
   disclaimer. "Start planning" is the way in.
3. Add a one-line footer to `AppShell` on every page: "General information
   only, not financial advice. Your data stays on this device."
4. Update the E2E tests. Add a helper, `startFresh(page)`, that opens the
   app, accepts the welcome page and returns. Use it in the existing specs
   so they don't hit the redirect. Add `tests/e2e/welcome.spec.ts`: a first
   visit shows the welcome page and disclaimer; after accepting and
   reloading, it isn't shown again.
5. Unit tests for the redirect, and for `disclaimerAcceptedAt` being stored.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Follow-ups found while building M1

- **Flush on close:** an edit made less than 500 ms before the tab closes
  isn't saved. Add a save on `pagehide`/`visibilitychange` (small; any
  milestone).
- **Write back migrated records:** when the first migration is added
  (`schemaVersion` 2), the load path must write the upgraded record back,
  as part 2 describes.
- **Two tabs on an empty database** can each create a record on first save.
  Resolve alongside multi-plan support and `BroadcastChannel` in M16.

#### After the last step

The lead ticks each step as it's committed, marks M1 done, and opens the
milestone PR. The README needs no new commands in M1. If any step changes
how to run or test the app, it updates the README in that step.

## Next steps

- [x] Part 1: agree the requirement ordering.
- [x] Part 2: agree the tech stack, architecture and testing approach.
- [x] Part 3: approve the M0 step-by-step plan.
- [x] Implement M0 (subagent, step by step).
- [x] Owner verifies and merges the M0 PR.
- [x] Approve the M1 step-by-step plan.
- [x] Implement M1 (subagent, step by step).
- [ ] Owner verifies the M1 PR.
- [ ] Plan M2 in its own PR.
