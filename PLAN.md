# Plan

This is the living plan for building the Australian FIRE Planner. It is
written against [`requirements/REQUIREMENTS.md`](requirements/REQUIREMENTS.md)
and the [desktop mockups](requirements/mockups/README.md).

**Current status:** M0 to M6, the colour scheme, the one-page Results, cash drawn last, the salary growth default and Start over from the logo are done. M7 (couples) is implemented: the household refactor (PR A) is merged and the couples change (PR B) is in review.

| Part | Contents | Status |
| --- | --- | --- |
| 1 | Order in which the requirements are delivered | Agreed |
| 2 | Tech stack, architecture and testing approach | Agreed |
| 3 | Milestone plans: how each milestone is delivered, then a step-by-step plan per milestone | M0–M6 and the side plans done. M7 implemented; PR B in review |

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

Also in M8 (from the cash drawn last review): while working, after-tax salary pays living expenses, dated expenses and contributions. A surplus is saved to cash; a gap is drawn in the usual order.

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

### M7 · Couples: step-by-step plan

**Status:** plan, awaiting the owner's approval. As with M6, the owner
asked for the plan PR and the implementation to be opened stacked on each
other. The plan is still reviewed first, and the implementation follows
any change to it.

**Goal:** a plan can be for one person or a couple. Each partner has
their own age, retirement age, salary, super and super access age. Every
rule built so far (salary, employer super, contributions, preservation,
the bridge) applies to each person separately, and the household's money
is projected together.

**Requirements in scope:**
- **IN-1:** one person or a couple.
- **IN-6:** super contributions and access rules per person. Tax arrives
  per person in M8 and caps in M11.
- **IN-3:** a target retirement age per person. Partners may retire at
  different ages.
- **IN-4:** for a couple, the plan runs until the younger partner reaches
  the plan-until age.
- **EXP-2:** the rest of it, an interim amount while only one partner has
  retired.
- **IN-14, part:** a portfolio's owner, either partner or both with a
  percentage split.
- **FIRE-3:** the earliest retirement age per person.
- **FIRE-4, for couples:** each partner's super opens at their own access
  age.

**Out of scope:**
- **Personal income tax and take-home pay (M8).** Until then, working
  years still assume pay covers living expenses, so nothing is drawn from
  savings.
- **Tax on a portfolio by ownership (M8, M9).** M7 stores and shows the
  owner, and uses it only to decide when contributions stop.
- **More than one portfolio (M9).**
- **Coast FIRE for each partner's super separately.** The COAST-3 card
  keeps one combined super figure. See the follow-ups.
- **Per-person columns in Year by year,** and the "Find my earliest
  feasible age instead" checkbox from mockup 01 (follow-ups).

**Two implementation PRs, stacked on this plan PR.** Principle 5 in
part 1 and CLAUDE.md both keep refactors apart from behaviour changes, so
M7's implementation is split:
- **PR A, internal refactor** (steps 1 to 3): the engine projects a
  household made of a list of people. With one person it gives exactly
  the same results as today, and every existing test and worked example
  is unchanged. Its base is this plan PR.
- **PR B, behaviour change** (steps 4 to 10): couples. Its base is PR A.

Each PR goes through the challenger review (see "How each milestone is
delivered") before it's opened.

**Definition of done:**
- **Household:** a "Just me / A couple" toggle. A couple has two person
  cards, each with an optional name, current age, target retirement age
  and "Super accessible at".
- **Income & expenses:** salary is entered per person. For a couple
  there's also "Drawn from savings while one of you is retired".
- **Assets:** super is entered per person. For a couple, the portfolio
  has an owner (either person, or joint with a split).
- **Results** covers the household:
  - Every age shown names both partners, e.g. "Alex 52 · Sam 50".
  - "Earliest retirement" shows each person.
  - The milestones show each person's retirement and super access.
  - Year by year has an "Ages" column and a "One retired" band.
- **The examples:** worked examples D, D2 and E below match to the cent.
  Every single-person example from M2 to M6 is unchanged.
- **Checks:** `npm run check` and `npm run test:e2e` pass, and CI is
  green.

#### Design decisions for M7

**The household timeline** (IN-4, IN-3):
- **Rows** run from today until the **younger** partner reaches the
  plan-until age. Each row has each person's age.
- **Retirement:** each person works up to and including their own
  retirement age, as now.
- **The household phase** of a row is:

  ```
  working        everyone is working
  oneRetired     at least one person has retired, but not everyone
  retired        everyone has retired
  ```

- **Two named points** replace the single retirement age downstream:
  - **the first retirement row:** the last row before anyone is retired.
    The bridge starts after it;
  - **the household retirement row:** the last row anyone works. The FI
    number "at retirement", Coast FIRE's target and "when you've both
    retired" refer to it.

  With one person, both are today's retirement row.

**What is drawn from savings each year** (EXP-2):
- **Working** years draw dated expenses only, as now.
- **Retired** years draw retirement spending, as now.
- **oneRetired** years draw the **interim amount**: "Drawn from savings
  while one of you is retired", in today's dollars, grown by inflation.
  **Default:** $0 if the partner who retires later has a salary above $0
  (their pay is assumed to cover spending, the same assumption as working
  years until M8); otherwise the household's retirement spending, because
  nothing else would pay for it. If both retire in the same year there are
  no such years and the default doesn't matter. Entering $0 is respected,
  and Results then shows an info note when the later partner has no salary.
  **Owner decision 1** below.
- **Dated expenses** are added in every phase.

**Super per person** (IN-6, SUPER-1, IN-5): each person's super runs
exactly as M5 and M6 built it, with that person's age, retirement age,
salary and access age. The household totals in each row are the sums.

**Drawing order:** the portfolio first, then super, then cash, as now.
Only super that is accessible can be drawn. When both partners' super is
accessible, each pays in proportion to its available balance that year.
**Owner decision 2.** With one person this is exactly today's rule.

**Portfolio ownership** (IN-14, part):
- **Owner:** a portfolio is owned by Person 1, by Person 2, or jointly
  with a percentage split. The split must add to 100%.
- **Default:** sole ownership by Person 1 for one person, joint 50/50 for
  a couple.
- **Its only effect in M7 is when contributions stop:**
  - **Unset stop age:** contributions continue while any owner is still
    working. A joint portfolio stops when you've both retired.
  - **Set stop age:** it's measured on the first owner's age (Person 1
    for a joint portfolio), and the label names that person ("Alex's
    age").
  - **Engine form:** `{ kind: "whileWorking", personIds }` or `{ kind:
    "throughYear", year }`.

  With one person, both are exactly today's rule. Tax by ownership comes
  in M8/M9.

**The bridge for a couple** (FIRE-4):

```
 both working ──► first retires ── bridge ──► first super opens ── after access ──► end
                   (row F)                     (row A: min over the
                                                partners' effective
                                                access years)
```

- **The bridge** runs from the first retired row to the year before
  **either** partner's super first opens (effective access, per person,
  as in M6). **Owner decision 3.** Only partners who have super count.
  An empty account (no balance and no contributions) never "opens", so it
  can't end the bridge early. If no one has super, there is no bridge
  check, as in M6.
- **Bridge need:** spending less any portfolio contributions still paid
  in those years, discounted at the portfolio's return to row F − 1.
  Contributions continue while a partner works, so without netting them
  the need would overstate the gap. For one person with the default stop
  age, no contributions are paid in the bridge, so M6's figures are
  unchanged.
- **After access:**
  - **need:** discounted at the partners' after-tax super returns,
    weighted by their super balances at the row before access;
  - **projected:** both partners' super, plus portfolio and cash. When a
    partner's super is still locked at the start of after access, the
    breakdown shows that balance on its own line, marked "locked until
    {age} ({year})". The meter then can't look healthier than the early
    after-access years really are.
- **The status stays exact,** from shortfalls.
- **"Super locked" wording for a couple** names each person whose super
  has a balance but can't be drawn yet, e.g. "Alex's super locked until
  65 (2036)".

**FI number and Coast FIRE:**
- **The FI number** stays one household figure. "At retirement" means the
  household retirement row: "$3,686,887 in 2046, when you've both
  retired".
- **Coast FIRE** coasts to the household retirement row.
  - **What stops:** both partners' voluntary contributions; both
    employers keep paying while each works.
  - **Paid along the coast path:** interim amounts before that row, like
    dated expenses. The super-only coast run (`superAtRetirementWhenCoastingFrom`)
    zeroes interim spending as well as dated expenses, so an older
    partner's super isn't drawn on the coast path.
  - **"Reached"** stays exact, decided by re-running the projection.
- **The super-and-outside split card** keeps one combined super figure.

**Earliest retirement** (FIRE-3): one search per person. Each person's
retirement age is moved while the partner's stays at their target. Each
answer is the first age at which the money lasts to the end. If
contributions stop when owners retire, the stop follows the age being
tried, as now.

**Names:** each person has an optional `name` ("Alex"). Labels use the
name, or fall back to "Person 1" / "Person 2". `PerPersonFields` already
adds the name to field labels when there are two people.

**Adding and removing a partner:**
- **"A couple"** adds Person 2 with nothing set. Their ages become
  required inputs ("Person 2: current age").
- **"Just me"** removes Person 2 and their data. A joint portfolio goes
  back to Person 1. The hint under the toggle says this, since there's no
  undo until M16.

**Wire format:** every new field is optional, so the document stays at
version 1 and plans saved before M7 load unchanged:
- `people[].name`;
- `expenses.interimAnnualDollars`;
- `portfolios[].ownership`: `{ kind: "sole", personId }` or `{ kind:
  "joint", shares: [{ personId, percent }] }`.

**Year by year:**
- **Ages:** one "Ages" column reading "52 · 50" (column header "Alex ·
  Sam").
- **Money columns** stay household totals.
- **Bands:**
  - "One retired · Sam working" starts the oneRetired years;
  - the M6 bands follow: "Bridge · super locked", then "Super accessible".

**Results wording:** wherever a single "age N" appears, a couple shows
"Alex N · Sam M":
- in the tiles;
- in the milestones;
- in "Money runs out";
- in the breakdown lines.

The engine's explanation lines take the people's display names from the
projection inputs, so this is done once.

#### Owner decisions to confirm in review

1. **The interim amount defaults to $0 if the partner who retires later
   has a salary, otherwise to the retirement spending.** The owner chose
   this rule on 2026-10-23, after the PR B review (the first draft always
   defaulted to $0).
   - **Why:** a working partner's pay covers spending, as in working years
     until M8 brings take-home pay; with no salary nothing would pay, and
     $0 would quietly under-state the need.
   - **The field and Results:** the field's default text and hint show which
     applies; Results shows an info note only when $0 is *entered* and the
     later partner has no salary.
   - **In M8:** this becomes a spending level that take-home pay helps
     fund.
2. **Super is drawn in proportion to each accessible balance.**
   - **The alternative:** the older partner's first. It's simpler, but
     arbitrary.
   - **In M10:** minimum drawdowns will refine this.
3. **The couple's bridge ends when the first partner's super opens.**
   - **Why:** "bridge" keeps meaning "outside super only". Years when one
     partner's super is still locked show up as exact after-access
     shortfalls, with that partner named.
   - **The alternative:** end the bridge when the last partner's super
     opens.
4. **Two implementation PRs,** a refactor and then the behaviour change,
   rather than the single follow-on PR asked for. Principle 5 and CLAUDE.md
   keep refactors separate.

#### Worked examples

These were checked with an independent script, not the app's code. They
become fixtures in `tests/worked-examples/m7-couples.json`. The start
year is 2026. D and D2 use 0% for every rate, so they can be checked by
hand.

**Regression:** M6's example A run as a one-person household gives
exactly M6's figures, for example a bridge need of $978,216.63 against
$2,999,659.13 projected. All of M2–M6's worked examples are unchanged.

**D: a couple, bridge met.**
- **Inputs:**
  - **Alex:** 55, retires at 56, super $150,000, access at the default 65.
  - **Sam:** 53, retires at 58, super $100,000, access at 60.
  - **Household:** plan until 66, so the plan runs until Sam is 66, in
    2039 (Alex is 68).
  - **Money:** portfolio $200,000, joint, no contributions. No cash.
  - **Spending:** retirement $40,000; interim $20,000.
- **Phases:** working 2026–2027, oneRetired 2028–2031 (Alex retired,
  Sam working), retired 2032–2039.
- **Effective access:** Alex 65 (2036), Sam 60 (2033). The first super
  opens in 2033.
- **The bridge** is 2028–2032:
  - **need** $120,000 (4 × $20,000 + $40,000);
  - **projected** $200,000;
  - **MET**.
- **After access** is 2033–2039:
  - **need** $280,000;
  - **projected** $330,000 ($80,000 portfolio + $150,000 + $100,000
    super);
  - **MET**.
- **The portfolio** pays until 2034.
- **Sam's super** pays 2035 ($40,000, leaving $60,000).
- **2036, pro rata:** Alex's super is now open too, so $40,000 comes
  from Alex $150,000 and Sam $60,000 in proportion. That leaves Alex
  $121,428.57 and Sam $48,571.43.
- **The end:** in 2039 Alex has $35,714.29 and Sam has $14,285.71. The
  money lasts.
- **Earliest retirement:**
  - **Alex:** 55 (2026), with Sam retiring at 58;
  - **Sam:** 56 (2029), with Alex retiring at 56.
- **Interim amount with $0 entered:** the bridge need is $40,000, and
  after access is projected at $410,000.

**D2: bridge short, with both partners' super locked.** D with Sam's
access at the default 65.
- **Effective access:** Alex 2036, Sam 2038. The first super opens in
  2036.
- **The bridge** is 2028–2035:
  - **need** $240,000;
  - **projected** $200,000;
  - **SHORT** in 2035, by $40,000. Both partners' super is locked, so
    the wording names both: "Alex's super locked until 65, Sam's until
    65".
- **After access** is 2036–2039:
  - **need** $160,000;
  - **projected** $250,000;
  - **MET**.
- **Earliest retirement:**
  - **Alex:** 58 (2029), with Sam retiring at 58;
  - **Sam:** 60 (2033), with Alex retiring at 56.

**E: realistic.**
- **Inputs:**
  - **Alex:** as in M6's example A. 34, retires at 50, salary $145,000
    growing at inflation + 1%, super $185,000, salary sacrifice $10,000
    a year 2027–2042, access 65.
  - **Sam:** 32, retires at 52, salary $110,000 with no growth, super
    $120,000, access 60.
  - **Money:** portfolio $100,000 joint, contributions $20,000 a year
    with the default stop (2046, when you've both retired). Cash $20,000.
  - **Spending:** retirement $90,000; interim $50,000.
  - **Rates:** inflation 2.5%, return 7%, interest 4%, super return 7%,
    plan until 95.
- **Rows:** run to 2089, when Sam is 95 and Alex 97. That's 64 rows.
- **Phases:** oneRetired 2043–2046, retired from 2047.
- **The FI number** at the household retirement (2046) is $3,686,886.99
  nominal. FI isn't reached.
- **The bridge** is 2043–2053, until Sam's super opens in 2054:
  - **need** $864,875.22, which is net of $67,744.23 of contributions
    paid 2043–2046;
  - **projected** $890,437.07;
  - **MET**.
- **After access** is 2054–2089:
  - **need** $3,626,576.69;
  - **projected** $3,439,371.73;
  - **SHORT** 2086–2089.
- **Money runs out** in 2086 (Alex 94, Sam 92).
- **Earliest retirement:** Alex 52 (2044), Sam 54 (2048).

#### Step 1 · Rows carry each person (PR A)

- [x] Done

**Kind:** internal refactor. No behaviour change.

**As built:**
- `ProjectionInputs.people` and `ProjectionRow.people` are non-empty lists
  (`NonEmptyList<T>`, a `[T, ...T[]]` tuple), so `people[0]` needs no
  undefined check. `mapNonEmpty` keeps them non-empty when they are rebuilt.
- `PersonYear` has `personId`, `age`, `phase` (`working` | `retired`), the
  salary and super flows, `fromSuper`, `superClosing` and `superAccessible`.
  The household fields on the row are the sums, added in person order from 0
  so one person's figures are bit-for-bit the same as before. The row's
  `superAccessible` is "anyone's super can be drawn", and
  `isShortfallWithSuperLocked` is "a shortfall while some person has a locked
  balance".
- `endAge` is the age the **youngest** person has in the last row. Helpers
  beyond the three named in the step: `youngestAgeAtRow` (the engine's way to
  say "stop the projection at row n"), `lastPortfolioContributionYear`
  (Coast FIRE pulls the stop earlier without losing the rule's own limit) and
  `inputsWithRetirementAge` (one person's age changed, for the search).
- Drawing is pro rata (`drawSuperProRata`): a person's share is computed as
  `balance / total` before multiplying, so a lone person pays exactly the
  whole draw.
- `oneRetired` rows draw no retirement spending yet; the interim amount is
  step 5. The Year by year band map gained a placeholder `oneRetired` text so
  it type-checks; the real wording is PR B.
- The stop rule is mapped in `summariseProjection` (not in
  `resolvePlanInputs`, which is step 2): a stop age left unset
  (`source === "default"`) becomes `whileWorking` on the first person, an
  entered one becomes `throughYear` (start year + stop age − current age).
  Because `whileWorking` follows the retirement ages by itself,
  `EarliestRetirementInputs` and its `contributionsStopAgeFollowsRetirementAge`
  flag are gone: the search takes plain `ProjectionInputs`.
- Single-person assumptions that remain, to be replaced in step 5 and noted
  in each module's header: `findEarliestRetirementAge(inputs, startYear,
  personIndex = 0)` searches one person (step 2 calls it per person); the
  bridge takes the access age and super return of the person whose super
  opens first and the first retirement row; the coast split places its $1
  test dollar of super with the first person who has super; the explanation
  lines quote `people[0]`'s age.
- `src/engine/testing/onePersonInputs.ts` has `onePersonInputs(settings,
  startYear)` (flat one-person settings to `ProjectionInputs`, a
  `contributionsStopAge` becoming `throughYear`) and `withFirstPerson`. Test
  data was moved into `OnePersonSettings` objects; no expected value
  changed. New tests: household fields equal the sums over `people`, ages and
  row count, the three phases, the stop rule with several owners, pro rata
  and locked-partner drawing, and the household helpers.
- Checks: `npm run check` (775 unit tests, up from 762) and `npm run
  test:e2e` (38) pass.

1. **Per-person rows.** `ProjectionRow` gains `people: PersonYear[]`,
   each holding:
   - `personId`, `age` and `phase`;
   - `salary`;
   - the super flows (`employerContribution`, `salarySacrifice`,
     `nonConcessional`, `contributionsTax`, `superOpening`,
     `superEarnings`, `superEarningsTax`, `fromSuper`, `superClosing`);
   - `superAccessible`.

   The household fields stay, and become the sums.
2. **Inputs.** `ProjectionInputs` takes `people: ProjectionPerson[]` in
   place of the top-level `currentAge`, `retirementAge`, `salary` and
   `superAccount`. Each person has `id`, `label`, `currentAge`,
   `retirementAge`, `salary?` and `superAccount?`. The loop runs super
   per person.
3. **Drawing.** Accessible super is drawn pro rata, as in decision 2.
4. **The row's age and phase.**
   - Remove `row.age`. Readers use `row.people[i].age`.
   - The row's `phase` becomes the household phase type (`working`,
     `oneRetired`, `retired`). With one person, `oneRetired` can't occur.
5. **Contributions stop.** The portfolio's contributions stop becomes
   `{ kind: "whileWorking", personIds } | { kind: "throughYear", year }`.
6. **Helpers** in `projection.ts`:
   - `firstRetirementRowIndex(inputs)`;
   - `householdRetirementRowIndex(inputs)`;
   - `effectiveSuperAccessAge(person, inputs, startYear)`, per person.
7. **Every engine module reads through these,** so nothing assumes one
   person: solvency, earliest retirement, Coast FIRE, the bridge, the
   coast split and `summarisePlan`. `effectiveSuperAccessAge` callers pass
   the person.
8. **Tests:**
   - Existing tests change only where types force it (building inputs
     through a test helper `onePersonInputs(...)`).
   - Every expected value stays the same.
   - Add a test that the household fields equal the sum of `people`.

**Check:** `npm run check` and `npm run test:e2e` pass, and no worked
example changes.

#### Step 2 · Resolve and summarise every person (PR A)

- [x] Done

**Kind:** internal refactor.

**As built:**
- `ResolvedProjectionInputs.people` is a non-empty list of `ResolvedPerson`
  (id, label, both ages, salary and growth, super account, access age, each
  `Sourced`). The household-wide values stay beside it, plus
  `portfolioOwnerIds` (the first person until ownership is stored in step 4).
- Missing-input checks run per person. With one person the labels are word
  for word as before; with several each is prefixed ("Sam: Current age").
  The plan-until age is checked against the youngest person, and each
  retirement age against that person's own last age (plan-until age plus how
  much older than the youngest they are). When a person's current age is
  unknown, their retirement age is compared with the plan-until age itself,
  as before. Order of messages for one person is unchanged.
- The stop-age mapping stays in `summariseProjection`, not in
  `resolvePlanInputs`: turning a stop age into a calendar year needs the
  start year, which resolution doesn't have, and adding it would change every
  caller. Resolution supplies the owners (`portfolioOwnerIds`) and the stop
  age; `summariseProjection` makes `whileWorking` / `throughYear` from them,
  measuring an entered stop age on the first owner.
- `ProjectionSummary.people: PersonSummary[]` (id, label, `retirementAge`,
  `retirementYear`, `superAccessAge?`, `earliestRetirement`) replaces the four
  single fields, and `householdRetirementYear` is new. `findEarliestRetirementAge`
  runs once per person. `assessSolvency` and the UI read `people[0]`; the fire
  chart's retirement marker and the Coast FIRE "in {year} dollars" line use
  `householdRetirementYear` (the same year with one person).
- The investable amount's super line is the sum of the people's balances
  (one person keeps their own figure and source).
- Tests: the resolve and summary tests read `people[0]` where the fields
  moved (no expected value changed), plus new tests for two people in
  resolution (order, owner, labels, per-person end-age check) and in the
  summary (one entry per person, household retirement year).
- After the challenger review of PR A: `drawSuperProRata` gives the last
  payer the exact remainder (no false shortfall from rounding);
  `BridgeAssessment.effectiveAccess` is `{ personId, personIndex, age }` and
  only people who have super (a balance or a contribution in some row) are
  considered; the FI number and Coast FIRE tiles state the household
  retirement year with the first person's age in it;
  `contributionsStopAge` resolves to `Sourced<number | undefined>`
  (`undefined` with source "default" means while the owners work);
  `findEarliestRetirementAge` throws a `RangeError` for a person that isn't
  there. `src/engine/couple.test.ts` pins examples D and D2 (interim $0 entered).
- Checks: `npm run check` (779 unit tests) and `npm run test:e2e` (38) pass.

1. **Resolve every person.** `resolvePlanInputs` resolves every person
   into `ResolvedPerson[]`, each with:
   - ages, salary, salary growth, super account and access age;
   - each `Sourced` value as now.

   The missing-input checks run per person. With one person, the labels
   stay word for word ("Current age").
2. **Contributions stop.** It resolves to the engine form in decision
   "Portfolio ownership". With no ownership stored, the portfolio is
   owned by Person 1, which gives today's rule.
3. **The summary.** `ProjectionSummary` gains `people: PersonSummary[]`,
   each with `id`, `label`, `retirementAge`, `retirementYear`,
   `superAccessAge?` and `earliestRetirement`.
   - The single `retirementAge`, `retirementYear`, `superAccessAge` and
     `earliestRetirement` fields go.
   - Add `householdRetirementYear`.
4. **The UI** reads `people[0]` where it read the single fields, so
   nothing visible changes.

**Check:** `npm run check` and `npm run test:e2e` pass, with the same
screenshots and figures.

#### Step 3 · Challenger review of PR A, then open it

- [x] Done

**As built:** the reviewer ran the old and new `summarisePlan` side by
side on 9,000 random one-person plans. They were identical, except for:
- **a missing-input message** that had disappeared (fixed, with a
  regression test);
- **a signed zero:** a "−$0" that can no longer occur.

It also found that pro rata drawing could leave a 1e-12 false shortfall
for a couple. That's fixed: the smallest balance pays the exact
remainder, and a property test checks it. The plan refinements are in the
M7 design: empty super never opens, the youngest-person plan-until rule,
interim spending left out of the coast super run, and locked super
flagged in the after-access breakdown. Other fixes: an empty account no
longer ends the bridge, the tiles use the household retirement year, and
there are two-person engine tests for D and D2.

1. **Review:** the reviewer subagent checks PR A's diff (see "How each
   milestone is delivered"). It looks especially for any place still
   assuming one person, and any behaviour change.
2. **Fix and open:** fix the findings, then open PR A, stacked on the
   plan PR.

#### Step 4 · Couples in the plan, reducer and wire format (PR B)

- [x] Done

**Kind:** behavior change, from here on.

**As built:**
- `Person.name?`, `Plan.expenses.interimAnnual?` and `Portfolio.ownership?`
  (`PortfolioOwnership`: `sole { personId }` or `joint { shares: [{ personId,
  fraction }] }`). In memory the shares are fractions; on the wire they are
  `percent`, converted by `ownershipToWire` / `ownershipFromWire`.
- Wire: `people[].name`, `expenses.interimAnnualDollars` and
  `portfolios[].ownership`, all optional, so the document stays at version 1.
  The schema rejects a joint split with fewer than two shares or shares that
  don't add to 100 (within 1e-9), rather than repairing it. Plans saved before
  M7 load with none of the new fields. Fixture:
  `tests/fixtures/plan-documents/v1-couple.json`. The mapping property test
  now generates names, a partner, the interim amount and ownership.
- Reducer: `addPartner { id }` (label "Person 2", ignored at two people),
  `removePartner` (drops Person 2; sole-Person-2 and joint ownership go to
  sole Person 1, other ownership is untouched; ignored with one person),
  `setPersonName` (trimmed; empty clears), `setInterimSpending`,
  `setPortfolioOwnership`.
- Decision not in the plan: `setPortfolioOwnership` **ignores invalid
  ownership** (a person not in the plan, a joint split with fewer than two
  shares, a negative share, or shares not adding to 100%), because the stored
  document would reject it and a save would then fail. The Household screen
  (step 6) must show the error and not dispatch until the split is valid.
- `displayName(person, index)` is in `src/plan/displayName.ts`; an empty or
  spaces-only name counts as unnamed.
- Resolution does not read the new fields yet; that is step 5.

1. **Plan types:**
   - `Person.name?`;
   - `Plan.expenses.interimAnnual?`;
   - `Portfolio.ownership?`.
2. **Actions:**
   - `addPartner { id }`: adds "Person 2". Ignored if there are already
     two people.
   - `removePartner`: removes Person 2, and a joint or Person 2 ownership
     goes back to Person 1.
   - `setPersonName`;
   - `setInterimSpending`;
   - `setPortfolioOwnership`.
3. **Wire:** the fields in "Wire format" above, with mapping tests and a
   fixture, `tests/fixtures/plan-documents/v1-couple.json`. A saved
   single-person plan still loads unchanged.
4. **`displayName(person, index)`:** returns the name, or "Person N".

**Check:** `npm run check` passes.

#### Step 5 · The engine for couples (PR B)

- [x] Done

**As built:**
- Resolution: `ResolvedPerson.label` is the display name; `interimAnnual`
  (default per owner decision 1, `defaultInterimSpending`; $0 for one person) and `portfolioOwnerIds` come from
  the plan. Ownership resolves to person ids in the plan's order: sole is that
  person, joint is everyone in the split, nothing stored is Person 1 for one
  person and both for a couple, and an id not in the plan counts as Person 1.
  The first owner measures an entered stop age. One-person messages are word
  for word as before; a couple's read "Sam: Target retirement age must be at
  or after Sam's current age", "Plan until age must be after the younger
  person's current age" and "Sam: Target retirement age must be before the end
  of the plan, when Sam is 95".
- Engine: `ProjectionInputs.interimSpendingAnnual?` (absent is $0) is drawn,
  indexed, in `oneRetired` years. `PersonYear.label` carries the display name;
  `describeAges(row)` / `formatAges` give "age 52" for one person and
  "Alex 52 · Sam 50" for a couple, used by every engine line that quotes an
  age (FI reached, solvency, Coast FIRE, coast split, earliest retirement).
  `Solvency.runsOut` has `ages` (label and age for each person).
- Bridge: the need is net of portfolio contributions paid in the bridge years
  (a "Less portfolio contributions paid in those years, discounted" line, only
  when there are some, so one-person lines are unchanged; the need is never
  below $0). The after-access discount rate is each holder's after-tax super
  return weighted by balance at the row before access (one person's rate
  exactly). With two or more people who have super, the projected working has
  one line each, and a partner still locked at the start of after access is
  marked "locked until {age} ({year})". `assessSolvency` takes one access age
  or one per person, and names each locked partner.
- Coast FIRE and the coast split zero interim spending in their super-only
  runs. Earliest retirement runs per person; a couple's lines say "Sam
  retiring at 54".
- Fixture `tests/worked-examples/m7-couples.json` has D and D2 (with interim
  $20,000 and with $0 entered) and E. **Every worked figure matched on the
  first run**, including E's FI number $3,686,886.99, bridge need $864,875.22
  and after-access need $3,626,576.69. The test harness reads a partner, the
  interim amount, per-person earliest retirement and per-row super figures.
- Property tests (`couple.properties.test.ts`): an empty partner with the same
  ages gives the first person's projection exactly; swapping the people
  doesn't change household totals; money is conserved each year.

1. **Resolving a couple:**
   - Person 2's ages become required ("Sam: current age").
   - The plan-until checks, as PR A built them: the plan-until age must
     be after the **youngest** person's current age, and each person's
     retirement age must be before **their own** last age in the plan.
     That is the plan-until age plus how much older they are than the
     youngest.
   - Messages for a couple read naturally, e.g. "Sam: Target retirement
     age must be at or after Sam's current age".
2. **The projection:**
   - rows run until the younger partner reaches the plan-until age;
   - interim spending in `oneRetired` years;
   - the default contributions stop is from ownership.
3. **The bridge for couples,** as designed:
   - starts at the first retirement row;
   - ends at the first partner's access;
   - the need is net of contributions;
   - the after-access discount rate is weighted by balance;
   - the locked-super wording names each person.
4. **Earliest retirement:** one search per person.
5. **Coast FIRE** targets the household retirement row. Its super-only
   run zeroes interim spending too (see the design).
6. **Explanation lines** name both people's ages.
7. **Tests:**
   - worked examples D, D2 and E as fixtures, with tests to the cent;
   - all M2–M6 fixtures unchanged.
8. **Property tests:**
   - a couple whose second person has no money, no salary and the same
     ages and retirement as the first gives the first person's
     single-person projection;
   - swapping the order of the people doesn't change any household total;
   - money is conserved each year: opening + growth + contributions −
     drawn = closing.

   Run the new property files several times.

**Check:** `npm run check` passes.

#### Step 6 · Household screen (PR B)

- [x] Done

**As built:**
- New `HouseholdSection` (the "Household" card): a `SegmentedToggle`
  "Just me / A couple" with a hint. "A couple" dispatches `addPartner` with an
  id from `usePlanIdGenerator()` (new; `PlanProvider` takes an optional
  `generateId`, default `crypto.randomUUID`, and `renderSection` passes one in
  tests). "Just me" dispatches `removePartner`; the hint then says it removes
  Person 2 and their data, that a shared portfolio goes back to Person 1, and
  that there is no undo yet.
- `PersonAgesSection` now covers both cases. One person: the same single
  "About you" card as before (labels word for word), plus a "Name (optional)"
  field with the hint "Used for labels only." A couple: a card for each person
  (titled by name or "Person N") in a `.person-cards` grid (two columns when
  there is room, one on a narrow screen), then a "Planning horizon" card with
  "Plan until age" and the note "The plan runs until {younger} reaches this age:
  {N} years, to {year}." (year from `usePlanStartYear`; left out until someone
  has an age). A couple's age labels are prefixed with the display name
  ("Alex: Current age"); the name field uses the fixed "Person 1: Name
  (optional)" so its label doesn't change as the name is typed. Names are
  saved trimmed through `setPersonName`. The couple's hints say "Only age is
  stored..." and "...if they will have retired by then".
- `PerPersonFields` now prefixes with `displayName(person, index)` (the name,
  or "Person N") instead of the plan's `label`; the three existing tests that
  named people through `label` now set `name` too.
- The cards sit in a `.household-stack` grid with a gap, which also puts a gap
  between the toggle card and "About you" for one person.
- Screenshots (desktop and 375px, no horizontal scroll) were checked by eye
  against mockup 01; the planning-horizon card shows the note under the field
  rather than beside it, and the mockup's "Find my earliest feasible age" and
  "What is preservation age?" extras are not built (follow-ups).

1. **`HouseholdScreen`:**
   - a "Household" card with a `SegmentedToggle`, "Just me / A couple",
     and the hint about removing Person 2;
   - one card per person, side by side on wide screens: "Name
     (optional)", "Current age", "Target retirement age" and "Super
     accessible at";
   - "Planning horizon" with "Plan until age". For a couple it adds the
     note "The plan runs until {younger} reaches this age: {N} years, to
     {year}."
2. **Component tests** for each card, and for adding and removing a
   partner.

**Check:** `npm run check` passes. Check by eye against mockup 01.

#### Step 7 · Income, expenses and assets (PR B)

- [x] Done

**As built:**
- `InterimSpendingSection` (own card, "Spending while one of you has
  retired", after "Spending in retirement", couple only) holds "Drawn from
  savings while one of you is retired". Its default depends on the later
  partner's salary (owner decision 1, `defaultInterimSpending` in
  `src/plan/interimDefault.ts`, shared with resolution): "$0", or for no
  salary "$40,000, the same as retirement spending, because Sam has no
  salary"; the hint explains both. `ResultsScreen` shows an info note only
  when $0 is entered, one-retired years exist and the later partner has no
  salary. Tests that expect the $0 figures enter $0 (D and D2 "with $0
  entered").
- New shared `OwnershipField` (`src/ui/components/OwnershipField.tsx`): a
  `SegmentedToggle` with each person's display name and "Joint"; Joint shows
  a `PercentField` "{Person 1}'s share" (0 to 100%, an out-of-range value
  shows the field's inline error and is never reported) and the other share
  as calculated text ("Sam 40%"; the second share is `1 − first`, rounded so
  the two add to exactly 1). Unset shows joint 50/50 as a default; clearing
  the share goes back to unset. It renders nothing for one person.
- `PortfolioSection` shows it for a couple. "Contributions stop at age" becomes
  "Contributions stop at {first owner}'s age" for a couple (the first owner is
  Person 1 for joint) and its default reads "when you've both retired" (joint)
  or "when {name} retires" (sole), via a new `defaultText` on `AgeField` and
  the now exported `resolveOwnerIds`. The default text only shows once that
  owner's target retirement age is set (the field has no default before then,
  as before). One-person wording is unchanged.
- Salary and super already used `PerPersonFields`, which has used display
  names since step 6; labels are "Alex: Gross salary per year" and so on for a
  couple, and plain for one person (existing tests cover both).
- Screenshots: couple Income & expenses and Assets, checked by eye.

1. **Income & expenses:**
   - salary per person already uses `PerPersonFields`; check that the
     labels use names;
   - add "Drawn from savings while one of you is retired" (couple only),
     with a hint explaining the $0 default.
2. **Assets:**
   - super per person already uses `PerPersonFields`; check the names;
   - the portfolio gains `OwnershipField` (Part 2's component map) for
     couples: "Alex", "Sam" or "Joint", with Alex's percentage when
     joint;
   - "Contributions stop at age" names the person it's measured on, and
     its default text says "when you've both retired" or "when Alex
     retires".
3. **Tests:** component tests; `OwnershipField` rejects a split that
   isn't 0–100%.

**Check:** `npm run check` passes.

#### Step 8 · Results for a couple (PR B)

- [x] Done

**As built:**
- No UI copy of the formatter: the engine's `formatAges` / `describeAges`
  are used, and the engine now carries `ages` (`PersonAge[]`: label and age)
  on `FiMilestone`, `CoastPathPoint`, `CoastMilestone`, `CoastSplitMilestone`
  and `Solvency.runsOut`, with `agesOf(row)` to build them. The UI only adds
  `capitaliseFirst` to start a line with "Age 46".
- Tiles: FI number "$3,686,887 in 2046, when you've both retired"; Earliest
  retirement "Alex 52 · Sam 54" with "Alex 2044 · Sam 2048" and "Targets: Alex 50
  (2042) · Sam 52 (2046)" (the breakdown joins each person's lines); Coast FIRE
  "Not before you've both retired (2046)" or "Reached in {year}, at {ages}";
  Money lasts "Runs out at Alex 94 · Sam 92" and, when it lasts, "To Sam 95 ✓"
  (the younger person's name); the runs-out banner names both ages.
- Milestones: a couple has "{name} retires (target)" and "{name}'s super
  accessible" for each person (access only for people who hold super), each
  with both ages in that year; FI, Coast and money lasting use both ages.
- Year by year: the Age column is headed "Alex · Sam" and reads "52 · 50"; the
  band "One retired · Sam working" starts the oneRetired years; the bridge band
  for a couple reads "Bridge · super locked: Alex until 65 (2036), Sam until 65
  (2038)"; a shortfall year with locked super says "Alex's super locked until
  65 (2036), Sam's until 65 (2038)" (the first names what is locked, the rest
  just whose).
- Bridge section: "No bridge needed: super is accessible when the first of you
  retires" and "{name}'s super isn't accessible until age N, after the plan
  ends in {year}" for a couple. The after-access working lists each partner's
  super, marking a locked one (step 5). The chart tooltips and data tables show
  both ages ("Alex 52 · Sam 50") through an optional `ages` on the chart point,
  set only for a couple.
- Tests: `ResultsCouple.test.tsx` (examples D2 and E: names and both ages in the
  tiles, banner, milestones, bands and the after-access lines; one person
  unchanged). The earlier step 7 test for the FI line was reworded for the
  couple wording. Screenshots of D2 and E (top, bridge, Year by year) were
  checked by eye; E's bridge shows need $864,875, projected $890,437, after
  access need $3,626,577 against $3,439,372, SHORT 2086 to 2089.

1. **A shared formatter** `formatAges(ages, people)`: "Age 52" for one
   person, "Alex 52 · Sam 50" for a couple. Use it everywhere an age is
   shown.
2. **Tiles:**
   - the FI number "in 2046, when you've both retired";
   - "Earliest retirement: Alex 52 (2044) · Sam 54 (2048)";
   - Coast FIRE "Not before you've both retired (2046)".
3. **Milestones:** each person's retirement and super access, plus FI,
   Coast and money lasting, with both ages.
4. **Year by year:**
   - the "Ages" column;
   - the "One retired · {name} working" band;
   - per-person locked-super wording.
5. **Bridge section:** couple wording, and the after-access breakdown
   lists each partner's super.
6. **Tests:**
   - `ResultsCouple.test.tsx` with D2 (SHORT 2035, names in the wording)
     and E (the tile, earliest per person);
   - one-person screens unchanged.

**Check:** `npm run check` passes. Check by eye with D2 and E.

#### Step 9 · E2E, contrast, README and wrap-up (PR B)

- [x] Done

**As built:**
- `tests/e2e/couple.spec.ts` (clock fixed in 2026): chooses "A couple", enters
  D2 (interim $20,000) through the screens; Results shows the bridge SHORT in
  2035 with both names in the tile, banner, Year by year bands and the shortfall
  note; Sam's access at 60 makes it D (both parts MET); a reload keeps Person 2;
  "Just me" removes them and Results is the one-person plan (column "Age", no
  one-retired band). The reload waits for the autosave of the latest edit
  (Sam's access age), not just for a save with two people; the first version
  waited only for the person count and failed 6 of 10 repeats. 10 of 10
  repeats pass.
- `tests/e2e/contrast.spec.ts` gains two sweeps: the couple Household screen
  (names, values, and an inline error) and D2: Income & expenses and Assets for
  a couple, then Results with the one-retired and bridge bands and every
  breakdown open, in both dollar modes.
- README "What it does": the Household choice, names, couples (per-person
  salary and super, interim spending, ownership, pro rata drawing, the couple
  bridge, both ages and earliest retirement for each person, the plan running to
  the younger partner's end age). PLAN.md status and Next steps updated; M7 PR B
  stays open until its review.

1. **`tests/e2e/couple.spec.ts`,** with the clock fixed in 2026:
   - choose "A couple" and enter D2 through the screens;
   - Results shows the bridge SHORT in 2035, with both names;
   - set Sam's access to 60 (that's D): both parts MET;
   - reload: Person 2 is kept;
   - choose "Just me": Person 2 is gone, and Results is the one-person
     plan.

   Run it 10 times.
2. **Contrast sweep:** add the couple Household screen and Results with
   D2.
3. **Finish up:** README "What it does"; PLAN.md status, Next steps and
   "As built" notes.

**Check:** `npm run check` and `npm run test:e2e` pass.

#### Step 10 · Challenger review of PR B, then open it

- [ ] Done

1. **Review:** the reviewer subagent checks PR B's diff against this plan
   and the worked examples.
2. **Fix and open:** fix the findings, then open PR B, stacked on PR A.

#### Follow-ups

- **Per-person columns in Year by year** (each person's salary and
  super), and the "Find my earliest feasible age instead" checkbox
  (mockup 01).
- **Coast FIRE for each partner's super separately** (COAST-3 "per
  person"). It needs a per-person target, so it waits for an owner
  decision.
- **M8: revisit the interim amount** once take-home pay exists (owner
  decision 1).
- **Remember the today's/nominal choice** between visits (from M2).
- **Advanced growth options per asset** (from M4's review; needs a backlog
  requirement).
- **The FY2026–27 rules file,** when published.
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
- [ ] Implement M7 PR B, couples (steps 4 to 10): challenger review, then
      open it stacked on PR A.
- [ ] Owner verifies and merges the M7 PRs.
