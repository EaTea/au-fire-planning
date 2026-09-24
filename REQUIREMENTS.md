# Requirements: Australian FIRE Planner

## 1. Purpose

This app helps an Australian resident plan for **Financial Independence,
Retire Early (FIRE)**. It should answer these questions:

- How much do I need to be financially independent?
- When will I get there on my current path?
- Once I stop working, will my money last?
- Can I stop contributing now and still get there by a later age (Coast FIRE)?

Answers must reflect how Australia actually works: superannuation you can't
access until preservation age, the tax treatment of shares, property and super,
and the rules for drawing down in retirement.

This document only says **what** the app must do. It doesn't cover how the app
is built or what it looks like.

### 1.1 Terminology

| Term | Meaning in this document |
| --- | --- |
| **Plan** | One user's complete set of inputs: people, assets, liabilities, income, expenses and assumptions. |
| **Scenario** | A plan with one or more assumptions changed, for comparison. |
| **Projection** | The year-by-year simulation of a plan from today to an end age. |
| **FI number** | The portfolio value needed to fund retirement spending indefinitely (or until the end age) at the chosen drawdown rate. |
| **Outside super** | Assets the user can reach at any age, such as shares, cash and investment property. |
| **Inside super** | Superannuation balances, which the preservation rules restrict. |
| **Bridge period** | The years between retiring early and reaching preservation age. Only outside-super assets can fund this period. |
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
| IN-1 | The user can enter their date of birth or current age. | Must |
| IN-2 | The user can enter a target retirement age. The app can also work out the earliest feasible retirement age (see FIRE-3). | Must |
| IN-3 | The user can enter the age at which the projection ends (life expectancy / planning horizon). | Must |
| IN-4 | The user can set their **preservation age** (the age super becomes accessible). By default, the app derives it from date of birth under current law. | Must |
| IN-5 | The user can model a couple, with each partner's age, income, super and preservation age tracked separately. | Should |

### 2.2 Income and expenses

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-6 | The user can enter their current gross (pre-tax) employment income and an expected annual growth rate. | Must |
| IN-7 | The user can enter current annual living expenses. | Must |
| IN-8 | The user can enter expected retirement expenses separately from current expenses, as either an amount or a percentage of current expenses. | Must |
| IN-9 | The user can add one-off or time-limited income and expenses, such as a car purchase, school fees, part-time work or an inheritance, each with a start and end year. | Should |
| IN-10 | The user can model part-time or reduced income after "retirement" (e.g. Barista FIRE). | Could |

### 2.3 Economic assumptions

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-11 | The user can set an **inflation rate**. It applies to expenses, income growth (unless overridden) and the display of today's-dollar values. | Must |
| IN-12 | The user can set an **interest rate** on cash holdings (savings / offset accounts). | Must |
| IN-13 | The user can set **drawdown rates**: the safe withdrawal rate used to size the FI number, and the rate used to withdraw from the portfolio in retirement. | Must |
| IN-14 | The user can override any assumption for a specific future period, e.g. higher inflation for the next three years. | Could |

### 2.4 Share portfolios

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-15 | The user can enter one or more share portfolios (e.g. an ETF portfolio, direct shares), each with a current value. | Must |
| IN-16 | For each portfolio, the user can enter an **expected total return rate**, split into capital growth and income (dividend/distribution yield). | Must |
| IN-17 | For each portfolio, the user can enter the proportion of dividends that are franked. | Must |
| IN-18 | For each portfolio, the user can enter annual fees (management expense ratio / platform fees). | Should |
| IN-19 | For each portfolio, the user can enter the regular amount they contribute to it, and when those contributions stop. | Must |
| IN-20 | For each portfolio, the user can enter its cost base, so capital gains can be calculated when it is sold. | Must |
| IN-21 | The user can choose whether dividends are reinvested or taken as cash. | Should |

### 2.5 Real estate

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-22 | The user can enter one or more properties, each marked as either the **principal place of residence** or an **investment property**. | Must |
| IN-23 | For each property, the user can enter its current value, expected annual capital growth and purchase price / cost base. | Must |
| IN-24 | For each property with a loan, the user can enter the balance, **interest rate**, remaining term, repayment type (principal & interest or interest-only) and any offset account balance. | Must |
| IN-25 | For each investment property, the user can enter **income**: weekly/annual rent, rent growth rate and vacancy rate. | Must |
| IN-26 | For each property, the user can enter **ongoing costs**: council rates, water, strata/body corporate, insurance, maintenance, property management fees and land tax. Each cost has its own growth rate, defaulting to inflation. | Must |
| IN-27 | The user can model a future purchase or sale of a property in a given year. A purchase includes stamp duty and other acquisition costs. A sale includes selling costs such as agent fees. | Should |
| IN-28 | For each investment property, the user can enter depreciation deductions (building and plant & equipment). | Could |

### 2.6 Superannuation

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-29 | The user can enter their current super balance and expected return rate, net of fees. | Must |
| IN-30 | The user can enter their employer contribution rate (Superannuation Guarantee). It defaults to the legislated rate. | Must |
| IN-31 | The user can enter voluntary concessional contributions (salary sacrifice / personal deductible contributions) and voluntary non-concessional contributions. Each has a start and end year. | Must |
| IN-32 | The user can say whether employer contributions continue after early retirement. By default they stop. | Must |
| IN-33 | The user can enter unused concessional cap amounts from previous years (carry-forward). | Could |

### 2.7 Other assets and liabilities

| ID | Requirement | Priority |
| --- | --- | --- |
| IN-34 | The user can enter cash savings with the interest rate from IN-12. | Must |
| IN-35 | The user can enter other debts (e.g. car loan, HELP debt), each with a balance, interest/indexation rate and repayments. | Should |

## 3. FIRE calculations

| ID | Requirement | Priority |
| --- | --- | --- |
| FIRE-1 | The app calculates the **FI number**: retirement expenses divided by the safe withdrawal rate. It reports the number in both today's dollars and nominal dollars at the target retirement age. | Must |
| FIRE-2 | The app reports **progress to FI**: current investable net worth as a percentage of the FI number. | Must |
| FIRE-3 | The app calculates the **earliest age** at which the user can retire such that the plan stays solvent to the end age under the given assumptions. | Must |
| FIRE-4 | The app splits the FI requirement into two parts. The **bridge requirement** is the outside-super assets needed to fund expenses from retirement to preservation age. The **post-preservation requirement** is what super plus remaining outside-super assets must fund after that. The app reports whether each part is met. | Must |
| FIRE-5 | The app treats the principal place of residence as a non-investable asset. It doesn't count toward the FI number, but its costs and any mortgage do count toward expenses. | Must |
| FIRE-6 | Investment property counts toward FI through its net income (rent minus costs, loan interest and tax) and its equity. The user can choose whether that equity is ever sold down to fund retirement. | Must |
| FIRE-7 | The app can calculate FI variants from different expense levels, e.g. Lean FIRE (essential expenses only) and Fat FIRE (a higher lifestyle budget). | Could |

## 4. Coast FIRE

| ID | Requirement | Priority |
| --- | --- | --- |
| COAST-1 | The app calculates the **Coast FIRE number**: the amount that, if invested today with no further contributions, grows to the FI number by the target retirement age at the expected return. | Must |
| COAST-2 | The app reports whether the user has already reached Coast FIRE, and if not, the age at which they will on their current contribution path. | Must |
| COAST-3 | The app calculates Coast FIRE separately for super and outside-super assets. Super can "coast" to preservation age while outside-super assets are still being built for the bridge period. | Must |
| COAST-4 | Once Coast FIRE is reached, the app shows the minimum income the user needs to cover current expenses without drawing on investments. | Should |
| COAST-5 | Coast FIRE calculations account for employer super contributions that continue while the user keeps working after reaching Coast FIRE. | Should |

## 5. Superannuation rules

The app must model how super behaves under Australian law. Specific thresholds
and rates change regularly (see §9), so each rule below is configurable rather
than fixed.

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
| SUPER-9 | **Transition to retirement (TTR):** Between preservation age and 65 while still working, the user can draw a TTR income stream (4%–10% of the balance per year). Its earnings stay taxed at 15%. | Could |
| SUPER-10 | **Large-balance tax:** The additional tax on earnings for balances above the relevant thresholds (Division 296) is modelled, subject to its legislative status (see §10). | Could |
| SUPER-11 | **Downsizer contribution:** From the eligible age, sale proceeds from a home held long enough can be contributed to super outside the normal caps. | Could |

## 6. Tax on investments and income (Australian context)

Tax is calculated per Australian financial year (1 July – 30 June), for each
person.

| ID | Requirement | Priority |
| --- | --- | --- |
| TAX-1 | **Personal income tax:** Taxable income is taxed at the resident marginal rates, plus the Medicare levy. It includes employment income, interest, dividends, net rent and net capital gains. | Must |
| TAX-2 | **Franking credits:** Franked dividends are grossed up by the attached franking credit. The credit offsets tax payable, and any excess is refunded. | Must |
| TAX-3 | **Capital gains tax:** A sale of shares or investment property triggers CGT. A net capital gain on assets held more than 12 months gets the 50% CGT discount. Capital losses offset capital gains and can be carried forward. | Must |
| TAX-4 | **Main residence exemption:** Selling the principal place of residence doesn't trigger CGT. | Must |
| TAX-5 | **Negative gearing:** A net rental loss (costs, interest and depreciation exceeding rent) reduces other taxable income in the same year. | Must |
| TAX-6 | **Interest deductibility:** Interest on loans used to buy income-producing assets is deductible. Interest on the home loan is not. | Must |
| TAX-7 | **Tax-efficient withdrawal order:** In retirement, the app draws from outside-super assets and super in an order the user can set. The default order minimises tax, e.g. selling assets in low-income years to use tax-free thresholds and the CGT discount. | Should |
| TAX-8 | **Low income offsets and the tax-free threshold** are applied, since early retirees often have low taxable income. | Should |
| TAX-9 | **Medicare levy surcharge:** The surcharge applies if the user states they have no private hospital cover and income exceeds the threshold. | Could |
| TAX-10 | **HELP repayments:** Compulsory repayments are calculated from repayment income. | Could |
| TAX-11 | **Stamp duty and land tax:** These can be calculated from the property's state/territory, instead of being entered manually. | Could |

## 7. Projection and outputs

| ID | Requirement | Priority |
| --- | --- | --- |
| OUT-1 | The app produces a **year-by-year projection** from today to the end age. For each year it shows age, income, expenses, tax paid, contributions, withdrawals, and the balance of each asset (super, each share portfolio, cash, each property and its loan). | Must |
| OUT-2 | Every output value can be shown in **today's dollars** or **nominal dollars**. | Must |
| OUT-3 | The projection flags any year in which expenses can't be met, especially shortfalls during the bridge period, when super is still locked. | Must |
| OUT-4 | The app reports the key milestones: FI number, FI age, Coast FIRE age, preservation age, the age super converts to retirement phase, and the age at which money runs out (if it does). | Must |
| OUT-5 | The user can save multiple **scenarios** and compare their key milestones and outcomes side by side. | Should |
| OUT-6 | The app provides a **sensitivity** view showing how the FI age changes as a single assumption varies, e.g. return rate ±2%, inflation ±1%, drawdown rate. | Should |
| OUT-7 | The app runs a **probabilistic** projection that varies returns and inflation year to year (e.g. Monte Carlo or historical sequences). It reports the probability that the plan succeeds, capturing sequence-of-returns risk. | Could |
| OUT-8 | The user can export the projection and inputs. | Could |

## 8. Non-functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-1 | **Transparency:** Every calculated figure can be traced back to the inputs, rules and assumptions that produced it. | Must |
| NFR-2 | **Determinism:** The same inputs always produce the same deterministic projection. | Must |
| NFR-3 | **Updatable rules:** Tax rates, thresholds, caps, preservation ages and minimum drawdown rates are kept as data with an effective-from date. Updating them for a new financial year doesn't require changing calculation logic. | Must |
| NFR-4 | **Privacy:** The user's financial data stays under the user's control and isn't shared with third parties. | Must |
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
| Transfer balance cap | $2,000,000 (from 1 July 2025; indexed) |
| Account-based pension minimum drawdown | Under 65: 4% · 65–74: 5% · 75–79: 6% · 80–84: 7% · 85–89: 9% · 90–94: 11% · 95+: 14% |
| TTR drawdown range | 4%–10% |
| Resident income tax (FY2025–26) | $0–18,200: nil · $18,201–45,000: 16% · $45,001–135,000: 30% · $135,001–190,000: 37% · $190,001+: 45% |
| Legislated future change | 16% bracket reduces to 15% from 1 July 2026 and 14% from 1 July 2027 |
| Medicare levy | 2% |
| CGT discount (individuals) | 50% for assets held more than 12 months |
| Company tax rate for franking | 30% (25% for base rate entities) |
| Downsizer contribution | Up to $300,000 per person, from age 55 |

## 10. Open questions

1. **Household:** Is the first version for a single person, or must couples
   (IN-5) be supported from the start? Couples change tax, super and the Age
   Pension calculations considerably.
2. **Age Pension:** Should the means-tested Age Pension (from age 67) be
   modelled as retirement income? It affects late-life outcomes for many
   plans, but it isn't in the original scope.
3. **Division 296:** The tax on super balances above $3M was not in force at
   the time of writing, and its final design has changed several times. Should
   it be modelled at all, and if so, in which form?
4. **Drawdown strategy:** Is a constant inflation-adjusted withdrawal (the
   classic "4% rule") enough, or are dynamic strategies (guardrails,
   percentage-of-portfolio) needed?
5. **Pre-tax vs post-tax expenses:** Should retirement expenses be entered as
   after-tax spending, with the app grossing up for tax (assumed in this
   document)?
6. **Historical data:** If OUT-7 is pursued, should it use Australian
   historical returns (ASX, property, inflation), and from which source?
7. **SMSF and other structures:** Are self-managed super funds, family trusts or
   companies in scope? This document assumes not.

## 11. Out of scope

- Personal financial advice or product recommendations.
- Estate planning, death benefits and insurance inside super.
- Non-resident or temporary-resident tax treatment.
- Business income, trusts, companies and SMSFs (pending open question 7).
- Live price feeds or automatic syncing with bank, broker or super fund
  accounts.
