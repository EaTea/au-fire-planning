# Plan

This is the living plan for building the Australian FIRE Planner. It is
written against [`requirements/REQUIREMENTS.md`](requirements/REQUIREMENTS.md)
and the [desktop mockups](requirements/mockups/README.md).

**Current status:** M0 to M3 and the colour scheme are done. The one-page Results plan is approved, not yet implemented. M4 plan drafted, awaiting approval.

| Part | Contents | Status |
| --- | --- | --- |
| 1 | Order in which the requirements are delivered | Agreed |
| 2 | Tech stack, architecture and testing approach | Agreed |
| 3 | Milestone plans: how each milestone is delivered, then a step-by-step plan per milestone | M0–M3 done. One-page Results approved. M4 plan in review |

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

### Results and Year by year on one page: step-by-step plan

**Status:** approved (merged in PR #20). Not yet implemented. It comes
before M4, which builds on the one-page layout.

**Kind:** behavior change. It changes what the user sees and where, not
any figure.

**Why:** Results and Year by year answer one question, "does my plan
work?", at two levels of detail. As separate steps, the user flips
between tabs to see the years behind a headline number, and since M3 the
chart, the "runs out" banner and the shortfall banner send them across to
the other tab. OUT-1 now says the projection is shown on the same page as
the results, below the headline figures and charts, and mockup 05 shows
the combined page (mockup 06 Projection is gone, and Scenarios is now 06).

**Goal:** one Results step: the tiles and chart first, then the Year by
year table, with one dollars toggle for the whole page. The app has six
steps instead of seven.

**The page, top to bottom:**

```
  ┌ Results ─────────────────────────────── [Nominal | Today's $] ┐
  │ intro                                                          │
  │ On this page: Headline numbers · FIRE chart · Year by year ↓   │
  ├────────────────────────────────────────────────────────────────┤
  │ [missing inputs banner, only if the plan is incomplete]        │
  │ FI number · Progress · FI reached · Earliest retirement ·      │
  │ Money lasts tiles                                              │
  │ [runs-out banner, links down to the first shortfall row]       │
  │ FIRE chart (a): click a year to jump to its row below          │
  │ "Not yet modelled" banner                                      │
  ├─ Year by year ─────────────────────────────────────────────────┤
  │ one line on what the table shows                               │
  │ [shortfall banner with the year ranges]                        │
  │ Year | Age | ... table (the M3 columns, bands, FI row, status) │
  ├────────────────────────────────────────────────────────────────┤
  │ ← Assumptions                                    Scenarios →   │
  └────────────────────────────────────────────────────────────────┘
```

Later milestones slot their sections (milestones, more charts, Coast
FIRE) between the chart and Year by year, as mockup 05 shows, and add
them to the "On this page" links.

**Design decisions:**

- **One step, one route.** `steps.ts` loses `year-by-year`, and Scenarios
  becomes step 6. The header, the Back/Next footer and the placeholders
  all follow from that list, so Results' Next becomes "Scenarios".
- **Scrolling within the page.** `#/results?year=2038` scrolls to that
  row and outlines it briefly, using the M3 logic that
  `YearByYearScreen` has today. `#/results?view=year-by-year` scrolls to
  the section heading.
- **Old links still work.** `#/year-by-year?year=2038` redirects to
  `#/results?year=2038`, and a bare `#/year-by-year` to
  `#/results?view=year-by-year`.
- **Links that crossed tabs now stay on the page.** The chart's click
  goes to `#/results?year={year}`. The runs-out banner's link goes to the
  first shortfall year's row.
- **The dollars toggle moves to the Results page header** and covers the
  tiles, the chart and the table. Figures that are nominal by definition
  (the FI number at retirement) still say so and don't follow it.
- **The table becomes a section, not a screen.** `YearByYearScreen`
  becomes `YearByYearSection` in `src/ui/screens/`. It keeps its columns,
  bands, FI row highlight, status cells and shortfall banner, and gains an
  `<h2>` heading with `id="year-by-year"` for the in-page link.
- **One "Enter these" banner per page.** If the plan is incomplete, the
  `MissingInputsBanner` at the top already lists what's missing, so the
  Year by year section isn't shown until the projection is complete.
- **"On this page" links** are plain in-page links, worth having now
  because every later milestone makes the page longer.
- **Styles:** the table keeps its `app.css` rules. The new heading and the
  links use existing role variables, so no new colour pairs are needed. The
  contrast sweep's Year by year passes move onto Results.
- **Not changed:** the engine, the plan state, the wire format and saved
  plans. No new dependencies.

**One PR.** Two steps, each leaving the app working.

**Definition of done:**

- The header shows six steps, ending "5 Results" and "6 Scenarios".
- Results shows the tiles, the chart and then the Year by year table, with
  one dollars toggle at the top that changes all of them.
- Clicking a year in the chart scrolls to its row on the same page.
- Old `#/year-by-year` links land on Results, at the table or the row.
- The README describes the six steps.
- `npm run check` and `npm run test:e2e` pass, and CI is green.

#### Step A · Year by year as a section of Results

- [ ] Done

1. Turn `YearByYearScreen` into `YearByYearSection`: same table, bands,
   status cells, shortfall banner and `?year=` scrolling, but no
   `StepPage`, no toggle and no missing-inputs banner of its own. It
   renders nothing while the projection is incomplete.
2. On `ResultsScreen`:
   - put the `DollarsModeToggle` in the page header, beside the title;
   - add the "On this page" links;
   - render `YearByYearSection` after the "Not yet modelled" banner;
   - point the chart's click and the runs-out banner's link at
     `#/results?year={year}`.
3. Leave the Year by year step in place for now, so this step changes
   nothing else. It will briefly show the table in two places; step B
   removes the old one.
4. Tests:
   - move the table tests from `YearByYearScreen.test.tsx` into a
     `YearByYearSection.test.tsx`;
   - in `ResultsScreen.test.tsx`: the table appears after the chart with a
     complete plan; it is absent, and the banner appears once, with an
     incomplete projection; switching the toggle on Results changes a
     table cell;
   - update the E2E specs that followed "Next: Year by year" or clicked a
     chart year (`growth`, `drawdown`, `fireChart`) to check the table on
     Results instead.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step B · Remove the Year by year step (end of PR)

- [ ] Done

1. Remove `year-by-year` from `steps.ts`, and its entry in `App`'s screen
   map. Scenarios becomes step 6.
2. Add the `/year-by-year` redirects described above. On Results,
   `?view=year-by-year` scrolls the section's heading into view once the
   page has rendered.
3. Update the doc comments that mention the Year by year screen
   (`MissingInputsBanner`, `ProjectionTable`, `dollarsMode`) and the
   README's list of steps.
4. Tests:
   - `steps.test.ts` and `StepPage.test.tsx` for six steps, with Results'
     Next being Scenarios;
   - `tests/e2e/navigation.spec.ts` for six steps;
   - `tests/e2e/contrast.spec.ts` visits Results with a complete plan, in
     both dollar modes, instead of `#/year-by-year`;
   - E2E: `#/year-by-year` lands on Results with the Year by year heading
     in view, and `#/year-by-year?year=2038` with that row outlined.

**Check:** `npm run check` and `npm run test:e2e` pass. **Open the PR**
for the owner to verify.

### M4 · Coast FIRE: step-by-step plan

**Status:** draft, revised after review (cash grows at its own rate while
coasting). Awaiting the owner's approval. Do not implement yet.

**Kind:** behavior change.

**Goal:** answer "when could I stop contributing?". Coast FIRE is the point
where what you've already saved, left to grow with no further
contributions, would reach your FI number by your target retirement age.
From then on, contributions are optional. Results shows:
- the Coast FIRE number;
- whether you've reached it, and if not, when you will on your current
  contributions;
- a chart of how that plays out;
- a milestones timeline with the key years so far.

**Requirements in scope:**
- COAST-1 the Coast FIRE number, in today's dollars and in the dollars of
  the retirement year;
- COAST-2 whether Coast FIRE is reached, and when;
- COAST-6 charts (a) and (b): savings growing with no further
  contributions against the FI number, the Coast FIRE number over time,
  and the point it's reached;
- OUT-4, part: the Coast FIRE year, shown with the FI year, retirement and
  "money lasts" on a milestones timeline (`MilestoneTimeline`, moved here
  from M3).

**Out of scope (later milestones):**
- Coast FIRE separately for super and outside super (COAST-3, chart (c)),
  in M6, once super exists;
- the minimum income needed while coasting (COAST-4), and comparing
  "keep, reduce or stop contributing" (COAST-7), in M17;
- employer contributions continuing while coasting (COAST-5), in M5 and M17.

**One PR**, five steps. It's smaller than M3, and each step leaves the app
working.

**Builds on the one-page Results page.** M4 is implemented after the
one-page Results plan above. Everything M4 adds is a section of that page:
- **Order:** the tiles, the milestones, chart (a), the Coast FIRE chart,
  then Year by year.
- **Dollars:** the page's single dollars toggle covers it all.
- **Navigation:** chart clicks jump to rows on the same page.
- **"On this page" links:** each new section adds one.

**Definition of done:**

- Results has a **Coast FIRE** tile. For worked example A it shows:
  - $811,877 today, and $1,205,235 in 2042 dollars;
  - "Reached in 2029, at age 37", with a breakdown.
- Results has a **When could you stop contributing?** chart. It runs from
  today to the target retirement year and has four lines:
  - your savings on your current contributions;
  - today's savings with no further contributions;
  - the Coast FIRE number;
  - the FI number.

  It marks the Coast FIRE year and retirement, and follows the
  today's/nominal toggle.
- Results has a **Milestones** card: Coast FIRE, FI reached, retirement,
  and whether the money lasts, in year order.
- With the worked examples below, the figures match to the cent.
- `npm run check` and `npm run test:e2e` pass, and CI is green.

#### Design decisions for M4

**Each asset grows at its own rate while coasting.** Cash earns the
general interest rate (`g`). The portfolio earns its expected return
(`r`). Nothing assumes one rate for all savings (see "Applies to every
milestone").

**Why only the portfolio needs solving.** Contributions go only into the
portfolio (M2), and dated expenses are paid from cash first (M3). So cash
follows the same path whether you keep contributing or stop. Only the
portfolio's part changes, and it has a closed form.

**The Coast FIRE number over time.** Let row *k* be a year up to the target
retirement year (row *n*, where `n = retirement age − current age`). From
row *k*, with no more contributions:

```
  cash:      starts at cash(k), grows at g, pays dated expenses first.
             At row n it has cashLeft(k). Any dated expense it can't pay
             in full "spills" to the portfolio: spill(j) in row j.

                       FI number at retirement (nominal)
                     − cashLeft(k)
                     + Σ spill(j) × (1 + r)^(n − j)     for j = k+1 … n
  portfolioNeeded(k) = ─────────────────────────────────────────────── , and at least 0
                                  (1 + r)^(n − k)

  coast(k) = cash(k) + portfolioNeeded(k)
```

- `cash(k)` is the cash on your current path in row *k* (the M3
  projection's `cashClosing`). `coast(k)` is nominal, in year *k*'s
  dollars. In today's dollars, divide by that row's inflation index, as
  everywhere else.
- **The Coast FIRE number** (COAST-1) is `coast(0)`: your cash today plus
  the portfolio you'd need today. Row 0 is today, so its nominal and
  today's values are the same.
- **"In 2042 dollars"** (COAST-1's nominal figure, as in mockup 05) is
  `coast(0) × (1+i)^n`: the same amount expressed in the retirement year's
  dollars.
- **At retirement,** `coast(n)` is at least the FI number. It is exactly
  the FI number unless cash alone already exceeds it.
- **Dated expenses before retirement count.** Since M3 they come out of
  savings, so money set aside to coast has to cover them too. A $100,000
  car in 2030 raises the Coast FIRE number. Dated expenses after
  retirement are already part of whether the money lasts, so they aren't
  added here.
- **If cash alone reaches the FI number,** `portfolioNeeded` is 0 and the
  Coast FIRE number is just your cash.

**Coast FIRE reached** (COAST-2) is the first row *k* from 0 to *n* where
investable net worth on your current path (`investableClosing`) is at
least `coast(k)`.
- The cash parts are identical, so this is the same as the portfolio
  being at least `portfolioNeeded(k)`. That in turn means exactly: **if you
  stopped contributing after year k, you would still reach the FI number by
  retirement.** A property test checks this against the real projection
  with contributions stopped.
- **Row 0** means you've already reached it.
- **If no row up to retirement reaches it,** it's "Not before retirement
  at {age}".
- **Explanation lines** (like FI reached):
  - "Investable at end of {year} (age {age})";
  - "− Coast FIRE number in {year}";
  - "= Coast FIRE reached", valued at the margin.

**Checked against the real projection.** In each example, stopping
contributions in the year Coast FIRE is reached still reaches FI.
Stopping a year earlier doesn't:
- **A:** stopping at 37 gives $2,395,439.84, and at 36 gives
  $2,323,144.49, against $2,375,208.99.
- **B:** stopping at 46 gives $502,025.62, and at 45 gives $487,384.62,
  against $500,000.
- **C:** stopping at 41 gives $2,406,954.94, and at 40 gives
  $2,351,801.17, against $2,375,208.99.

**Today's savings with no further contributions** (chart (a)) is the M3
projection run with contributions switched off: `projectPortfolio` with a
contribution of $0, up to retirement. Cash and portfolio grow at their own
rates, and dated expenses are paid. It reaches the FI number at retirement
exactly when Coast FIRE is already reached today, so the chart and the tile
agree.

**Engine shape.** `src/engine/coastFire.ts`:

```ts
interface CoastFire {
  number: Explained;                     // coast(0), today's dollars, with its breakdown
  numberInRetirementYearDollars: number; // coast(0) × (1+i)^n
  path: readonly CoastPathPoint[];       // rows 0..n
  reached?: CoastMilestone;              // undefined: not before retirement
}
interface CoastPathPoint {
  yearIndex; calendarYear; age; inflationIndex;
  coastNumber: number;                   // coast(k) = cash(k) + portfolioNeeded(k), nominal
  portfolioNeeded: number;               // nominal
  investable: number;                    // current path, nominal
  withoutContributions: number;          // today's savings, no contributions, nominal
  fiNumber: number;                      // nominal
}
interface CoastMilestone { yearIndex; calendarYear; age; explanation: Explained }
```

- **`calculateCoastFire(rows, inputs)`** takes the M3 projection rows plus
  the return, the interest rate, the retirement row and the dated
  expenses. The "without contributions" path calls `projectPortfolio`
  with a $0 contribution. Everything else is worked out from the rows, so
  it never copies the projection's rules.
- **`ProjectionSummary`'s `complete` variant gains `coast: CoastFire`.**
  Coast FIRE needs the ages, so it lives with the projection.
- **Retirement age equal to the current age:** `n = 0`, so the Coast FIRE
  number is today's cash plus whatever the portfolio must add to reach the
  FI number now. It is reached only if FI is.

**The Coast FIRE number's breakdown,** for example A:
- "FI number at age 50 (2042)": $2,375,208.99;
- "− Your cash, growing at 4% to 2042": $37,459.62. With dated expenses, it
  reads "after paying the dated expenses it can";
- "+ Dated expenses the portfolio would pay, grown to 2042": shown only
  when there are any;
- "÷ Portfolio growth at 7% over 16 years", as a `factor`: 2.9522;
- "= Portfolio needed today": $791,876.59;
- "+ Your cash today": $20,000.00;
- "= Coast FIRE number": $811,876.59.

**The Coast FIRE tile** (Results, after "FI number" and "Progress to FI",
as in mockup 05):
- **Value:** the Coast FIRE number in today's dollars. It is a figure for
  today (row 0), so it reads the same whichever way the page's dollars
  toggle is set.
- **Sub-lines:**
  - "{amount} in {retirement year} dollars";
  - then one of: "Reached: contributions are now optional", "Reached in
    {year}, at age {age}", or "Not before retirement at {age}".
- **Explanation:** the number's lines, then the reached lines (or, if not
  reached, the retirement-year row: investable against the Coast FIRE
  number).

**The Coast FIRE chart** ("When could you stop contributing?", mockup 05,
COAST-6 (a) and (b)):
- **Years:** today to the target retirement year. After that, coasting no
  longer means anything.
- **Lines**, distinguished by style as well as colour:
  - "Your savings, current contributions": gold, solid;
  - "Today's savings, no more contributions": muted green-white, solid;
  - "Coast FIRE number": white, dashed;
  - "FI number": white, dotted.
- **Markers:** "Coast FIRE" (if reached before retirement) and
  "Retirement".
- **Caption under the chart:** "With no more contributions from today,
  your savings reach {amount} by {year}, against an FI number of
  {amount}". It's in nominal dollars, and says so.
- **Mode:** the chart follows the Results page's dollars toggle, like
  everything else on the page. It has no toggle of its own.
- **Interaction:** clicking a year jumps to that year's row in the Year by
  year section (`#/results?year={year}`), as chart (a) does.
- **Changes to the wrapper:**
  - `TimeSeriesChart`'s `dashed?: boolean` becomes
    `strokeStyle?: "solid" | "dashed" | "dotted"`. Chart (a) keeps its look:
    its FI number line becomes `dashed`.
  - Add the new role `--colour-chart-secondary` (muted green-white), with a
    graphics pair at 3:1.

**The Milestones card** (`MilestoneTimeline`, OUT-4):
- It is generic over items `{ year?, label, detail?, status: "reached" |
  "projected" | "notReached" }`.
- **Rendering:** one horizontal line, with dated items in year order.
  Undated items ("not before …") come last, in words.
- **Accessibility:** it is an ordered list in the DOM, so a screen reader
  reads it as a list.
- **M4's items:**
  - Coast FIRE;
  - FI reached;
  - retirement (the target);
  - "Money lasts to {age}" or "Money runs out at {age}".
- **Later milestones add their own items:** super access (M6), the mortgage
  paid off (M13) and so on.
- **Placement:** below the tiles, above the charts, as in mockup 05. It
  gets a "Milestones" entry in the page's "On this page" links.

#### Worked examples

These were checked with an independent script, not the app's code. Each
becomes a fixture in `tests/worked-examples/m4-coast.json`. The start year
is 2026.

| | Inputs | Coast FIRE number (today) | In retirement-year dollars | Reached |
| --- | --- | --- | --- | --- |
| **A: headline** | M3's example A (age 34, retire 50, $720,000 at 7% + $30,000/yr, $20,000 cash at 4%, 2.5% inflation, $64,000, 4%) | $811,876.59 ($20,000 cash + $791,876.59 portfolio) | $1,205,235.36 (2042) | **2029, age 37**: investable $1,000,975.24 vs $992,580.16 |
| **B: by hand** | Age 40, retire 50, $150,000 at 10% + $10,000/yr, no cash, 0% inflation, $20,000, 4% | $192,771.64 (= $500,000 ÷ 1.1¹⁰) | $192,771.64 (2036) | **2032, age 46**: $342,890.25 vs $341,506.73 |
| **C: dated expense** | A, plus a $100,000 one-off in 2030 | $890,925.23 | $1,322,583.51 (2042) | **2033, age 41**: $1,309,224.01 vs $1,291,956.32 |
| **D: already coasting** | Age 45, retire 60, $1,000,000 at 7%, no contributions, 2.5%, $50,000, 4% | $656,162.38 | $950,318.77 (2041) | **already** (2026, age 45) |
| **E: never** | Age 30, retire 40, $10,000 at 5% + $1,000/yr, 3% inflation, $80,000, 4% | $1,650,096.15 | $2,217,591.25 (2036) | **not before retirement at 40** |
| **F: lots of cash** | Age 40, retire 55, $300,000 at 7% + $20,000/yr, $300,000 cash at 3%, 2.5% inflation, $50,000, 4% | $786,758.66 ($300,000 cash + $486,758.66 portfolio) | $1,139,461.12 (2041) | **not before retirement at 55** |

Example F is why cash has its own rate. Treating its cash as earning 7%
would have given $656,162.38, understating what's needed by about
$130,000.

Example B's rows, for checking by hand:

| Year | Age | Investable | Coast FIRE number |
| --- | --- | --- | --- |
| 2026 | 40 | $150,000.00 | $192,771.64 |
| 2027 | 41 | $175,000.00 | $212,048.81 |
| 2028 | 42 | $202,500.00 | $233,253.69 |
| 2029 | 43 | $232,750.00 | $256,579.06 |
| 2030 | 44 | $266,025.00 | $282,236.97 |
| 2031 | 45 | $302,627.50 | $310,460.66 |
| **2032** | **46** | **$342,890.25** | **$341,506.73** |
| 2036 | 50 | $548,435.62 | $500,000.00 (= FI number) |

#### Pinned versions

No new dependencies.

#### Step 1 · Engine: Coast FIRE

- [ ] Done

1. Add `src/engine/coastFire.ts` with the types above and
   `calculateCoastFire`, following the design decisions exactly.
2. Add `coast` to `ProjectionSummary`'s `complete` variant, built in
   `summariseProjection` from the rows it already has.
4. Tests:
   - unit tests for `coast(k)`, including:
     - with and without dated expenses;
     - a dated expense after retirement (ignored);
     - `n = 0`;
   - fixture `tests/worked-examples/m4-coast.json` with examples A to F.
     `tests/unit/workedExamples.test.ts` checks the Coast FIRE number, the
     retirement-year figure, the reached row (or none) and example B's rows,
     to the cent;
   - property tests:
     - `coast(n)` equals the FI number at retirement;
     - with `r ≥ i` and no dated expenses, Coast FIRE is reached no later
       than FI;
     - a higher return never raises the Coast FIRE number;
     - larger contributions never make Coast FIRE later;
     - "without contributions" at row *n* is at least the FI number exactly
       when Coast FIRE is reached at row 0;
     - **reached means stoppable:** if Coast FIRE is reached at row *k* (*k*
       > 0), the real projection with contributions stopping after year *k*
       reaches the FI number by retirement. Stopping a year earlier doesn't;
     - moving savings from the portfolio into cash at a lower rate never
       lowers the Coast FIRE number.

**Check:** `npm run check` passes.

#### Step 2 · Results: Coast FIRE tile

- [ ] Done

1. Add the Coast FIRE tile, as described above, after "Progress to FI".
2. Tests:
   - examples A, D and E, one for each status;
   - example A's breakdown shows the cash and portfolio lines;
   - example C's breakdown includes the dated-expense line.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 3 · `MilestoneTimeline` and the Milestones card

- [ ] Done

1. Add `MilestoneTimeline` in `src/ui/components/`, as described above.
   - Styles use role variables only. Reached items are solid, projected
     items are outlined, so status never relies on colour alone.
   - Add any new pairs to `tokens.test.ts`.
2. Add a `MilestonesSection` on Results, built from the summary, between
   the tiles and chart (a). It shows only when the projection is complete,
   and adds "Milestones" to the "On this page" links.
3. Tests:
   - ordering by year;
   - undated items last;
   - each status's text;
   - the list semantics;
   - example A's items: Coast FIRE 2029, FI reached 2038, retirement 2042,
     money lasts to 95.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 4 · Coast FIRE chart

- [ ] Done

1. Change `TimeSeriesChart`'s `dashed` to `strokeStyle`, and update chart
   (a). Chart (a) must look the same: check its E2E stroke assertions still
   pass.
2. Add `--colour-chart-secondary` and its 3:1 graphics pair.
3. Add `buildCoastChartSeries(coast, dollarsMode)` in
   `src/ui/charts/coastChart.ts`, with unit tests for examples A and E in
   both modes.
4. Add `CoastChartSection` on Results, after chart (a), with the caption and
   no toggle of its own (it follows the page's toggle). Clicking a year
   jumps to that row in the Year by year section. Add "Coast FIRE chart"
   to the "On this page" links.
5. Add the Results page with this chart to the contrast sweep.

**Check:** `npm run check` and `npm run test:e2e` pass. Check by eye that
the four lines are easy to tell apart on the deep green page.

#### Step 5 · E2E, README and wrap-up

- [ ] Done

1. E2E (`tests/e2e/coast.spec.ts`), with the clock fixed in 2026:
   - **Example A:**
     - enter it through the screens;
     - Results shows "$811,877" and "Reached in 2029, at age 37";
     - Milestones lists Coast FIRE 2029 before FI reached 2038;
     - the Coast FIRE chart shows its four lines with the right strokes,
       and a "Coast FIRE" marker;
     - hovering shows four values;
   - **Example E:** change to it, and the tile says "Not before retirement
     at 40";
   - **Reload:** the tile is unchanged.
2. Update README's "What it does" for Coast FIRE and the milestones.
3. Update PLAN.md: the M4 status, Next steps, and an "As built" note under
   each step that needed one.

**Check:** `npm run check` and `npm run test:e2e` pass. **Open the M4 PR**
for the owner to verify.

#### Follow-ups

- **Remember the today's/nominal choice** in `meta` between visits (from
  M2).
- **Advanced growth options per asset** (owner's request, not yet
  scheduled). Every asset already has its own rate. Later, an advanced
  option could let an asset grow in other ways, for example a different
  rate for different periods, or growth split into capital growth and
  income. It needs a requirement (a backlog entry in REQUIREMENTS.md)
  before it's planned.
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
- [ ] Implement the one-page Results (steps A and B), then open it for
      verification.
- [ ] Approve the M4 step-by-step plan (this PR).
- [ ] Implement M4 (steps 1 to 5), then open the M4 PR for verification.
