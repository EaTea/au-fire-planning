# Requirements: Australian FIRE Planner

## 1. Purpose

This app helps an Australian household (a single person or a couple) plan for
**Financial Independence, Retire Early (FIRE)**. It should answer these
questions:

- How much do we need to be financially independent?
- When will we get there on our current path?
- Once we stop working, will the money last?
- Can we stop contributing now and still get there by a later age (Coast FIRE)?

Answers must reflect how Australia actually works: superannuation you can't
access until preservation age, the tax treatment of shares, property and super,
and the rules for drawing down in retirement.

This document only says **what** the app must do. It doesn't cover how the app
is built or what it looks like. Where it requires visualisations, it says what
each one must show, not how it is designed. Anything intended for later is in the backlog
(§11), not in the requirements.

### 1.1 Terminology

| Term | Meaning in this document |
| --- | --- |
| **Plan** | One household's complete set of inputs: people, assets, liabilities, income, expenses and assumptions. |
| **Person** | An individual in the plan with their own age, salary and super. A plan has one person, or two for a couple. |
| **Scenario** | A plan with one or more assumptions changed, for comparison. |
| **Projection** | The year-by-year simulation of a plan from today to an end age. |
| **FI number** | The portfolio value needed to fund retirement spending until the end age at the chosen drawdown rate. |
| **Outside super** | Assets the household can reach at any age, such as shares, cash and investment property. |
| **Inside super** | Superannuation balances, which the preservation rules restrict. |
| **Bridge period** | The years between retiring early and super becoming accessible (IN-5). Only outside-super assets can fund this period. |
| **Owner-occupied home** | The property the household lives in and owns (the principal place of residence). |
| **Today's dollars** | Values adjusted for inflation back to the current year (real terms). |

### 1.2 Priority

Each requirement is marked **Must**, **Should** or **Could** (MoSCoW):

- **Must**: required for the first usable version.
- **Should**: expected, but the first version can ship without it.
- **Could**: desirable, lower priority.

## 2. Plan inputs

Every value below is something the user can set, and every value is used by the
projection. When the user doesn't set a value, the app uses a documented
default. The user can always see which values are defaults and which they
entered.

### 2.1 People and timeline

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-1 | The user can choose whether the plan is for **one person or a couple**. A couple adds a second person with their own salary and super. | Must |
| IN-2 | For each person, the user can enter their current age. The app doesn't ask for date of birth, to avoid collecting more personal data than it needs. | Must |
| IN-3 | For each person, the user can enter a target retirement age. The app can also work out the earliest feasible retirement age for each person (see FIRE-3). Partners may retire at different ages. | Must |
| IN-4 | The user can enter the age at which the projection ends (life expectancy / planning horizon). For a couple, the projection runs until the younger partner reaches the end age. | Must |
| IN-5 | For each person, the user can set the **age at which super becomes accessible**. **This defaults to 65**, the age at which super is released without any condition of release. The user can lower it as far as their legal preservation age (60 for anyone who hasn't yet reached it; SUPER-1), e.g. if they will have retired by then. | Must |
| IN-6 | For each person, the app calculates tax, super contributions, caps and super access rules separately, as Australian law applies them per individual. | Must |

### 2.2 Income

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-7 | For each person, the user can enter their current gross (pre-tax) salary and an expected annual growth rate. | Must |
| IN-8 | The user can add one-off or time-limited income, such as an inheritance, bonus or part-time work, with a start and end year and the person it belongs to. | Should |
| IN-9 | For each person, the user can model part-time or reduced income after "retirement" (e.g. Barista FIRE). | Could |

### 2.3 Expenditure

Expenses are **after-tax spending**: what the household actually spends. The
app works out the pre-tax income or withdrawals needed to fund them.

| ID | Requirement | Priority |
| --- | --- | --- |
| EXP-1 | The user can enter current annual household living expenses as after-tax spending. | Must |
| EXP-1a | Instead of a single total, the user can enter living expenses in a few rough buckets. The defaults are **childcare**, **food**, **travel**, **medical** and **other**. Total living expenses are the sum of the buckets. | Should |
| EXP-2 | The user can enter expected retirement expenses separately from current expenses, either as an amount or as a percentage of current expenses. For a couple, the change applies once both partners have retired. The user can also set an interim amount for when only one has retired. | Must |
| EXP-3 | By default, all expenses grow with the inflation rate (IN-11) each year. | Must |
| EXP-4 | Beyond the default buckets in EXP-1a, the user can add, rename or remove expense categories (e.g. housing, transport, education). Each category is marked **essential** or **discretionary**. | Should |
| EXP-5 | The user can give any category its own growth rate above or below inflation, e.g. health costs rising faster than CPI. | Should |
| EXP-6 | The user can add expenses that apply only between a start and end year, such as childcare, school fees or university support. They can also add one-off expenses in a single year, such as a car, wedding or renovation. | Must |
| EXP-7 | The user can define **spending phases in retirement** as step changes at set ages, e.g. higher travel spending early in retirement and lower discretionary spending from age 75. | Should |
| EXP-8 | Loan repayments (mortgage and other debts) come from the loans themselves (§2.6, §2.8), not from living expenses. They stop automatically when a loan is paid off. | Must |
| EXP-9 | Property holding costs come from the property entries (§2.6), so they aren't also counted in living expenses. The app warns the user not to count them twice. | Must |
| EXP-10 | If the household doesn't own its home, the user can enter **rent** as a housing expense with its own growth rate. The rent stops if a home purchase is modelled (PROP-12). | Must |

### 2.4 Economic assumptions

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-10 | The user can set **drawdown rates**: the safe withdrawal rate used to size the FI number, and the rate used to withdraw from the portfolio in retirement. The drawdown is a constant, inflation-adjusted withdrawal (dynamic strategies are in the backlog, BL-1). | Must |
| IN-11 | The user can set an **inflation rate**. It applies to expenses (EXP-3), salary growth (unless overridden) and the display of today's-dollar values. | Must |
| IN-12 | The user can set a general **interest rate**. Cash and offset account balances earn it, and variable-rate loans can be set to move with it (PROP-6). | Must |
| IN-13 | The user can override any assumption for a specific future period, e.g. higher inflation or higher interest rates for the next three years. | Could |

### 2.5 Share portfolios

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-14 | The user can enter one or more share portfolios (e.g. an ETF portfolio, direct shares). Each has a current value and an owner: either person, or both jointly with a percentage split. | Must |
| IN-15 | For each portfolio, the user can enter an **expected total return rate**, split into capital growth and income (dividend/distribution yield). | Must |
| IN-16 | For each portfolio, the user can enter the proportion of dividends that are franked. | Must |
| IN-17 | For each portfolio, the user can enter annual fees (management expense ratio / platform fees). | Should |
| IN-18 | For each portfolio, the user can enter the regular amount they contribute to it, and when those contributions stop. | Must |
| IN-19 | For each portfolio, the user can enter its cost base, so capital gains can be calculated when it is sold. | Must |
| IN-20 | The user can choose whether dividends are reinvested or taken as cash. | Should |

### 2.6 Real estate

The app handles two kinds of property: the **owner-occupied home** and
**investment properties**. A plan has at most one owner-occupied home at a time
and any number of investment properties.

#### Common to all properties

| ID | Requirement | Priority |
| --- | --- | --- |
| PROP-1 | For each property, the user can enter its current value, expected annual capital growth, purchase price / cost base, purchase date and owner(s) with a percentage split. | Must |
| PROP-2 | For each property, the user can enter **ongoing costs**: council rates, water, strata/body corporate, insurance, maintenance and, for investment properties, property management fees and land tax. Each cost has its own growth rate, defaulting to inflation. | Must |
| PROP-3 | For each property with a mortgage, the user can enter the loan balance, remaining term, and repayment type (principal & interest or interest-only, with the date an interest-only period ends). | Must |
| PROP-4 | For each mortgage, the user can enter the **current mortgage interest rate** and say whether it is variable or fixed. For a fixed rate, the user can enter the fixed period's end date and the rate the loan reverts to after it. | Must |
| PROP-5 | For each mortgage, the user can enter an **offset account** balance. The offset balance reduces the interest charged on the loan. | Must |
| PROP-6 | For each variable-rate mortgage, the user can choose how its rate changes over time. It can stay at its current rate, or move with the general interest rate (IN-12) at a set margin above it. | Must |
| PROP-7 | For each mortgage, the user can enter extra repayments (regular or lump sum) and whether the loan is paid off early, e.g. at retirement from outside-super assets. | Should |
| PROP-8 | The app calculates each mortgage's repayments, interest and remaining balance year by year from the inputs above. | Must |

#### Owner-occupied home

| ID | Requirement | Priority |
| --- | --- | --- |
| PROP-9 | The user can enter an **owner-occupied home** with the details from PROP-1 to PROP-7. It has no rental income. | Must |
| PROP-10 | The owner-occupied home is excluded from the investable assets used for the FI number, but it is included in reported net worth. Its costs and mortgage repayments count toward household spending. | Must |
| PROP-11 | The owner-occupied home gets its tax treatment: mortgage interest is not deductible, and a sale is exempt from CGT (TAX-4). | Must |
| PROP-12 | The user can model buying a home in a future year, e.g. moving from renting to owning. The purchase includes the deposit, stamp duty, acquisition costs and a new mortgage, and rent stops (EXP-10). | Should |
| PROP-13 | The user can model selling or downsizing the home in a future year, with selling costs, an optional cheaper replacement home, and the freed-up equity added to outside-super assets or contributed to super (SUPER-11). | Should |

#### Investment properties

| ID | Requirement | Priority |
| --- | --- | --- |
| PROP-14 | For each investment property, the user can enter **income**: weekly/annual rent, rent growth rate and vacancy rate. | Must |
| PROP-15 | For each investment property, mortgage interest and holding costs are tax-deductible against the rent, and net rental losses are negatively geared (TAX-5, TAX-6). | Must |
| PROP-16 | The user can model buying or selling an investment property in a future year. A purchase includes stamp duty and acquisition costs. A sale includes selling costs and triggers CGT. | Should |
| PROP-17 | For each investment property, the user can enter depreciation deductions (building and plant & equipment). | Could |

### 2.7 Superannuation

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-21 | For each person, the user can enter their current super balance and expected return rate, net of fees. | Must |
| IN-22 | For each person, the user can enter their employer contribution rate (Superannuation Guarantee). It defaults to the legislated rate. | Must |
| IN-23 | For each person, the user can enter voluntary concessional contributions (salary sacrifice / personal deductible contributions) and voluntary non-concessional contributions. Each has a start and end year. | Must |
| IN-24 | For each person, employer contributions stop when that person retires. The user can override this. | Must |
| IN-25 | For each person, the user can enter unused concessional cap amounts from previous years (carry-forward). | Could |

### 2.8 Other assets and liabilities

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-26 | The user can enter cash savings, which earn the interest rate from IN-12. | Must |
| IN-27 | The user can enter other debts (e.g. car loan, HELP debt), each with a balance, interest/indexation rate and repayments. | Should |

## 3. FIRE calculations

| ID | Requirement | Priority |
| --- | --- | --- |
| FIRE-1 | The app calculates the **FI number**: retirement expenses divided by the safe withdrawal rate. It reports the number in both today's dollars and nominal dollars at the target retirement age. | Must |
| FIRE-2 | The app reports **progress to FI**: current investable net worth as a percentage of the FI number. | Must |
| FIRE-3 | The app calculates the **earliest age** at which each person can retire such that the plan stays solvent to the end age under the given assumptions. | Must |
| FIRE-4 | The app splits the FI requirement into two parts. The **bridge requirement** is the outside-super assets needed to fund expenses from retirement until super becomes accessible. The **post-preservation requirement** is what super plus remaining outside-super assets must fund after that. For a couple, each partner's super becomes accessible at their own preservation age. The app reports whether each part is met. | Must |
| FIRE-5 | Investment property counts toward FI through its net income (rent minus costs, loan interest and tax) and its equity. The user can choose whether that equity is ever sold down to fund retirement. | Must |
| FIRE-6 | The app can calculate FI variants from different expense levels, e.g. Lean FIRE (essential expenses only, EXP-4) and Fat FIRE (a higher lifestyle budget). | Could |
| FIRE-7 | The app provides **visualisations** that explain the FIRE model. At minimum they must show: (a) investable net worth over time against the FI number, marking the FI age; (b) the bridge period, showing outside-super assets being drawn down until super becomes accessible, then super taking over; and (c) where the money comes from and goes to each year (income, tax, expenses, contributions and withdrawals). | Must |

## 4. Coast FIRE

| ID | Requirement | Priority |
| --- | --- | --- |
| COAST-1 | The app calculates the **Coast FIRE number**: the amount that, if invested today with no further contributions, grows to the FI number by the target retirement age at the expected return. | Must |
| COAST-2 | The app reports whether the household has already reached Coast FIRE, and if not, the age at which it will on its current contribution path. | Must |
| COAST-3 | The app calculates Coast FIRE separately for super (per person) and for outside-super assets. Super can "coast" to preservation age while outside-super assets are still being built for the bridge period. | Must |
| COAST-4 | Once Coast FIRE is reached, the app shows the minimum income the household needs to cover current expenses without drawing on investments. | Should |
| COAST-5 | Coast FIRE calculations account for employer super contributions that continue while a person keeps working after reaching Coast FIRE. | Should |
| COAST-6 | The app provides **visualisations** that explain the Coast FIRE model. At minimum they must show: (a) current invested assets growing with no further contributions against the FI number, and the Coast FIRE number over time; (b) the point at which Coast FIRE is or will be reached on the current contribution path; and (c) super and outside-super assets separately (COAST-3). | Must |

## 5. Superannuation rules

The app must model how super behaves under Australian law. Rules apply to each
person separately. Specific thresholds and rates change regularly (see §9), so
each rule below is configurable rather than fixed.

| ID | Requirement | Priority |
| --- | --- | --- |
| SUPER-1 | **Preservation:** Super can't be withdrawn before preservation age plus a condition of release. The app assumes the condition is met on retirement at or after preservation age, or automatically at age 65. | Must |
| SUPER-2 | **Contributions tax:** Concessional contributions (employer, salary sacrifice, personal deductible) are taxed at 15% on entry to super. Non-concessional contributions are not taxed on entry. | Must |
| SUPER-3 | **Division 293:** An extra 15% tax applies to concessional contributions when income plus concessional contributions exceed the Division 293 threshold. | Should |
| SUPER-4 | **Contribution caps:** The app warns when planned contributions exceed the concessional or non-concessional caps. It supports the non-concessional bring-forward rule and concessional carry-forward. | Must (warn) / Should (bring-forward, carry-forward) |
| SUPER-5 | **Accumulation phase earnings tax:** Earnings are taxed at up to 15%, and capital gains on assets held over 12 months at an effective 10%. | Must |
| SUPER-6 | **Retirement phase:** After a condition of release, the balance up to the **transfer balance cap** can move to a retirement-phase income stream. Earnings in that phase are tax-free. Any amount above the cap stays in accumulation phase and is taxed as such. | Must |
| SUPER-7 | **Minimum drawdown:** An account-based pension in retirement phase must pay at least the age-based minimum percentage each year. The app applies this even if the user's chosen drawdown rate is lower, and reports any surplus withdrawn beyond spending needs. | Must |
| SUPER-8 | **Tax on withdrawals:** Withdrawals from a taxed super fund are tax-free from age 60. | Must |
| SUPER-9 | **Large-balance tax (Division 296):** An additional tax applies to earnings attributable to the part of a person's total super balance above the Division 296 thresholds. The thresholds, rates, earnings definition and start date are configurable (§9), since the rules were still being settled at the time of writing. The tax can be switched off to compare with and without it. | Must |
| SUPER-10 | **Transition to retirement (TTR):** Between preservation age and 65 while still working, a person can draw a TTR income stream (4%–10% of the balance per year). Its earnings stay taxed at 15%. | Could |
| SUPER-11 | **Downsizer contribution:** From the eligible age, sale proceeds from a home held long enough can be contributed to super outside the normal caps, up to the per-person limit. | Could |

## 6. Tax on investments and income (Australian context)

Tax is calculated per Australian financial year (1 July – 30 June), for each
person. Jointly owned assets split their income, deductions and capital gains
by ownership percentage.

| ID | Requirement | Priority |
| --- | --- | --- |
| TAX-1 | **Personal income tax:** Taxable income is taxed at the resident marginal rates, plus the Medicare levy. It includes salary, interest, dividends, net rent and net capital gains. | Must |
| TAX-2 | **Franking credits:** Franked dividends are grossed up by the attached franking credit. The credit offsets tax payable, and any excess is refunded. | Must |
| TAX-3 | **Capital gains tax:** A sale of shares or investment property triggers CGT. A net capital gain on assets held more than 12 months gets the 50% CGT discount. Capital losses offset capital gains and can be carried forward. | Must |
| TAX-4 | **Main residence exemption:** Selling the owner-occupied home doesn't trigger CGT. | Must |
| TAX-5 | **Negative gearing:** A net rental loss (costs, interest and depreciation exceeding rent) reduces the owner's other taxable income in the same year. | Must |
| TAX-6 | **Interest deductibility:** Interest on loans used to buy income-producing assets is deductible. Interest on the owner-occupied home loan is not. | Must |
| TAX-7 | **Grossing up expenses:** Expenses are after-tax spending, so the app works out the pre-tax income or withdrawals needed to fund them each year. This includes tax on investment income and capital gains realised to fund spending. | Must |
| TAX-8 | **Tax-efficient withdrawal order:** In retirement, the app draws from outside-super assets and super in an order the user can set. The default order minimises tax, e.g. selling assets in low-income years to use tax-free thresholds and the CGT discount. For a couple, it also considers which partner sells. | Should |
| TAX-9 | **Low income offsets and the tax-free threshold** are applied, since early retirees often have low taxable income. | Should |
| TAX-10 | **Medicare levy surcharge:** The surcharge applies if the user states they have no private hospital cover and income exceeds the threshold. | Could |
| TAX-11 | **HELP repayments:** Compulsory repayments are calculated from repayment income. | Could |
| TAX-12 | **Stamp duty and land tax:** These can be calculated from the property's state/territory, instead of being entered manually. | Could |

## 7. Projection and outputs

| ID | Requirement | Priority |
| --- | --- | --- |
| OUT-1 | The app produces a **year-by-year projection** from today to the end age. For each year it shows each person's age, income, expenses by category, tax paid per person, contributions, withdrawals, and the balance of each asset (each person's super, each share portfolio, cash, each property and its mortgage). | Must |
| OUT-2 | Every output value can be shown in **today's dollars** or **nominal dollars**. | Must |
| OUT-3 | The projection flags any year in which expenses can't be met, especially shortfalls during the bridge period, when super is still locked. | Must |
| OUT-4 | The app reports the key milestones: FI number, FI age, Coast FIRE age, each person's preservation age, the age super converts to retirement phase, the year each mortgage is paid off, and the age at which money runs out (if it does). | Must |
| OUT-5 | The user can save multiple **scenarios** and compare their key milestones and outcomes side by side. | Should |
| OUT-6 | The app provides a **sensitivity** view showing how the FI age changes as a single assumption varies, e.g. return rate ±2%, inflation ±1%, mortgage rate ±1%, drawdown rate. | Should |
| OUT-7 | The user can export the projection and inputs. | Could |

## 8. Non-functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-1 | **Transparency:** Every calculated figure can be traced back to the inputs, rules and assumptions that produced it. | Must |
| NFR-2 | **Determinism:** The same inputs always produce the same projection. | Must |
| NFR-3 | **Updatable rules:** Tax rates, thresholds, caps, preservation ages and minimum drawdown rates are kept as data with an effective-from date. Updating them for a new financial year doesn't require changing calculation logic. | Must |
| NFR-4 | **Privacy:** The household's financial data stays under the user's control and isn't shared with third parties. | Must |
| NFR-5 | **Disclaimer:** The app states that its output is general information and modelling, not personal financial, tax or legal advice. | Must |
| NFR-6 | **Accuracy:** Calculations are covered by tests using worked examples whose expected values have been checked independently. | Must |

## 9. Reference values (FY2025–26, to be verified)

The values below were current at the time of writing, and some change on
1 July each year. Each must be verified against ATO / legislation before being
used as a default (NFR-3). They are listed here so reviewers can check the
requirements match reality, not so they can be hard-coded.

| Item | Value |
| --- | --- |
| Preservation age | 60 for anyone born on or after 1 July 1964 |
| Condition of release without retiring | Age 65 |
| Superannuation Guarantee rate | 12% (from 1 July 2025) |
| Concessional contributions cap | $30,000 p.a. |
| Non-concessional contributions cap | $120,000 p.a. (bring-forward up to $360,000 over 3 years, subject to total super balance) |
| Concessional carry-forward eligibility | Total super balance below $500,000; unused amounts from the previous 5 years |
| Division 293 threshold | $250,000 |
| Division 296 (as last proposed) | From 1 July 2026: extra 15% (30% total) on realised earnings attributable to the balance above $3M, and extra 25% (40% total) on the part above $10M. Thresholds indexed. **Legislative status must be confirmed.** |
| Transfer balance cap | $2,000,000 (from 1 July 2025; indexed) |
| Account-based pension minimum drawdown | Under 65: 4% · 65–74: 5% · 75–79: 6% · 80–84: 7% · 85–89: 9% · 90–94: 11% · 95+: 14% |
| TTR drawdown range | 4%–10% |
| Resident income tax (FY2025–26) | $0–18,200: nil · $18,201–45,000: 16% · $45,001–135,000: 30% · $135,001–190,000: 37% · $190,001+: 45% |
| Legislated future change | 16% bracket reduces to 15% from 1 July 2026 and 14% from 1 July 2027 |
| Medicare levy | 2% |
| CGT discount (individuals) | 50% for assets held more than 12 months |
| Company tax rate for franking | 30% (25% for base rate entities) |
| Downsizer contribution | Up to $300,000 per person, from age 55 |

## 10. Out of scope

These are not planned for this app. Items that may come later are in the
backlog (§11) instead.

- The Age Pension and other Centrelink payments.
- Personal financial advice or product recommendations.
- Estate planning, death benefits and insurance inside super.
- Non-resident or temporary-resident tax treatment.
- Live price feeds or automatic syncing with bank, broker or super fund
  accounts.

## 11. Backlog: future requirements for roadmap development

These are **not** requirements for the current version. They record
capabilities we expect to want later, so the roadmap can plan for them and
early decisions don't rule them out. Each item needs its own requirements
written before it is scheduled.

| ID | Future requirement | Notes |
| --- | --- | --- |
| BL-1 | **Dynamic drawdown strategies:** withdrawals that adjust with market performance, such as guardrails (e.g. Guyton-Klinger), percentage-of-portfolio, or floor-and-ceiling rules, as alternatives to the constant inflation-adjusted withdrawal in IN-10. | Would change how the FI number and solvency are judged. |
| BL-2 | **Probabilistic projections:** varying returns and inflation year to year (e.g. Monte Carlo or historical sequences) and reporting the probability that the plan succeeds, to capture sequence-of-returns risk. | Needs a decision on the historical data source, e.g. Australian share, property and CPI series, and their licensing. |
| BL-3 | **Self-managed super funds (SMSFs):** modelling an SMSF instead of, or alongside, a public super fund, including its running costs and investment choices. | |
| BL-4 | **Family trusts:** holding investments in a discretionary trust and distributing income between beneficiaries. | |
| BL-5 | **Companies:** holding investments in a company (e.g. a "bucket company"), including company tax and franked dividends paid to shareholders. | |
