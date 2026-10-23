import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { PlanProvider } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";
import { DollarsModeProvider } from "../dollarsMode";
import { blankPlan } from "../sections/sectionTestHelpers";
import { ResultsScreen } from "./ResultsScreen";

// Results for a couple (M7 step 8), with worked examples D2 and E from
// tests/worked-examples/m7-couples.json: names in the wording, both ages, the
// per-person earliest retirement, and the Year by year bands.

/** A super account with no return, employer rate or earnings tax, so the figures are checkable by hand. */
const flatSuper = (balance: number) =>
  ({ balance, returnRate: 0, employerRate: 0, earningsTaxRate: 0 }) as const;

/** D2 with interim $20,000: Alex 55 (access 65) and Sam 53 (access defaults to 65), all rates 0, plan until Sam is 66. */
const exampleD2: Plan = {
  ...blankPlan,
  household: {
    people: [
      {
        id: "person-1",
        label: "Person 1",
        name: "Alex",
        currentAge: 55,
        targetRetirementAge: 56,
        superAccount: flatSuper(150000),
      },
      {
        id: "person-2",
        label: "Person 2",
        name: "Sam",
        currentAge: 53,
        targetRetirementAge: 58,
        superAccount: flatSuper(100000),
      },
    ],
    projectionEndAge: 66,
  },
  expenses: {
    livingAnnual: 40000,
    retirementSpending: { kind: "amount", annual: 40000 },
    interimAnnual: 20000,
  },
  assumptions: { inflationRate: 0, interestRate: 0 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 200000, expectedReturn: 0 }],
};

/** Example E: Alex 34 and Sam 32, salaries, super, a joint portfolio with contributions, interim $50,000. */
const exampleE: Plan = {
  ...blankPlan,
  household: {
    people: [
      {
        id: "person-1",
        label: "Person 1",
        name: "Alex",
        currentAge: 34,
        targetRetirementAge: 50,
        salary: { annual: 145000, growth: { kind: "inflationPlus", margin: 0.01 } },
        superAccount: {
          balance: 185000,
          returnRate: 0.07,
          salarySacrifice: { annual: 10000, fromYear: 2027, toYear: 2042 },
        },
      },
      {
        id: "person-2",
        label: "Person 2",
        name: "Sam",
        currentAge: 32,
        targetRetirementAge: 52,
        superAccessAge: 60,
        salary: { annual: 110000, growth: { kind: "none" } },
        superAccount: { balance: 120000, returnRate: 0.07 },
      },
    ],
  },
  cash: { balance: 20000 },
  expenses: {
    livingAnnual: 90000,
    retirementSpending: { kind: "amount", annual: 90000 },
    interimAnnual: 50000,
  },
  assumptions: { inflationRate: 0.025, interestRate: 0.04, safeWithdrawalRate: 0.04 },
  portfolios: [
    {
      id: "portfolio-1",
      name: "Share portfolio",
      value: 100000,
      expectedReturn: 0.07,
      annualContribution: 20000,
    },
  ],
};

/** Renders Results for a plan with the clock fixed in 2026. */
function renderResults(plan: Plan) {
  return render(
    <PlanProvider initialPlan={plan} startYear={2026}>
      <DollarsModeProvider>
        <MemoryRouter initialEntries={["/results"]}>
          <Routes>
            <Route path="/results" element={<ResultsScreen />} />
          </Routes>
        </MemoryRouter>
      </DollarsModeProvider>
    </PlanProvider>,
  );
}

/** The tile with the given label (its text, so a test can check the wording of the whole tile). */
function tileText(label: string): string {
  const tile = screen.getByText(label, { selector: ".label, .metric .label" }).closest(".metric");

  return tile?.textContent ?? "";
}

describe("Results for a couple: example D2 (bridge short, both partners' super locked)", () => {
  it("names both people's ages where the money runs out", () => {
    renderResults(exampleD2);

    expect(tileText("Money lasts")).toContain("Runs out at Alex 64 · Sam 62");
    expect(
      screen.getByText(/Your money runs out at Alex 64 · Sam 62 \(2035\)/),
    ).toBeInTheDocument();
  });

  it("states the FI number in the year they have both retired", () => {
    renderResults(exampleD2);

    expect(tileText("FI number")).toContain("in 2031, when you've both retired");
  });

  it("gives each person's earliest retirement, and both targets", () => {
    renderResults(exampleD2);

    const text = tileText("Earliest retirement");

    expect(text).toContain("Alex 58 · Sam 60");
    expect(text).toContain("Alex 2029 · Sam 2033");
    expect(text).toContain("Targets: Alex 56 (2027) · Sam 58 (2031)");
  });

  it("says Coast FIRE isn't reached before they have both retired", () => {
    renderResults(exampleD2);

    expect(tileText("Coast FIRE")).toContain("Not before you've both retired (2031)");
  });

  it("shows the bridge as SHORT, with the after-access working listing each partner's super", () => {
    renderResults(exampleD2);

    const bridgeCard = screen
      .getByRole("heading", { name: "Can you bridge to super?" })
      .closest("section")!;

    expect(within(bridgeCard).getAllByText(/SHORT/).length).toBeGreaterThan(0);
    expect(
      within(bridgeCard).getByText(/After Alex's super opens, 2036 – 2039/),
    ).toBeInTheDocument();
  });

  // Alex's super opens in 2036, when after access begins; Sam's is still locked until 2038.
  it("lists each partner's super on its own line, marking the one still locked, in the after-access working", async () => {
    const user = userEvent.setup();
    renderResults(exampleD2);

    const bridgeCard = screen
      .getByRole("heading", { name: "Can you bridge to super?" })
      .closest("section")!;
    const afterAccessMeter = within(bridgeCard)
      .getByText(/After Alex's super opens, 2036 – 2039/)
      .closest<HTMLElement>(".status-meter")!;

    for (const button of within(afterAccessMeter).getAllByRole("button", {
      name: "How is this calculated?",
    })) {
      await user.click(button);
    }

    const text = afterAccessMeter.textContent ?? "";

    expect(text).toContain("Alex's super at end of 2035$150,000");
    expect(text).toContain("Sam's super at end of 2035, locked until 65 (2038)$100,000");
    expect(text).not.toContain("Alex's super at end of 2035, locked");
  });

  it("names the person whose super opens first in the after-access heading", () => {
    const [alex, sam] = exampleD2.household.people;
    renderResults({
      ...exampleD2,
      household: {
        ...exampleD2.household,
        people: [alex!, { ...sam!, superAccessAge: 60 }],
      },
    });

    const bridgeCard = screen
      .getByRole("heading", { name: "Can you bridge to super?" })
      .closest("section")!;

    expect(
      within(bridgeCard).getByText(/After Sam's super opens, 2033 – 2039/),
    ).toBeInTheDocument();
  });

  it("lists each person's retirement and super access as milestones, with both ages", () => {
    renderResults(exampleD2);

    const milestones = screen.getByRole("heading", { name: "Milestones" }).closest("section")!;

    expect(within(milestones).getByText("Alex retires (target)")).toBeInTheDocument();
    expect(within(milestones).getByText("Sam retires (target)")).toBeInTheDocument();
    expect(within(milestones).getByText("Alex's super accessible")).toBeInTheDocument();
    expect(within(milestones).getByText("Sam's super accessible")).toBeInTheDocument();
    expect(within(milestones).getByText(/Money runs out at Alex 64 · Sam 62/)).toBeInTheDocument();
    expect(within(milestones).queryByText("Retirement (your target)")).not.toBeInTheDocument();
  });

  describe("Year by year", () => {
    it("has one column of both ages, headed by the names", () => {
      renderResults(exampleD2);

      const table = screen.getByRole("table", { name: "Year by year projection" });

      expect(within(table).getByRole("columnheader", { name: "Alex · Sam" })).toBeInTheDocument();
      expect(within(table).queryByRole("columnheader", { name: "Age" })).not.toBeInTheDocument();
      expect(within(table).getByRole("cell", { name: "55 · 53" })).toBeInTheDocument();
    });

    it("has the one-retired band naming who still works, then the bridge band naming each person", () => {
      renderResults(exampleD2);

      const table = screen.getByRole("table", { name: "Year by year projection" });

      expect(within(table).getByText("One retired · Sam working")).toBeInTheDocument();
      expect(
        within(table).getByText("Bridge · super locked: Alex until 65 (2036), Sam until 65 (2038)"),
      ).toBeInTheDocument();
      expect(within(table).getByText("Super accessible")).toBeInTheDocument();
    });

    it("names each person whose super is locked in the shortfall year", () => {
      renderResults(exampleD2);

      const table = screen.getByRole("table", { name: "Year by year projection" });

      expect(
        within(table).getByText(
          /Shortfall .* · Alex's super locked until 65 \(2036\), Sam's until 65 \(2038\)/,
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("Results for a couple: example E (realistic)", () => {
  it("states the FI number at the household retirement, $3,686,887 in 2046", () => {
    renderResults(exampleE);

    expect(tileText("FI number")).toContain("$3,686,887 in 2046, when you've both retired");
  });

  it("gives each person's earliest retirement: Alex 52 (2044) and Sam 54 (2048)", () => {
    renderResults(exampleE);

    const text = tileText("Earliest retirement");

    expect(text).toContain("Alex 52 · Sam 54");
    expect(text).toContain("Alex 2044 · Sam 2048");
    expect(text).toContain("Targets: Alex 50 (2042) · Sam 52 (2046)");
  });

  it("says the money runs out in 2086 at Alex 94 · Sam 92", () => {
    renderResults(exampleE);

    expect(tileText("Money lasts")).toContain("Runs out at Alex 94 · Sam 92");
    expect(tileText("Money lasts")).toContain("2086");
  });

  it("has the one-retired band from 2043", () => {
    renderResults(exampleE);

    const table = screen.getByRole("table", { name: "Year by year projection" });

    expect(within(table).getByText("One retired · Sam working")).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "51 · 49" })).toBeInTheDocument();
  });
});

describe("Results for one person", () => {
  // The one-person wording is unchanged by the couple work.
  it("keeps 'Age' as the column header and 'Retirement (your target)' as the milestone", () => {
    const [alex] = exampleD2.household.people;
    renderResults({
      ...exampleD2,
      household: { ...exampleD2.household, people: [{ ...alex!, name: undefined }] },
    });

    const table = screen.getByRole("table", { name: "Year by year projection" });

    expect(within(table).getByRole("columnheader", { name: "Age" })).toBeInTheDocument();
    expect(screen.getByText("Retirement (your target)")).toBeInTheDocument();
    expect(within(table).queryByText(/One retired/)).not.toBeInTheDocument();
  });
});

describe("Results for a couple where one partner has no super", () => {
  // Old (60, retires at 61) has no super; Young (40, retires at 45) has $300,000. The bridge runs to 2050.
  const plan: Plan = {
    ...blankPlan,
    household: {
      people: [
        {
          id: "person-1",
          label: "Person 1",
          name: "Old",
          currentAge: 60,
          targetRetirementAge: 61,
        },
        {
          id: "person-2",
          label: "Person 2",
          name: "Young",
          currentAge: 40,
          targetRetirementAge: 45,
          superAccount: { balance: 300000, returnRate: 0 },
        },
      ],
      projectionEndAge: 70,
    },
    expenses: { livingAnnual: 30000, retirementSpending: { kind: "amount", annual: 30000 } },
    assumptions: { inflationRate: 0 },
    portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 400000, expectedReturn: 0 }],
  };

  it("keeps the Super accessible band for the year the person who has super reaches 65", () => {
    renderResults(plan);

    const table = screen.getByRole("table", { name: "Year by year projection" });
    const bands = within(table)
      .getAllByRole("row")
      .filter((row) => row.classList.contains("projection-band"))
      .map((row) => row.textContent);

    expect(bands).toEqual([
      "Working · contributing",
      "One retired · Young working",
      "Bridge · super locked: Young until 65 (2051)",
      "Super accessible",
    ]);
  });
});

describe("Milestones for a couple whose super is already open or out of the plan", () => {
  /** Alex 67 and still working with $300,000 of super; Sam 40 with $100,000. Plan until Sam is 80. */
  const alexPastAccess: Plan = {
    ...blankPlan,
    household: {
      people: [
        {
          id: "person-1",
          label: "Person 1",
          name: "Alex",
          currentAge: 67,
          targetRetirementAge: 70,
          superAccount: { balance: 300000, returnRate: 0 },
        },
        {
          id: "person-2",
          label: "Person 2",
          name: "Sam",
          currentAge: 40,
          targetRetirementAge: 50,
          superAccount: { balance: 100000, returnRate: 0 },
        },
      ],
      projectionEndAge: 80,
    },
    expenses: { livingAnnual: 20000, retirementSpending: { kind: "amount", annual: 20000 } },
    assumptions: { inflationRate: 0 },
    portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 1000000, expectedReturn: 0 }],
  };

  function milestones() {
    return within(screen.getByRole("heading", { name: "Milestones" }).closest("section")!);
  }

  it("says an open super is accessible now, rather than not reached", () => {
    renderResults(alexPastAccess);

    expect(milestones().getByText("Alex's super accessible: now")).toBeInTheDocument();
    expect(milestones().getByText("Sam's super accessible")).toBeInTheDocument();
    expect(milestones().queryByText(/Alex's super accessible: not by/)).not.toBeInTheDocument();
  });

  it("says the same for a partner who has already retired", () => {
    const [alex, sam] = alexPastAccess.household.people;
    renderResults({
      ...alexPastAccess,
      household: {
        ...alexPastAccess.household,
        people: [{ ...alex!, currentAge: 70, targetRetirementAge: 70 }, sam!],
      },
    });

    expect(milestones().getByText("Alex's super accessible: now")).toBeInTheDocument();
  });

  // Alex is 15 years older than Sam, so Alex's last age in a plan that ends when Sam is 49 is 64.
  it("uses the person's own last age when their super opens after the plan ends", () => {
    renderResults({
      ...alexPastAccess,
      household: {
        people: [
          { ...alexPastAccess.household.people[0]!, currentAge: 45, targetRetirementAge: 50 },
          { ...alexPastAccess.household.people[1]!, currentAge: 30, targetRetirementAge: 40 },
        ],
        projectionEndAge: 49,
      },
    });

    expect(milestones().getByText("Alex's super accessible: not by age 64")).toBeInTheDocument();
    expect(milestones().getByText("Sam's super accessible: not by age 49")).toBeInTheDocument();
  });

  it("words 'money lasts' for a couple like the tile", () => {
    renderResults(alexPastAccess);

    expect(milestones().getByText("Money lasts to Sam 80")).toBeInTheDocument();
  });

  it("says Coast FIRE isn't reached before they have both retired", () => {
    renderResults({
      ...alexPastAccess,
      expenses: { livingAnnual: 80000 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 10000 }],
    });

    expect(
      milestones().getByText("Coast FIRE: not before you've both retired"),
    ).toBeInTheDocument();
  });

  it("words FI not reached with the younger person's name", () => {
    renderResults({
      ...alexPastAccess,
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 10000 }],
    });

    expect(milestones().getByText("FI reached: not by Sam 80")).toBeInTheDocument();
    expect(tileText("FI reached")).toContain("Not by Sam 80");
  });
});

describe("Milestones for one person already past their access age", () => {
  it("says super is accessible now", () => {
    renderResults({
      ...blankPlan,
      household: {
        people: [
          {
            id: "person-1",
            label: "Person 1",
            currentAge: 67,
            targetRetirementAge: 70,
            superAccount: { balance: 300000, returnRate: 0 },
          },
        ],
        projectionEndAge: 80,
      },
      expenses: { livingAnnual: 20000 },
      assumptions: { inflationRate: 0 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000 }],
    });

    const milestones = within(
      screen.getByRole("heading", { name: "Milestones" }).closest("section")!,
    );

    expect(milestones.getByText("Super accessible: now")).toBeInTheDocument();
  });
});

// The info banner for $0 ENTERED as the interim amount when nobody has a salary
// to cover spending (owner decision, 2026-10-23); the $0 default never shows it.
describe("The nothing-drawn banner", () => {
  const bannerText =
    /While Alex is retired, Sam has no salary, but nothing is drawn for spending\./;

  /** D2 with the interim amount changed (or left unset when undefined). */
  const d2WithInterim = (interimAnnual: number | undefined): Plan => ({
    ...exampleD2,
    expenses: { ...exampleD2.expenses, interimAnnual },
  });

  it("appears when $0 is entered and the later-retiring partner has no salary", () => {
    renderResults(d2WithInterim(0));

    expect(screen.getByText(bannerText)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Check "Drawn from savings while one of you is retired" on Income & expenses/,
      ),
    ).toBeInTheDocument();
  });

  it("is absent when the amount is unset (the default is then the retirement spending)", () => {
    renderResults(d2WithInterim(undefined));

    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it("is absent when an amount above $0 is entered", () => {
    renderResults(d2WithInterim(20000));

    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it("is absent when the later-retiring partner has a salary", () => {
    const [alex, sam] = exampleD2.household.people;
    renderResults({
      ...d2WithInterim(0),
      household: {
        ...exampleD2.household,
        people: [alex!, { ...sam!, salary: { annual: 90000 } }],
      },
    });

    expect(screen.queryByText(bannerText)).not.toBeInTheDocument();
  });

  it("is absent when both retire in the same year", () => {
    const [alex, sam] = exampleD2.household.people;
    renderResults({
      ...d2WithInterim(0),
      household: {
        ...exampleD2.household,
        people: [alex!, { ...sam!, currentAge: 54, targetRetirementAge: 55 }],
      },
    });

    expect(screen.queryByText(/nothing is drawn for spending/)).not.toBeInTheDocument();
  });
});
