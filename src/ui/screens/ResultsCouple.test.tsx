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
      within(bridgeCard).getByText(/After super is accessible, 2036 – 2039/),
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
      .getByText(/After super is accessible, 2036 – 2039/)
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
