# Plan

This is the living plan for building the Australian FIRE Planner. It is
written against [`requirements/REQUIREMENTS.md`](requirements/REQUIREMENTS.md)
and the [desktop mockups](requirements/mockups/README.md).

**Current status:** M0 to M7, the colour scheme, the one-page Results, cash drawn last, the salary growth default and Start over from the logo are done. The M8 (personal income tax) step-by-step plan is in review. The plan for inflation in the views is merged and its implementation is still to do.

| Part | Contents | Status |
| --- | --- | --- |
| 1 | Order in which the requirements are delivered | Agreed |
| 2 | Tech stack, architecture and testing approach | Agreed |
| 3 | Milestone plans: how each milestone is delivered, then a step-by-step plan per milestone | M0–M7 and the side plans done. M8 plan in review |

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
| 3 | **TAX-7** Grossing up after-tax expenses | Must | part: tax funded out of pay and savings |
| 4 | **FIRE-7** FIRE visualisations | Must | rest: chart (c) |

Also in M8 (from the cash drawn last review): while working, after-tax salary pays living expenses, dated expenses and contributions. A surplus is saved to cash; a gap is drawn in the usual order. Grossing up taxable withdrawals (the rest of TAX-7) needs taxable withdrawals, so it moves to M9.

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
| 7 | **TAX-7** Grossing up after-tax expenses | Must | rest: taxable withdrawals |

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
| **TAX-7** Grossing up after-tax expenses | Must | M8 → M9 |
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
| **NFR-8** Start over | Must | Start over from the logo (side plan) |
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
five stages:

1. **Plan.** The lead agent writes a step-by-step plan for the milestone in
   this section of `PLAN.md` and opens a PR containing **only that plan**.
2. **Approve.** The owner reviews the plan PR. Implementation does not start
   until the owner **explicitly approves** it. Feedback is worked into the
   plan until then. (At the owner's request, M6 and M7 open the
   implementation stacked on the plan PR, so both are reviewed together.)
3. **Implement.** A lower-cost implementer subagent (e.g. Sonnet or Haiku)
   is given **only this file** and instructions to implement the approved
   milestone, one step at a time. When anything is unclear, it stops and asks
   instead of guessing. The lead answers, and any change of approach is
   written into the plan explicitly, so the plan stays the source of truth.
   The lead reviews each step's work, runs the checks, and commits it, one
   commit per step with a message explaining why.
4. **Challenge.** When a PR's steps are all committed, and before the PR
   is opened, a **new reviewer subagent on a higher-reasoning model** (e.g.
   Opus, thinking hard) reviews the whole PR as a reviewer and challenger:
   - **What it gets:** this file, the PR's diff and the worked examples.
   - **What it looks for:**
     - bugs, and figures that don't match the worked examples;
     - edge cases the tests miss;
     - breaches of CLAUDE.md;
     - anything that contradicts the plan.
   - **It challenges** the plan's own decisions where they look wrong.
   - **It doesn't change code.** It reports findings, most severe first.

   The lead deals with every finding:
   - **Fix it,** in its own commit explaining why, with the checks re-run.
   - **Or record why not.**
   - **Bring design challenges to the owner.**

   The PR description summarises the review and what was done about it.
5. **Verify.** The lead opens the PR for the owner to verify.

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

### Cash drawn last: done

Delivered in PR #30 (plan in PR #27). Spending each year is drawn from the
portfolio first, then super (from its access age, M5), and cash last, as
a buffer. Coast FIRE mirrors this: the portfolio pays dated expenses, and
cash grows untouched. The salary cash flow (salary paying the bills while
working) is deferred to M8, where after-tax salary exists.

### Salary growth defaults to "No growth": done

Delivered in PR #29 (plan in PR #28). An untouched "Grows at" means flat
salary. "Inflation" is an ordinary choice. Worked examples set salary
growth explicitly and never rely on the default.

### M5 · Superannuation: accumulation: done

Delivered in PRs #26 (A: rules as data and salary) and #32 (B: super),
plan in PR #25. The full step-by-step plan is in git history.

Conventions settled while building M5, which later milestones rely on:

- **Rules as data (NFR-3)** (`src/rules/`):
  - **Files:** one JSON file per financial year in `src/rules/data/`, with
    a source link per value and a `verification` status. A file is marked
    "verified" only after the owner checks it, because the ATO site blocks
    automated clients.
  - **Wire and internal types:** `RulesFile` (Zod) is mapped to `RuleSet`
    by `ruleSetFromWire`.
  - **Which rules a row uses:** `rulesForYear(ruleSet, calendarYear,
    inflation)` picks the rules in effect on 1 January of the row's year.
    After the latest file, dollar thresholds grow with inflation, flagged
    `isEstimated`.
  - **The engine receives the rules** as `summarisePlan(plan, startYear,
    ruleSet)` and never imports the data files. Values left to the law
    resolve with source `"rule"`, and show as "12% (legislated)".
- **Salary:** each person's gross salary grows as a `GrowthRate`
  (inflation ± a margin, a fixed rate, or none) and stops at retirement.
  It sets employer super only; take-home pay arrives in M8.
- **Super per person**, each year, in this order:
  - employer contributions = rate × min(salary, maximum contribution base);
  - salary sacrifice while working;
  - non-concessional contributions in their years;
  - 15% contributions tax;
  - earnings at the return net of fees, less earnings tax.

  Investable net worth = cash + portfolio + super.
- **Drawing order:** the portfolio, then super (only once accessible), then
  cash. M5 had super accessible from 65; M6 makes the access age an input.
- **Coast FIRE with super:**
  - **What stops:** coasting stops voluntary contributions (portfolio,
    salary sacrifice and non-concessional), while employer contributions
    continue until retirement.
  - **The number** is the closed form, cash(k) + super(k) +
    portfolioNeeded(k). Super grows untouched on the coast path, and every
    dated expense on the way must be paid.
  - **"Reached" is decided exactly,** by re-running the projection with
    voluntary contributions stopped after each year (the owner's choice).
    It is the authoritative answer; the number and chart line can differ
    from it only in a rare super-at-65 edge case.
- **Shared UI pieces:**
  - `GrowthRateField` (generic "Grows at");
  - `PerPersonFields` (names fields only when there are two people);
  - an "Advanced" `<details>` disclosure, covered by the contrast sweep
    open and closed;
  - `defaultText` on number fields for legislated defaults.
- **E2E conventions:**
  - Label lookups are exact (`{ exact: true }`), because Playwright matches
    substrings.
  - Year by year cells are read with the waiting `rowCells`/`yearCell`
    helpers in `tests/e2e/fixtures.ts`.
  - New specs are run with `--repeat-each=10` before they're trusted.
- **Property tests:** run a new or changed property file on its own
  several times (different seeds) before trusting a pass.

### M6 · Super access and the bridge period: done

Delivered in PR #34, plan in PR #33. The full step-by-step plan is in git
history.

Conventions settled while building M6, which later milestones rely on:

- **The condition of release** (SUPER-1, `isSuperDrawable` in
  `projection.ts`): super can be drawn at age a when a ≥ 65, or when a ≥
  the access age, a ≥ the preservation age (60) and a > the retirement
  age. Both ages are rules (`preservationAgeYears`,
  `unconditionalReleaseAgeYears`). The owner still has to verify them
  against the ATO.
- **The effective access age** (`effectiveSuperAccessAge`) is the first
  age super can be drawn while retired: the access age if you retire
  before it, otherwise the year after retirement, capped at 65. It drives
  the bridge, the milestones and the "super locked until {age}" wording.
  Rows carry `superAccessible`.
- **The bridge check** (`assessBridge`, `src/engine/bridge.ts`) has two
  parts: the bridge (retired years before access, funded by outside
  super) and after access (to the end of the plan).
  - **Status:** MET or SHORT comes from the projection's shortfalls, so
    it is exact.
  - **Need:** a guide. The bridge need is discounted at the portfolio's
    return. The after-access need is discounted at super's after-tax
    return.
- **The Coast FIRE split** (`calculateCoastSplit`) asks two stricter
  questions than the combined Coast FIRE, which stays the overall answer:
  - outside super alone funds the bridge;
  - super alone, with employer contributions only, funds the years after
    access.
- **SUPER-8:** every withdrawal is at 60 or over, so it is tax-free. The
  after-access breakdown ends with a "Withdrawals are tax-free from age
  60" rule line.
- **Shared UI pieces:**
  - **`StatusMeter`:** a bar of projected against a marked need, with the
    status in words.
  - **`StackedAreaChart`:** the bridge chart. The bridge band is drawn
    over the fills as a tint.
  - **New colour roles:** `--colour-chart-outside` and
    `--colour-chart-super`.
  - **`ExplainPanel`:** keeps the last calculated line bold when a rule
    line follows it.
- **Chart bands:** Recharts 3 draws a reference area as a
  `path.recharts-reference-area-rect`, not a `rect`. CSS for bands targets
  that class.

### M7 · Couples: done

Delivered in PRs #37 (A: the household refactor) and #39 (B: couples), plan in
PR #35. The full step-by-step plan is in git history.

Conventions settled while building M7, which later milestones rely on:

- **A household is a list of people.**
  - `ProjectionInputs.people` is a non-empty list. Each row has a
    `PersonYear` per person, and the household fields are the sums.
  - Rows run until the **younger** partner reaches the plan-until age.
  - The household phase of a row is `working`, `oneRetired` or `retired`.
  - Two named points replace "the retirement age" downstream: the first
    retirement row (the bridge starts after it) and the household
    retirement row (the last year anyone works: the FI number "at
    retirement", Coast FIRE's target).
- **Drawing order:** portfolio, then super, then cash.
  - Super is drawn from people whose super is accessible, in proportion to
    their balances. The smallest balance pays the exact remainder, so the
    shares add back to the amount exactly (`drawSuperProRata`).
  - A person with no super (no balance, no voluntary contribution, no
    salary) never has accessible super and never ends the bridge.
- **The couple bridge** runs from the first retirement to the year before
  the first partner's super opens.
  - Its need is net of portfolio contributions still being paid
    (`needBeforeContributions` is the gross figure that Coast FIRE uses).
  - The after-access "projected" counts only super that is open when that
    part starts. Locked super is a note line (`lockedSuper`), not part of
    the total. The status stays exact, from shortfalls.
- **Portfolio ownership** decides when contributions stop: `whileWorking`
  (the owners) or `throughYear`. A stop age entered by the user is measured
  on the first owner, and it keeps its calendar year if that person changes.
- **Interim spending** (while only one partner has retired) is stored as
  `expenses.interimAnnualDollars`. M8 changes what it means.
- **Names:** `displayName(person, index, people)`, with "Alex (Person 1)" when
  two partners share a name. Labels, breakdowns and tiles use it.
- **Wording for a couple:** `formatAges`, `describeAges` and `planEndWords`
  name both partners. Any field that still holds only the first person's
  figure is called `firstPersonAge`, so the compiler lists every read.
- **E2E conventions:** `couple.spec.ts` waits for the autosave (it polls
  IndexedDB) before reloading. Never leave a `vite preview` server running
  between runs; it can serve a stale build.
- **Challenger review:** each implementation PR is reviewed by a stronger
  model before it is opened (stage 4 of "How each milestone is delivered").

### M8 · Personal income tax: step-by-step plan

**Status:** plan, awaiting the owner's approval. As with M6 and M7, the
implementation PRs are opened stacked on this plan PR once the plan is
written. The plan is still reviewed first, and the implementation follows
any change to it.

**Kind:** behavior change.

**Goal:** until now, pay is assumed to cover everything while you work, and
no tax is modelled. M8 taxes each person's salary and the interest on cash
at the resident rates, with the Medicare levy and the low income offset.
That gives take-home pay, which makes the working years a real cash flow:
take-home pay pays for living costs, tax and contributions, anything left
over is saved to cash, and a shortfall is drawn from savings (the "cash
drawn last" review's M8 item). Chart (c) shows the money in and out each
year.

**Requirements in scope:**
- **TAX-1:** personal income tax and the Medicare levy, on salary and cash
  interest. Dividends, net rent and capital gains join in M9 and M14.
- **TAX-9:** the tax-free threshold, the low income tax offset (LITO) and
  the Medicare levy's low-income reduction.
- **TAX-7, part:** after-tax spending is funded: tax is paid out of pay and
  savings each year. Grossing up taxable *withdrawals* needs taxable
  withdrawals, which arrive in M9, so TAX-7 completes there (owner
  decision 7).
- **FIRE-7:** chart (c), "Money in and out each year".
- **NFR-3:** the tax rules are dated data, like M5's.
- **EXP-2, rest:** the interim amount (while only one partner has retired)
  now means the household's total spending, since pay is modelled.

**Out of scope:**
- tax on portfolio returns, franking credits and capital gains (M9);
- net rent and negative gearing (M14);
- the Medicare levy surcharge, HELP repayments (M24) and the seniors and
  pensioners offset, which applies from age 67 (follow-ups);
- a concessional contributions cap and Division 296 (M11);
- choosing which asset to sell for tax reasons (TAX-8, M20);
- who owns the cash (cash interest is split equally for now).

**Two implementation PRs, stacked on this plan PR.** Both are behaviour
changes, and the second only makes sense once the first is checked.
- **PR A, tax as data and take-home pay shown** (steps 1 to 6). The rules,
  the tax calculation and per-person tax in the projection. Tax and
  take-home pay are shown, but your balances don't change yet. A banner
  says so. Its base is this plan PR.
- **PR B, the working-year cash flow** (steps 7 to 13). Take-home pay funds
  spending, contributions and tax; surplus goes to cash; Coast FIRE, the
  bridge and the earliest age follow; chart (c). Its base is PR A.

Each PR goes through the challenger review before it is opened.

**Definition of done:**
- Income & expenses shows, under each salary, the estimated tax and
  take-home pay, with a "How is this calculated?" breakdown.
- Year by year has a Tax column. For a plan with a salary, working years
  draw living expenses from take-home pay, and any surplus shows up in cash.
- Results has chart (c), "Money in and out each year".
- The interim amount reads "Spending while one of you has retired".
- Examples T (tax), F, G, H, A and E below match to the cent. Every M2–M7
  example without a salary is unchanged.
- `npm run check` and `npm run test:e2e` pass, and CI is green.

#### Design decisions for M8

**What is taxed** (TAX-1):
- **Salary,** less salary sacrifice, which comes out before tax. Employer
  super isn't taxable income.
- **Interest on cash,** for the year. It is split equally between the
  partners, because cash has no owner yet. A couple's two tax-free
  thresholds then both apply (example H).
- **Not taxed in M8:** portfolio returns (M9); super, which is taxed inside
  the fund as in M5, with withdrawals tax-free from 60 as in M6.
- **Years:** a row stands for a financial year, with the rules in effect on
  1 January of its calendar year, as for every rule since M5.

**The tax calculation** (`calculateIncomeTax`, one person, one year):

```
 taxable income (never below $0)
   → tax on each bracket
   − low income tax offset            (reduces tax, never below $0)
   = income tax
   + Medicare levy                    (2%, shaded in at low incomes)
   = tax payable
```

- **LITO:** $700 up to $37,500; then falling 5 cents per dollar to $325 at
  $45,000; then falling 1.5 cents per dollar, to $0 at $66,667.
- **Medicare levy:** nothing up to the low-income threshold; then 10% of
  the amount above it, until that equals 2% of income (at 1.25 times the
  threshold); then 2% of all taxable income. The file stores the threshold
  and the 10%, and a test checks that the upper threshold they imply
  matches the ATO page to within $1.
- **Result:** an `Explained` with one line per bracket, the offset and the
  levy, so every figure can be traced (NFR-1).

**Rules as data** (NFR-3). A new `incomeTax` section of the rules files:

```json
"incomeTax": {
  "residentBrackets": [
    { "fromDollars": 0,      "ratePercent": 0 },
    { "fromDollars": 18200,  "ratePercent": 16 },
    { "fromDollars": 45000,  "ratePercent": 30 },
    { "fromDollars": 135000, "ratePercent": 37 },
    { "fromDollars": 190000, "ratePercent": 45 }
  ],
  "lowIncomeTaxOffset": { "maximumDollars": 700, "firstThresholdDollars": 37500,
    "firstReductionPercent": 5, "secondThresholdDollars": 45000, "secondReductionPercent": 1.5 },
  "medicareLevy": { "ratePercent": 2, "lowIncomeThresholdDollars": 27222, "shadeInPercent": 10 }
}
```

- **Sources:** one URL per group (brackets, offset, levy), on the ATO's
  "Tax rates – Australian residents", "Low income tax offset" and
  "Medicare levy reduction for low-income earners" pages. The ATO blocks
  automated clients, so the lead gives the implementer the URLs, and the
  files are committed with `verification.status: "unverified"`. **The owner
  checks the values before the PR merges,** as for M5 and M6.
- **Values to check (FY2025–26):**
  - the five brackets and rates above;
  - the LITO figures above;
  - the Medicare levy rate (2%), the low-income threshold for a single
    person ($27,222 is the latest figure the lead knows, from 2024–25, and
    the ATO page may show a newer one) and the shade-in rate (10%).
  - If the owner finds a different Medicare threshold, the figures in
    examples T5, T11, T12 and T13 are recomputed.
- **The legislated cuts to the 16% rate:** 15% from 1 July 2026 and 14% from
  1 July 2027. Two more files, `fy2026-27.json` and `fy2027-28.json`, carry
  only the `incomeTax` section (brackets with the new bottom rate, the
  other values unchanged). The owner confirms them against the ATO page. If
  the owner would rather not, the FY2025–26 rates simply continue, which
  overstates tax by up to $268 a person in 2027 and $536 from 2028.
- **A file holds only the sections it changes.** Each section is read from
  the latest file in effect that has it. This is a small change to
  `rulesForYear` and the rules schema (step 1). It avoids guessing the
  FY2026–27 super values.
- **Indexation after the latest file:** every dollar amount in the section
  (bracket thresholds, the offset's amount and thresholds, the levy
  threshold) grows with inflation, once per year after the calendar year the
  section's latest file covers, flagged `isEstimated`. The rates don't
  change. This is M5's rule for the contribution base, extended (owner
  decision 2).

**The year's cash flow** (the new core of the projection). Each row, for
each person and for the household:

```
 in:   take-home pay      Σ (salary − salary sacrifice)          working people
 out:  spending           working year:   living expenses
                          one retired:    spending while one of you has retired
                          all retired:    retirement spending
       dated expenses     in their years
       tax                Σ tax on (salary − sacrifice + this person's share of cash interest)
       contributions      portfolio contribution, non-concessional  (paid from pay)
 ──────────────────────────────────────────────────────────────────────────────
 funding need = out − in
   ≤ 0   the surplus is saved to cash, at the end of the year
   > 0   drawn from the portfolio, then accessible super (pro rata), then
         cash; whatever is left is the shortfall, as now
```

- **Interest** is credited on the opening cash balance as now, and taxed in
  the same row. Surplus saved this year earns interest from next year.
- **Tax on interest** is one of the year's outgoings, like tax on salary. It
  is paid out of pay if there is any, otherwise it is drawn.
- **Pay is modelled only when a salary is entered** (owner decision 1). When
  nobody's salary is above $0, the working years stay exactly as in M7:
  nothing is drawn for living expenses, and contributions appear from
  outside the plan. Results says so. Tax on cash interest applies in every
  plan.
- **Super contributions:** employer contributions and the contributions tax
  are unchanged. Salary sacrifice leaves pay before tax. Non-concessional
  contributions are paid from take-home pay.
- **Row fields:** each `PersonYear` gets `taxableIncome`, `incomeTax`,
  `medicareLevy` and `tax`; the row gets `netPay`, `tax`, `fundingNeed` and
  `savedToCash`. `spending` now includes living expenses in the working
  years of a plan with a salary.

**Spending while one of you has retired** (EXP-2). The M7 amount "drawn
from savings" becomes the household's **total spending** in those years,
funded first by the working partner's take-home pay (owner decision 6).
- **Default:** the retirement spending. This replaces M7's rule that
  defaults it from the later partner's pay, and M7's warning banner, since
  pay is now modelled.
- **Saved plans** keep the number in `expenses.interimAnnualDollars`. Its
  meaning changes, so the hint and the README say so. No migration is
  needed.

**The bridge, Coast FIRE and the earliest age** follow the cash flow:
- **The bridge need** (a guide; the status stays exact, from shortfalls) is
  the discounted sum, over the bridge years, of spending + tax +
  non-concessional contributions − take-home pay. For a couple, years with a
  partner still working can be negative: pay is arriving. A one-person plan
  has no pay in its bridge years, so its figures change only by tax on
  interest. The projected side is as in M7.
- **Coasting stops all saving:** voluntary contributions stop (as in M4 to
  M7), and so does saving the pay that is left over: it is spent (owner
  decision 5). Without this, "stop contributing" would still pile up
  cash. The projection takes a "stop saving the surplus after row k"
  setting for the Coast FIRE runs.
- **The Coast FIRE number:** the closed form assumed cash grows at the
  interest rate and the portfolio pays dated expenses. Cash now also pays
  tax, and the portfolio pays any working year whose spending and tax
  exceed pay. So `cashLeft`, `superLeft` and the payments the portfolio
  must make come from a run with the portfolio at $0, as M5 did for super.
  The formula and "reached" (the exact re-run test) keep their shape.
- **The coast split's outside-super target** is the bridge need before
  contributions: the need if voluntary contributions weren't paid and any
  surplus were spent (each year at least $0).
- **Earliest retirement:** unchanged. The search re-runs the projection,
  which now includes pay.

**Year by year** gets a **Tax** column (household total) after Salary.
Spending shows working-year living expenses when pay is modelled.

**Chart (c): "Money in and out each year."** A new `CashFlowChart`
(Part 2's component map). One stacked column per year:
- **above the axis (money in):** salary, and "drawn from savings";
- **below the axis (money out):** spending, tax, contributions (portfolio,
  non-concessional and salary sacrifice), and "saved to cash".

Every year balances: salary + drawn from savings = spending + tax +
contributions + saved to cash. A shortfall year adds an "unfunded" band
above the axis so it still balances. The chart follows the dollars toggle,
has a hover tooltip, a click jumps to the year's row, and a hidden data
table. New colour roles at 3:1 against the page, with their pairs in
`tokens.test.ts`.

**Income & expenses** shows, under each salary, "Estimated tax $X, take-home
$Y a year", with a breakdown: today's salary on the rules for the first
year, before salary sacrifice, interest or other income.

**Results banner:** "Not yet modelled: tax on portfolio income and gains
(M9), property (M12) and more."

#### Owner decisions to confirm in review

1. **Pay is modelled only when someone's salary is above $0.**
   - **Why:** a visitor who only wants an FI number (living expenses, ages
     and assets) shouldn't see their savings drawn down for years of
     living expenses they have no pay for. Entering a salary switches the
     plan to the full cash flow, and Results says which mode it is in.
   - **The alternatives:** always model pay, which makes a salary a
     required input and changes every no-salary example; or an explicit
     "my pay covers my costs" setting.
2. **Tax thresholds grow with inflation after the latest file.**
   - **Why:** it's M5's rule for the contribution base, and governments
     index the brackets from time to time.
   - **The alternative:** hold them fixed. That is bracket creep, more
     cautious for salaries that grow. Under the default "no growth" salary
     it makes tax fall over time, since prices rise but pay doesn't.
3. **Add FY2026–27 and FY2027–28 tax files** carrying the legislated 15%
   and 14% bottom rates, rather than keeping 16% for good.
4. **Cash interest is taxed and split equally between the partners.**
   - **Why:** cash has no owner yet.
   - **The alternative:** add an owner to cash now, with M7's
     `OwnershipField`.
5. **Coasting spends the surplus pay.**
   - **The alternative:** saved surplus counts as savings, so Coast FIRE
     is reached earlier, but "stop contributing" would still be saving.
6. **"Spending while one of you has retired" is the household's total,**
   defaulting to the retirement spending.
7. **TAX-7 is met in two parts:** M8 funds tax out of pay and savings; M9
   grosses up taxable withdrawals. The coverage index changes to "M8 → M9".

#### Worked examples

These were checked with an independent script, not the app's code. They
become fixtures in `tests/worked-examples/m8-tax.json`, plus rows for the
re-derived M5–M7 examples. The start year is 2026. A row in 2027 uses the
FY2026–27 rules (15% bottom rate) and a row in 2028 or later the FY2027–28
rules (14%), so the tax a figure shows depends on its year.

**T: the tax calculation** (`calculateIncomeTax`, 0% inflation):

| Case | Year | Taxable income | Bracket tax | LITO | Income tax | Medicare levy | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | 2026 | $18,200 | $0 | $0 | $0 | $0 | **$0** |
| T2 | 2026 | $45,000 | $4,288 | $325 | $3,963 | $900 | **$4,863** |
| T3 | 2026 | $100,000 | $20,788 | $0 | $20,788 | $2,000 | **$22,788** |
| T4 | 2026 | $145,000 | $34,988 | $0 | $34,988 | $2,900 | **$37,888** |
| T5 | 2026 | $30,000 | $1,888 | $700 | $1,188 | $277.80 | **$1,465.80** |
| T6 | 2026 | $200,000 | $56,138 | $0 | $56,138 | $4,000 | **$60,138** |
| T7 | 2026 | $40,000 | $3,488 | $575 | $2,913 | $800 | **$3,713** |
| T8 | 2026 | $60,000 | $8,788 | $100 | $8,688 | $1,200 | **$9,888** |
| T9 | 2027 | $100,000 | $20,520 | $0 | $20,520 | $2,000 | **$22,520** |
| T10 | 2028 | $100,000 | $20,252 | $0 | $20,252 | $2,000 | **$22,252** |
| T11 | 2026 | $27,222 | $1,443.52 | $700 | $743.52 | $0 | **$743.52** |
| T12 | 2026 | $34,027 | $2,532.32 | $700 | $1,832.32 | $680.50 | **$2,512.82** |

- **T13 (indexation):** $100,000 in 2031 at 2.5% inflation. Three years
  past the 2028 file, so every dollar amount is ×1.025³ = 1.076891.
  Bracket tax $19,502.4702, income tax $19,502.4702, Medicare levy $2,000,
  total **$21,502.4702**.
- **T14 (negative income):** a taxable income below $0 pays $0.

**F: one person, working years paid from take-home pay.**
- **Inputs:** age 40, retires at 42, plan until 45. Salary $100,000, no
  growth. Living and retirement spending $60,000. Portfolio $100,000 at 0%,
  contributing $10,000 a year to the retirement year. Cash $20,000 at 0%.
  Super $0 at 0%, so only employer super goes in. No inflation.
- **2027 (age 41, working):**
  - take-home pay $100,000; tax $22,520 (T9);
  - out: living $60,000 + tax $22,520 + contribution $10,000 = $92,520;
  - funding need −$7,480, so $7,480 is saved: cash **$27,480**, portfolio
    $110,000, super $10,200 (12% of $100,000, less 15% tax).
- **2028 (age 42):** tax $22,252 (T10); need −$7,748; cash **$35,228**;
  portfolio $120,000; super $20,400.
- **2029 (retired):** spending $60,000, all from the portfolio ($60,000
  left). **2030:** the portfolio is $0. **2031 (age 45):** cash pays
  $35,228 and **$24,772 is short**; super ($20,400) is locked until 65.
  Money runs out in **2031 (age 45)**.

**G: a couple, one retired.**
- **Inputs:** Alex 40, retires at 42, salary $100,000. Sam 40, retires at
  41, salary $40,000. Neither salary grows. Plan until 44. Living $70,000,
  spending while one has retired $50,000, retirement spending $60,000.
  Portfolio $100,000 at 0%, no contributions. Cash $20,000 at 0%. Super
  $0 at 0%.
- **2027 (both working):** Alex's tax $22,520 (T9). Sam's tax on $40,000 at
  15%: $3,270 − LITO $575 + Medicare $800 = **$3,495**. Take-home pay
  $140,000; out $70,000 + $26,015. Surplus **$43,985**, cash $63,985.
- **2028 (Sam retired, Alex working):** spending $50,000, Alex's tax
  $22,252, pay $100,000. Surplus **$27,748**, cash $91,733.
- **2029:** both retired. The portfolio pays $60,000 ($40,000 left).
  **2030:** the portfolio pays $40,000 and cash $20,000 (cash $71,733).
  The money lasts.

**H: tax on cash interest, and the couple's two thresholds.**
- **Inputs:** age 60, retired, plan until 63. Cash $600,000 at 4%. Retirement
  spending $40,000. No portfolio or super. No salary, so pay isn't modelled.
- **One person:**
  - **2027:** interest $24,000; tax at 15%: $870 − LITO $700 = **$170**;
    Medicare $0 (below $27,222). Cash $583,830 after $40,170 is drawn.
  - **2028:** interest $23,353.20; tax at 14%: $721.448 − $700 = **$21.45**;
    cash **$567,161.75**.
  - **2029:** interest $22,686.47; bracket tax $628.11 is covered by the
    $700 offset, so tax is $0.
- **A couple with the same cash:** each is taxed on $12,000, under $18,200,
  so tax is $0 and cash after 2027 is **$584,000**.

**A: the headline example, with pay modelled** (M5's example A: age 34,
retire 50, plan until 95, portfolio $720,000 at 7% with $30,000 a year to
50, cash $20,000 at 4%, 2.5% inflation, living and retirement spending
$64,000, salary $145,000 growing at inflation + 1%, super $185,000 at 7%,
$10,000 a year salary sacrifice 2027–2042, access at 65).
- **2027:** salary $150,075; salary sacrifice $10,000; take-home pay
  **$140,075**. Taxable income $140,075 + $800 interest = $140,875: bracket
  tax $33,193.75 (15% bottom rate), Medicare $2,817.50, tax **$36,011.25**.
  Out: living $65,600 + tax + $30,000 contribution. Funding need
  −$8,463.75: cash **$29,263.75**, portfolio $800,400, super $219,815.15.
- **End of 2042:** cash $526,155.42, portfolio $2,962,199.51, super
  $1,175,633.85, investable **$4,663,988.78**.
- **FI reached:** 2033, age 41: investable $2,041,786.51 against an FI number
  of $1,901,897.21.
- **The bridge** (2043–2056): need $978,216.63, projected $3,488,354.92,
  **MET**. **After access** (2057–2087): need $2,562,245.03, projected
  $8,667,394.69, **MET**.
- **Earliest retirement:** age 40 (2032).
- **Coast FIRE:** the number today is **$672,262.87**, reached 2026.
  - **Outside super:** needs $338,666.95 today (portfolio $318,666.95 +
    cash $20,000), has $740,000, coasting since 2026.
  - **Super alone:** needs $257,377.31, has $185,000, coasting from
    **2039, age 47**.
  - M6's figures were $338,666.95 and $256,832.52: only the super need
    moves, because tax on interest slightly raises the after-access need.

**E: the couple example, with pay modelled** (M7's example E, with the
interim amount entered as $50,000: Alex 34, retires at 50, salary $145,000
growing at inflation + 1%, super $185,000, $10,000 a year salary sacrifice
2027–2042, access 65; Sam 32, retires at 52, salary $110,000 with no
growth, super $120,000, access 60; portfolio $100,000 joint, contributing
$20,000 a year to 2046; cash $20,000; retirement spending $90,000, living
expenses $90,000; plan until 95; 2.5% inflation, 7% return, 4% interest).
- **FI reached:** 2038 (Alex 46, Sam 44): investable $3,048,759.83 against
  $3,025,999.85.
- **The bridge** (2043–2053): need $680,462.35, projected $2,637,456.64,
  **MET**. The need before contributions, for the coast split, is
  **$665,649.10**.
- **After access** (2054–2089): need $3,816,347.33, projected $4,296,838.16
  (the open super, portfolio and cash), plus Alex's $2,220,151.72 locked
  until 2057. **MET.** The money lasts to 2089.
- **Earliest retirement:** Alex 40 (2032) and Sam 34 (2028).
- **Cash:** by 2042 the saved surplus has built cash to $1,784,479.20, so the
  default of saving surplus to cash matters for a high earner (follow-ups).

**Unchanged:** M7's D and D2 have no salary and no cash, so their figures
stay exactly as in M7. So do the M1–M4 examples: none has a salary, and
their cash is small enough that its interest is under the tax-free
threshold.

**Re-derived:** every scenario with a salary changes wherever pay now
matters (cash, portfolio, investable, the FI year, solvency, and the
bridge and Coast FIRE figures): M5's A, B, S1, S2, S3 and C; M6's A, A with
access at 60, and C; M7's E. Their super rows (employer contributions,
contributions tax, earnings and super balances) don't change, because pay
doesn't touch super. The lead works the new expectations out with the
independent script when step 8 starts, and gives them to the implementer.
A and E above are the headline cases.

#### Step 1 · Rules: sections, income tax, and the legislated rates (PR A)

- [x] Done

**Kind:** behavior change (data only, no screen changes).

1. **Optional sections.** In the rules schema, `superannuation` and the new
   `incomeTax` section are each optional, and a file that has a section
   must have that section's `sources` entries. `RuleSnapshot` and
   `YearRules` gain `incomeTax`. Unit tests: a file with neither section is
   rejected; a file with only `incomeTax` is accepted.
2. **`rulesForYear` reads each section from its own latest snapshot,** and
   indexes a section's dollar amounts from the calendar year that snapshot
   covers. The existing superannuation results don't change (a regression
   test pins the M5 and M6 values).
3. **The values** in `fy2025-26.json` (above), and the two files
   `fy2026-27.json` (effective 2026-07-01) and `fy2027-28.json` (effective
   2027-07-01), with only `incomeTax` and `sources`. All three keep
   `verification.status: "unverified"`, with a note naming what the owner
   must check.
4. **Wire and internal types are separate:** `ratePercent` and the other
   `…Percent` fields become fractions in `IncomeTaxRules`, as for the
   superannuation rules.
5. **Tests:**
   - `rulesForYear` for 2026, 2027, 2028 and 2031 returns the right bottom
     rate and amounts, with `isEstimated` only after 2028;
   - the Medicare upper threshold derived from the lower one and the
     shade-in rate is within $1 of $34,027.

**Check:** `npm run check` passes. No worked example changes.

**As built:**
- `YearRules` keeps `financialYear` and `isEstimated` for the superannuation
  section (so every M5/M6 caller is unchanged) and adds
  `incomeTaxFinancialYear`, `incomeTaxIsEstimated` and `incomeTax`.
- `rulesForYear` throws if no file holds a section, so the bundled set must
  always have both. A file with only one section is fine on its own.
- A bundled-data test also checks the bracket list starts at $0 and
  increases (the schema rejects it otherwise).
- All three files are `unverified`. Their notes say the values and the three
  URLs were entered from memory and not opened, so the owner must open each
  URL and check the values on it. The existing super note is kept, with a
  sentence added saying the `incomeTax` section is unchecked.
- README "How to add next year's rules" now mentions optional sections.

#### Step 2 · `calculateIncomeTax` (PR A)

- [x] Done

1. `calculateIncomeTax(taxableIncome, incomeTaxRules)` in
   `src/engine/incomeTax.ts`, returning an `Explained` per the design. It
   never throws: negative or non-finite income counts as $0.
2. **The fixture `tests/worked-examples/m8-tax.json`** with cases T1 to T14
   (a `taxCases` list: year, inflation, taxable income, and each expected
   part), and a test over it that goes through `rulesForYear`, so rules
   selection and indexation are tested too.
3. **Property tests:**
   - tax payable never exceeds taxable income;
   - take-home (income − tax) never falls as income rises;
   - income below the tax-free threshold and Medicare threshold pays $0.

**Check:** `npm run check` passes.

**As built:**
- `calculateIncomeTax` returns an `IncomeTaxResult`: an `Explained` (value =
  tax payable) that also carries `bracketTax`, `lowIncomeTaxOffsetApplied`,
  `incomeTax` and `medicareLevy`, so step 3 can store the parts separately.
- Lines: one per bracket the income reaches (including the 0% one), then the
  offset (`−`), the levy (`+`) and "Tax payable" (`=`). The offset is the
  amount used, capped at the bracket tax.
- `m8-tax.json` has `taxCases` and no `scenarios`, so it is tested by
  `tests/unit/taxExamples.test.ts`, and `workedExamples.test.ts` skips files
  without `scenarios`. The fixture README describes `taxCases`.

#### Step 3 · Tax in the projection, not yet funded (PR A)

- [x] Done

1. **Per-person tax in each row.** `PersonYear` gets `taxableIncome`,
   `incomeTax`, `medicareLevy` and `tax`. Taxable income is salary − salary
   sacrifice + the person's equal share of the year's cash interest. The
   row's `tax` is the sum. Balances are **not** changed in this PR.
2. **Tests,** with the independent figures: F's tax lines (2027 $22,520,
   2028 $22,252), G's (Sam $3,495), H's ($170, $21.45 and, for a couple,
   $0), and A's 2027 ($36,011.25 for Alex). The existing M2–M7 fixtures
   still pass, since nothing else moves.

**Check:** `npm run check` passes.

**As built:**
- `ProjectionInputs` gains a required `ruleSet`, because income tax needs the
  rules even when a person has no super account (row tax uses
  `rulesForYear(ruleSet, calendarYear, inflationRate).incomeTax`).
  `summarisePlan` passes the bundled set; `onePersonInputs` uses it too.
- `PersonYear` gains `taxableIncome` (never below $0), `incomeTax`,
  `medicareLevy` and `tax`; `ProjectionRow` gains `tax` (the sum). Row 0 is 0.
- **Example H's 2028 differs from the plan in this PR.** Tax is not yet paid
  from cash, so cash at the end of 2027 is $584,000, not $583,830, and 2028
  tax is $22.40, not $21.45. The fixture checks $22.40 and says so. $21.45
  returns when PR B funds tax (step 8), and that step must update the fixture.
  F, G, A and H's 2027 and couple figures are unaffected.
- The fixture scenarios (F, G, H, H couple, A) are in `m8-tax.json`, checked
  through a new `taxRows` field in the worked-example harness.

#### Step 4 · Tax and take-home pay on the screens (PR A)

- [x] Done

1. **Income & expenses:** under each salary, "Estimated tax $X · take-home
   $Y a year", with an `ExplainPanel` breakdown ("How is this
   calculated?"): the bracket lines, the offset and the levy.
2. **Year by year:** a "Tax" column (household total) after Salary, in the
   dollars the page's toggle shows.
3. **A banner on Results,** for this PR only: "Tax is shown but isn't yet
   taken from your savings. That comes next." And the "Not yet modelled"
   banner reads "tax on portfolio income and gains (M9)".
4. **Tests:** component tests for the estimate (T3: $100,000 gives tax
   $22,788 and take-home $77,212), the column, and the banners.

**Check:** `npm run check` passes. Check by eye on Income & expenses and

**As built:**
- `SalarySection` shows, under each salary above $0, "Estimated tax $X ·
  take-home $Y a year" and a "How is this calculated?" toggle with the
  `ExplainPanel` working. It taxes today's gross salary on the rules for the
  plan's start year (`usePlanStartYear`), in today's dollars regardless of
  the dollars toggle. With a couple, each line and toggle is prefixed with
  the person's name (via `PerPersonFields`). The salary hint no longer says
  tax arrives later.
- Year by year has a "Tax" column after Salary, showing "—" when there is
  no tax (like Salary). It follows the dollars toggle. At 1440px the table
  still fits without scrolling and Status isn't squeezed.
- Results has both banners: "Tax is shown but isn't yet taken from your
  savings. That comes next." (to be removed in PR B) and "Not yet modelled:
  tax on portfolio income and gains (M9), property (M12) and more."
- The "Spending while one of you has retired" hint still mentions tax
  arriving "in a later version"; step 11 rewrites it.
Year by year.

#### Step 5 · E2E, contrast, README (PR A)

- [ ] Done

1. **`tests/e2e/tax.spec.ts`,** with the clock fixed in 2026: enter a
   $100,000 salary and read the estimate ($22,788 and $77,212, with the
   breakdown open); Year by year's Tax column shows $22,520 in 2027; a
   second person gets their own estimate. Run it 10 times.
2. **The contrast sweep** covers the new text and the open breakdown.
3. **README** "What it does": tax and take-home pay. PLAN.md status and
   "As built" notes.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 6 · Challenger review of PR A, then open it

- [ ] Done

1. **Review:** the reviewer subagent checks PR A's diff against this plan,
   the worked examples and the requirements.
2. **Fix and open:** fix the findings, then open PR A, stacked on the plan
   PR.

#### Step 7 · Resolution: pay mode and the new interim meaning (PR B)

- [ ] Done

**Kind:** behavior change.

1. **`incomeIsModelled`** in the resolved inputs: true when any person's
   salary is above $0.
2. **The interim amount** defaults to the retirement spending; the M7
   default rule (`interimDefault.ts`) and the `NothingDrawnBanner` are
   removed. The field is renamed "Spending while one of you has retired",
   with a hint saying that pay covers part of it. The wire key is
   unchanged.
3. **Tests:** resolution for each case; the field's text; one-person
   screens unchanged.

**Check:** `npm run check` passes.

#### Step 8 · The working-year cash flow (PR B)

- [ ] Done

1. **The projection** follows "The year's cash flow", with `netPay`,
   `fundingNeed`, `savedToCash` and the new `spending`.
2. **A "stop saving the surplus after row k"** input, used by the Coast
   FIRE runs (step 9).
3. **Tests, with the independent figures:** F, G and H to the cent; A's and
   E's rows (2027, end of 2042 and the FI year for A; E's phases); money
   conservation as a property (opening + growth + inflows − outflows =
   closing, every row); and "a plan without a salary projects as in M7,
   apart from tax on interest" over random plans.
4. **Re-derive the salary examples** (see "Re-derived" above) in their
   fixtures. Only the expectations that pay changes are edited, and the
   lead supplies them. D, D2 and every no-salary example stay as they are.

**Check:** `npm run check` passes.

#### Step 9 · The bridge, Coast FIRE and the earliest age (PR B)

- [ ] Done

1. **The bridge need** per the design (spending + tax + non-concessional −
   pay), and `needBeforeContributions` for the coast split.
2. **Coast FIRE:** the coast runs stop saving the surplus; `cashLeft`,
   `superLeft` and the portfolio's payments come from a run with the
   portfolio at $0; the closed form's shape and the exact "reached" test
   stay.
3. **Tests:** A's bridge, after-access, coast number and split figures; E's
   bridge need and `needBeforeContributions`; D and D2 unchanged; M4's
   Coast examples unchanged (they have no salary). Run the new and changed
   property files several times.

**Check:** `npm run check` passes.

#### Step 10 · `CashFlowChart` and chart (c) (PR B)

- [ ] Done

1. **`CashFlowChart`** in `src/ui/components/`, built like `TimeSeriesChart`
   and `StackedAreaChart`: the stacked columns, tooltip, click-through, hidden
   data table and dollars toggle.
2. **`buildCashFlowChartSeries`** in `src/ui/charts/`, with unit tests that
   every year balances (F, G and A) and that a shortfall year gets an
   "unfunded" band.
3. **A "Money in and out each year" section** on Results after the bridge
   section, with an "On this page" link.
4. **New colour roles,** their 3:1 pairs in `tokens.test.ts`, and an E2E
   check of each series' fill, as `fireChart.spec.ts` does.

**Check:** `npm run check` and `npm run test:e2e` pass. Check by eye with A
and G.

#### Step 11 · Results and Income & expenses wording (PR B)

- [ ] Done

1. **A note on Results** saying whether pay is modelled: "Pay is included
   from your salary" or "No salary entered: your pay is assumed to cover
   your costs while you work".
2. **Remove the PR A banner;** update the "Not yet modelled" text.
3. **Year by year** spending in working years, for a plan with a salary.
4. **Tests,** including the one-person no-salary screens unchanged.

**Check:** `npm run check` passes.

#### Step 12 · E2E, contrast, README and wrap-up (PR B)

- [ ] Done

1. **`tests/e2e/cashFlow.spec.ts`,** with the clock fixed in 2026:
   - enter F through the screens and read cash $27,480 and $35,228 in Year
     by year, then the shortfall in 2031;
   - add a second person (G) and read the one-retired year's surplus;
   - remove the salary and see the plan return to the M7 behaviour;
   - a stored plan from before M8 loads and shows the new note.

   Run it 10 times.
2. **The contrast sweep** covers chart (c), its tooltip and the notes.
3. **README** "What it does" and PLAN.md: status, Next steps and "As built".

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 13 · Challenger review of PR B, then open it

- [ ] Done

1. **Review:** the reviewer subagent checks PR B's diff against this plan,
   the worked examples and the requirements. It is asked especially about
   Coast FIRE with pay, the bridge need, and what happens when a salary is
   added to or removed from a saved plan.
2. **Fix and open:** fix the findings, then open PR B, stacked on PR A.

#### Follow-ups

- **Where the surplus goes:** cash is the default, as the owner decided.
  For high earners this builds large cash balances (example E). An
  advanced "save the surplus to the portfolio" option is a candidate for
  the backlog, alongside per-asset growth.
- **The seniors and pensioners tax offset (SAPTO)** and the senior
  Medicare thresholds, for retirees aged 67 and over. Retirees' taxable
  income is mostly interest, so the effect is small, but it is missing.
- **Cash ownership,** so interest is taxed by owner rather than split
  equally.
- **Per-person tax columns** in Year by year (the mockup's "Per-person tax"
  chip) and a "year in detail" panel with each partner's tax (mockup 05).
- **A single salary-sacrifice-aware estimate** on Income & expenses
  (the estimate today ignores sacrifice and interest).
- **Remember the today's/nominal choice** between visits (from M2).
- **Advanced growth options per asset** (from M4's review; needs a backlog
  requirement).
- **The FY2026–27 super values** (the maximum contribution base and the
  rest), when the owner supplies them.
- **M11: clarify the "Tax on earnings" hint,** and confirm Division 296's
  status.
- **Carried from M1:** flush unsaved edits when the tab closes; write back
  migrated records once the first migration exists; two tabs on an empty
  database (M16).

### Start over from the logo: step-by-step plan

**Kind:** behavior change. **Status:** done. The plan was approved in
PR #31, and step 1 was merged in PR #36.

**Why.** The owner wants a quick way to throw away the current plan and
begin again. The "AU FIRE Planner" logo at the top left is where people
expect a "home" or "start again" control, and it currently does nothing.

**What changes for the user:**
- The logo becomes a button. Hovering or focusing it shows a "Start over"
  tooltip, and it gets the same focus ring as the other buttons. It
  keeps its green and gold look, with a slightly stronger border on hover
  so it reads as clickable.
- Clicking it opens a confirmation dialog: "Start over? This clears
  everything you've entered on this device. It can't be undone." with two
  buttons, **Start over** and **Keep my plan**. Keep my plan has focus
  when the dialog opens, so pressing Enter by accident loses nothing.
  Escape or clicking outside the dialog also keeps the plan.
- Confirming replaces the plan with a brand new blank one (the same plan a
  first-time visitor gets: "Person 1" and an empty "Share portfolio") and
  goes to step 1, Household. Every field shows its default again.
- If nothing has been entered yet, there is nothing to lose, so the
  dialog is skipped and the logo just goes to step 1.
- On the welcome page the logo stays plain text, because there is no plan
  to clear before the disclaimer is accepted.

**What happens to the saved plan.** The app keeps one plan in this
browser's storage and autosaves it. Starting over is saved like any other
edit: the blank plan overwrites the saved one, so after a reload the user
still sees the blank plan. Nothing is kept for undo; the dialog says so.
The disclaimer acceptance is kept, so the welcome page doesn't come back.
The "today's dollars / nominal dollars" choice is a display setting, not
part of the plan, and stays as it was. If another tab has changed the plan
(the "changed in another tab" banner is showing), autosave is already
stopped, so the blank plan isn't saved either; the banner still tells the
user to reload. When saved scenarios arrive (M16), Start over will clear
only the plan being edited, and that milestone's plan will revisit this.

**Accessibility.** The button's accessible name is "AU FIRE Planner,
start over", so it starts with the text people see (WCAG 2.5.3, label in
name). The dialog is the browser's native modal `<dialog>`, which traps
focus and handles Escape; focus returns to the logo when it closes
without starting over.

**Alternatives considered.** A separate "Start over" button next to the
logo is more discoverable, but the owner asked for the logo itself. An
undo toast instead of a confirmation would be friendlier, but needs the
old plan kept somewhere, which is more than this change needs.

**Requirements wording.** A new requirement, **NFR-8 Start over** (Must):
"The user can clear their plan and start again from the first step. The
app asks for confirmation first, because the cleared data can't be
recovered."

**Files touched:** `src/ui/components/AppShell.tsx` (the logo becomes a
button), a new `src/ui/components/StartOverDialog.tsx`,
`src/ui/styles/app.css` (logo button and dialog styles), a small
`isBlankPlan` helper in `src/plan/` (to skip the dialog when nothing has
been entered, ignoring the generated ids), and
`requirements/REQUIREMENTS.md`. The reset itself uses the existing
`replacePlan` action with `createNewPlan`, so the reducer, the engine and
the persistence layer don't change.

#### Step 1 · Start over (one PR)

1. `isBlankPlan(plan)`: true when the plan matches a fresh `createNewPlan`
   apart from its ids. Unit tests: a new plan is blank; any entered value,
   renamed portfolio or dated expense makes it not blank.
2. `StartOverDialog`: the confirmation dialog, with `onConfirm` and
   `onCancel`. Component tests: Keep my plan has focus on open, Keep my
   plan cancels, Start over confirms. jsdom has no modal dialog, so Escape,
   the backdrop and focus returning to the logo are covered by the E2E
   test instead, and the contrast sweep gains a check of the open dialog.
3. `AppShell`: the logo button, hidden as a button on the welcome page.
   On confirm (or straight away for a blank plan) it dispatches
   `replacePlan` with a new plan and navigates to Household. Component
   tests: confirming clears the plan and lands on Household; cancelling
   leaves the plan and the page as they were; a blank plan skips the
   dialog.
4. E2E (`tests/e2e/startOver.spec.ts`): enter a few values, click the
   logo, cancel, and see the values kept; click again, confirm, and see
   Household with empty fields; reload and see it still empty, with no
   welcome page. The contrast check covers the logo's hover and focus
   states.
5. Requirements (NFR-8) and this section marked done.

**Checks:** `npm run check` and the E2E suite all pass.

**Merge point:** after step 1. It only touches the header and doesn't
depend on any other work in progress, so it can merge at any time.

### Inflation in the views: step-by-step plan

**Kind:** behavior change (view only). **Status:** plan, awaiting the
owner's approval.

**Why.** The owner found the app's handling of inflation surprising: a
$50,000 yearly contribution reads as if it were being discounted. The owner's
model of a plan is:

1. inputs and budgets (contributions, salary, super contributions) are fixed
   dollars, as typed;
2. spending, which depends on prices, rises with inflation;
3. the FIRE targets (the FI number and what follows from it) rise with
   inflation too.

The engine and the plan model already work exactly this way
(`src/engine/projection.ts`): contributions and salary sacrifice are the same
nominal dollars every year, salary grows only by the chosen rule (default no
growth), and spending, dated expenses and the FI number are entered at
today's prices and multiplied by each row's inflation index. So **the engine,
the reducer and the saved plan don't change.** The views are what disagree
with the model.

**Audit of the views against the model:**

| View | What it does today | Matches the model? |
| --- | --- | --- |
| FI number tile | Headline is today's FI number; the inflated figure at retirement is only a sub-line | No: the target should lead with the inflated figure (rule 3) |
| Progress to FI tile | "$X invested of $Y", with Y today's FI number | Yes (today against today), but Y will no longer match the FI tile's headline, so it must say it is today's |
| Coast FIRE tile | Headline is what you need today (row 0), sub-line in the retirement year's dollars | Yes: it is a "needed now" amount, the same in both modes |
| FI reached, Earliest retirement, Money lasts, Milestones | Years and ages; money left is nominal and says so | Yes |
| Year by year table, FIRE chart, Coast chart, Bridge chart and meters | Follow the toggle, nominal by default (PR #17) | Yes in nominal. In today's dollars, fixed inputs (a $50,000 contribution) shrink each year with nothing saying why |
| Contributions per year (Portfolio) | "The same dollar amount every year" | Ambiguous: doesn't say it isn't raised with inflation |
| Salary sacrifice, Non-concessional (Super) | No word on whether they grow | No |
| Living expenses, Retirement spending ($ amount) | No word on growth | No: doesn't say the plan raises them with inflation |
| Dated expenses | "In today's dollars, grown with inflation" | Yes |
| Inflation (Assumptions) | "Grows your spending and FI number, and converts results to today's dollars" | Partly: results are nominal by default now, and it doesn't say what inflation leaves alone |
| Cash savings | "Spent before the portfolio in retirement" | No, and not about inflation: cash has been drawn last since PR #30 |

**What changes for the user:**

- **FI number tile.** The headline is the FI number at the household
  retirement year, in that year's dollars (`fiNumberAtRetirement`), labelled
  e.g. "at age 55 (2046)". The sub-line gives today's figure and its working:
  "$1,600,000 in today's money · $64,000/yr ÷ 4%". While the projection is
  incomplete (no retirement year yet) the tile shows today's figure as now,
  with "in today's money" added. The tile stays fixed: it doesn't follow the
  toggle, like Money lasts.
- **Progress to FI.** The sub-line names its comparison: "$X invested of
  today's FI number, $Y". The percentage doesn't change.
- **Input hints say which numbers are fixed and which grow:**
  - Contributions per year: "Fixed: the same dollars every year, not raised
    with inflation. Paid until the age below."
  - Salary sacrifice and Non-concessional: "Fixed: the same dollars every
    year." added to their current hints.
  - Living expenses: "At today's prices: the plan raises it with inflation
    each year." added to its hint.
  - Retirement spending as a $ amount: "At today's prices: the plan raises it
    with inflation each year."
  - Salary "Grows at": "No growth keeps the same dollars every year."
- **Inflation hint:** "Raises your spending and FI number each year.
  Contributions and salary stay as you enter them unless you choose growth."
- **Today's dollars as an explicit lens.** The toggle stays, nominal by
  default. When "Today's dollars" is chosen, a one-line note sits under the
  page header: "Shown in today's money. Fixed amounts, like your
  contributions, look smaller each year because inflation erodes them." The
  note goes away in nominal.
- **Cash hint fix:** "Earns the general interest rate (Assumptions). Drawn
  last in retirement, after the portfolio and super."

**Alternatives considered.** Indexing contributions to inflation by default
(so every input means today's money) was rejected by the owner: it breaks
rule 1 and would move saved plans' results. Removing the today's-dollars
toggle was also considered, but OUT-2 requires it and it answers "what is
this worth now?"; the note keeps it from surprising.

**Requirements wording.** FIRE-1 already asks for both figures, so no
requirement changes. IN-11's wording ("applies to expenses, salary growth
(when the user chooses it) and the display of today's-dollar values") is
still accurate.

**Files touched:** `src/ui/screens/ResultsScreen.tsx` (FI and progress
tiles, the today's note), `src/ui/sections/PortfolioSection.tsx`,
`SuperSection.tsx`, `LivingExpensesSection.tsx`,
`RetirementSpendingSection.tsx`, `SalarySection.tsx`,
`InflationSection.tsx`, `CashSection.tsx` (hints), their tests, and the E2E
specs that read the FI tile (`tests/e2e/fiNumber.spec.ts` and any others
that assert its headline). No engine, reducer or persistence changes.

#### Step 1 · Results tiles and the today's note

1. `FiNumberTile`: headline at retirement, today's figure and working in the
   sub-line; the incomplete-projection variant adds "in today's money".
   Unit tests: the worked M2 example shows the retirement-year figure as the
   headline and $1,600,000 in the sub-line; an incomplete plan shows today's
   figure; neither changes with the toggle.
2. Progress to FI sub-line names today's FI number. Unit test on the text.
3. The today's-money note under the header, shown only in today's mode.
   Unit test: absent by default, present after choosing Today's dollars,
   gone again on Nominal.
4. E2E: update the specs that read the FI tile's headline, and assert the
   note appears with the toggle.

#### Step 2 · Input hints

5. The hint wording above on Portfolio, Super, Living expenses, Retirement
   spending, Salary, Inflation and Cash. Component tests assert each hint.
6. This section marked done.

**Checks:** `npm run check` and the E2E suite all pass.

**Merge point:** one implementation PR with both steps (two or more commits).
It touches only the view layer, so it doesn't conflict with the M7 engine
work beyond the Results tiles, which M7 PR B also edits for couples
wording; whichever lands second rebases.

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
- [x] Implement M5 PR A, rules as data and salary (steps 1 to 4), then open
      it for verification.
- [x] Owner verifies and merges M5 PR A.
- [x] Approve the cash drawn last plan.
- [x] Implement cash drawn last (steps 1 and 2), then open it for
      verification.
- [x] Owner verifies and merges the cash drawn last PR.
- [x] Approve the salary growth default plan.
- [x] Implement the salary growth default (step 1), then open it for
      verification.
- [x] Owner verifies and merges the salary growth default PR.
- [x] Implement M5 PR B, super (steps 5 to 10), then open it for
      verification.
- [x] Owner verifies and merges M5 PR B.
- [x] Approve the M6 step-by-step plan (plan PR).
- [x] Implement M6 (steps 1 to 9) in the implementation PR stacked on the
      plan PR.
- [x] Owner verifies and merges the M6 PRs.
- [x] Approve the start over plan.
- [x] Implement start over (step 1), then open it for verification.
- [x] Owner verifies and merges the start over PR.
- [ ] Owner verifies the two M6 rule values (preservation age 60 and
      unconditional release at 65) against the ATO.
- [x] Approve the M7 step-by-step plan (plan PR), including the four owner
      decisions, and merge it.
- [x] Implement M7 PR A, the household refactor (steps 1 to 3): challenger
      review, then open it stacked on the plan PR (merged as #35 and #37).
- [x] Implement M7 PR B, couples (steps 4 to 10): challenger review, then
      open it stacked on PR A (merged as #39).
- [x] Owner verifies and merges the M7 PRs.
- [ ] Approve the inflation in the views plan.
- [ ] Implement inflation in the views (steps 1 and 2), then open it for
      verification.
- [ ] Approve the M8 step-by-step plan (plan PR), including the seven owner
      decisions. The owner also checks the new tax values (the brackets, the
      low income tax offset, the Medicare levy thresholds and the legislated
      15% and 14% rates) against the ATO before the M8 PRs merge.
- [ ] Implement M8 PR A, tax as data and take-home pay shown (steps 1 to 6):
      challenger review, then open it stacked on the plan PR.
- [ ] Implement M8 PR B, the working-year cash flow (steps 7 to 13):
      challenger review, then open it stacked on PR A.
- [ ] Owner verifies and merges the M8 PRs.
