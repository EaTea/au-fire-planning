import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { PlanProvider } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";
import { DollarsModeProvider } from "../dollarsMode";
import { blankPlan } from "../sections/sectionTestHelpers";
import { ResultsScreen } from "./ResultsScreen";

// The bridge check on Results (M6 step 7), with figures from the worked
// examples in tests/worked-examples/m6-bridge.json: B1, B2 and A.

/** B1: age 55, retire at 56, plan until 66, $100,000 in each of the portfolio and super at 0%, super accessible at 60. */
const exampleB1: Plan = {
  ...blankPlan,
  household: {
    people: [
      {
        id: "person-1",
        label: "Person 1",
        currentAge: 55,
        targetRetirementAge: 56,
        superAccessAge: 60,
        superAccount: { balance: 100000, returnRate: 0 },
      },
    ],
    projectionEndAge: 66,
  },
  expenses: { livingAnnual: 20000, retirementSpending: { kind: "amount", annual: 20000 } },
  assumptions: { inflationRate: 0 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000, expectedReturn: 0 }],
};

/** B2: B1 with the default access age of 65, so the bridge is short in 2033 to 2035. */
const exampleB2: Plan = {
  ...exampleB1,
  household: {
    ...exampleB1.household,
    people: [{ ...exampleB1.household.people[0]!, superAccessAge: undefined }],
  },
};

/** B3: B1 retiring at 61 and ending at 64, so there is no bridge. */
const exampleB3: Plan = {
  ...exampleB1,
  household: {
    people: [{ ...exampleB1.household.people[0]!, targetRetirementAge: 61 }],
    projectionEndAge: 64,
  },
};

/** M5's example A with the default access age of 65. */
const exampleA: Plan = {
  ...blankPlan,
  household: {
    people: [
      {
        id: "person-1",
        label: "Person 1",
        currentAge: 34,
        targetRetirementAge: 50,
        salary: { annual: 145000, growth: { kind: "inflationPlus", margin: 0.01 } },
        superAccount: {
          balance: 185000,
          returnRate: 0.07,
          salarySacrifice: { annual: 10000, fromYear: 2027, toYear: 2042 },
        },
      },
    ],
  },
  expenses: { livingAnnual: 64000 },
  assumptions: { inflationRate: 0.025, interestRate: 0.04 },
  cash: { balance: 20000 },
  portfolios: [
    {
      id: "portfolio-1",
      name: "Share portfolio",
      value: 720000,
      expectedReturn: 0.07,
      annualContribution: 30000,
    },
  ],
};

/** Renders Results for a plan, starting in 2026. */
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

/** The "Can you bridge to super?" card. */
function bridgeCard(): HTMLElement {
  return screen
    .getByRole("heading", { name: "Can you bridge to super?" })
    .closest<HTMLElement>("section")!;
}

/** The rows of the open breakdown inside one meter, as text. */
function breakdownRows(meter: HTMLElement): (string | null)[] {
  return within(meter)
    .getAllByRole("row")
    .map((row) => row.textContent);
}

/** The Year by year table's band rows, in order. */
function bandTexts(): (string | null)[] {
  return [...document.querySelectorAll(".projection-band td")].map((cell) => cell.textContent);
}

describe("the bridge check on Results", () => {
  it("B1: both parts MET, with the need and projected figures", () => {
    renderResults(exampleB1);

    const card = bridgeCard();
    expect(within(card).getByText("Bridge: outside super, 2028 – 2030")).toBeInTheDocument();
    expect(within(card).getByText("Need $60,000 in 2027 · projected $100,000")).toBeInTheDocument();
    expect(within(card).getByText("After super is accessible, 2031 – 2037")).toBeInTheDocument();
    expect(
      within(card).getByText("Need $140,000 in 2030 · projected $140,000"),
    ).toBeInTheDocument();
    expect(within(card).getAllByText("MET")).toHaveLength(2);
    expect(within(card).queryByText("SHORT")).not.toBeInTheDocument();
  });

  it("B2: the bridge is SHORT in 2033 to 2035 and after access is MET", () => {
    renderResults(exampleB2);

    const card = bridgeCard();
    expect(within(card).getByText("Bridge: outside super, 2028 – 2035")).toBeInTheDocument();
    expect(
      within(card).getByText("Need $160,000 in 2027 · projected $100,000 · short in 2033 – 2035"),
    ).toBeInTheDocument();
    expect(within(card).getByText("SHORT")).toBeInTheDocument();
    expect(within(card).getByText("Need $40,000 in 2035 · projected $100,000")).toBeInTheDocument();
    expect(within(card).getByText("MET")).toBeInTheDocument();
  });

  it("A: figures to the cent in the breakdowns", async () => {
    const user = userEvent.setup();
    renderResults(exampleA);

    const card = bridgeCard();
    expect(within(card).getByText("Bridge: outside super, 2043 – 2056")).toBeInTheDocument();
    expect(
      within(card).getByText("Need $978,217 in 2042 · projected $2,999,659"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Need $2,559,160 in 2056 · projected $7,821,132"),
    ).toBeInTheDocument();

    const bridgeMeter = within(card)
      .getByText("Bridge: outside super, 2043 – 2056")
      .closest<HTMLElement>(".status-meter")!;
    await user.click(within(bridgeMeter).getByRole("button", { name: "How is this calculated?" }));

    const rows = breakdownRows(bridgeMeter);
    expect(rows.join("|")).not.toContain("tax-free");
    expect(rows.some((row) => row?.endsWith("Need for the bridge at 2042$978,217"))).toBe(true);
    expect(rows.at(-1)).toBe("= Projected for the bridge$2,999,659");

    // The tax-free note belongs to the after-access working, last, with the result still the bold line above it.
    const afterMeter = within(card)
      .getByText("After super is accessible, 2057 – 2087")
      .closest<HTMLElement>(".status-meter")!;
    await user.click(within(afterMeter).getByRole("button", { name: "How is this calculated?" }));

    const afterRows = breakdownRows(afterMeter);
    expect(afterRows.at(-1)).toBe("Withdrawals are tax-free from age60");
    expect(afterRows.at(-2)).toBe("= Projected after super is accessible$7,821,132");
    expect(
      within(afterMeter).getByText("Projected after super is accessible").closest("b"),
    ).not.toBeNull();
  });

  it("follows the dollars toggle using each figure's own year's inflation index", async () => {
    const user = userEvent.setup();
    renderResults(exampleA);

    await user.click(screen.getByRole("button", { name: "Today's dollars" }));

    const card = bridgeCard();
    // 2042 is 16 years out and 2056 is 30 years out, at 2.5% inflation.
    expect(
      within(card).getByText("Need $658,951 in 2042 · projected $2,020,645"),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("Need $1,220,061 in 2056 · projected $3,728,667"),
    ).toBeInTheDocument();
  });

  it("says no bridge is needed when retiring at or after the access age (B3)", () => {
    renderResults(exampleB3);

    const card = bridgeCard();
    expect(
      within(card).getByText("No bridge needed: super is accessible when you retire."),
    ).toBeInTheDocument();
    expect(within(card).queryByText(/^Bridge: outside super/)).not.toBeInTheDocument();
    expect(within(card).getByText(/^After super is accessible, 2033 – 2035/)).toBeInTheDocument();
  });

  it("shows only the bridge when the plan ends before super opens", () => {
    // B2 ending at 62: super would open at 65, after the plan.
    renderResults({
      ...exampleB2,
      household: { ...exampleB2.household, projectionEndAge: 62 },
    });

    const card = bridgeCard();
    expect(within(card).getByText("Bridge: outside super, 2028 – 2033")).toBeInTheDocument();
    expect(within(card).queryByText(/^After super is accessible/)).not.toBeInTheDocument();
    expect(within(card).getByText(/Super isn't accessible until age 65/)).toBeInTheDocument();
  });

  it("is not shown without a super account, and has no 'On this page' link", () => {
    renderResults({
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
        projectionEndAge: 65,
      },
      expenses: { livingAnnual: 30000 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000 }],
    });

    expect(
      screen.queryByRole("heading", { name: "Can you bridge to super?" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Can you bridge to super?" }),
    ).not.toBeInTheDocument();
  });

  it("is not shown while the plan is incomplete", () => {
    renderResults(blankPlan);

    expect(
      screen.queryByRole("heading", { name: "Can you bridge to super?" }),
    ).not.toBeInTheDocument();
  });

  it("adds an 'On this page' link that targets the card", () => {
    renderResults(exampleB2);

    const link = screen.getByRole("link", { name: "Can you bridge to super?" });
    expect(link).toHaveAttribute("href", "/results?view=bridge");
    expect(bridgeCard().id).toBe("bridge");
  });
});

/** M5's example C with the default access age of 65: outside super coasts first, super not before retirement. */
const exampleC: Plan = {
  ...blankPlan,
  household: {
    people: [
      {
        id: "person-1",
        label: "Person 1",
        currentAge: 34,
        targetRetirementAge: 50,
        salary: { annual: 120000, growth: { kind: "inflationPlus", margin: 0 } },
        superAccount: {
          balance: 100000,
          returnRate: 0.07,
          salarySacrifice: { annual: 10000, fromYear: 2027, toYear: 2042 },
        },
      },
    ],
  },
  expenses: { livingAnnual: 64000 },
  assumptions: { inflationRate: 0.025, interestRate: 0.04 },
  cash: { balance: 20000 },
  portfolios: [
    {
      id: "portfolio-1",
      name: "Share portfolio",
      value: 300000,
      expectedReturn: 0.07,
      annualContribution: 30000,
    },
  ],
};

/** The "Super and outside super" card. */
function splitCard(): HTMLElement {
  return screen
    .getByRole("heading", { name: "Super and outside super" })
    .closest<HTMLElement>("section")!;
}

describe("the Coast FIRE split card on Results", () => {
  it("B1: outside super coasts since 2026; super on its own is not reached", () => {
    renderResults(exampleB1);

    const card = splitCard();
    expect(within(card).getByText("Coasting since 2026")).toBeInTheDocument();
    expect(within(card).getByText("Needs $60,000 today · has $100,000")).toBeInTheDocument();
    expect(within(card).getByText("Not before retirement")).toBeInTheDocument();
    expect(within(card).getByText("Needs $140,000 today · has $100,000")).toBeInTheDocument();
  });

  it("B2: outside super is not reached; super coasts since 2026", () => {
    renderResults(exampleB2);

    const card = splitCard();
    expect(within(card).getByText("Needs $160,000 today · has $100,000")).toBeInTheDocument();
    expect(within(card).getByText("Not before retirement")).toBeInTheDocument();
    expect(within(card).getByText("Needs $40,000 today · has $100,000")).toBeInTheDocument();
    expect(within(card).getByText("Coasting since 2026")).toBeInTheDocument();
  });

  it("A: outside super since 2026, super from 2039 at age 47, to the dollar", () => {
    renderResults(exampleA);

    const card = splitCard();
    expect(within(card).getByText("Coasting since 2026")).toBeInTheDocument();
    expect(within(card).getByText("Needs $338,667 today · has $740,000")).toBeInTheDocument();
    expect(within(card).getByText("Coasting from 2039")).toBeInTheDocument();
    expect(
      within(card).getByText("Needs $256,833 today · has $185,000 · reached at age 47"),
    ).toBeInTheDocument();
  });

  it("C: outside super coasts from 2027 at age 35; super is not before retirement", () => {
    renderResults(exampleC);

    const card = splitCard();
    expect(within(card).getByText("Coasting from 2027")).toBeInTheDocument();
    expect(
      within(card).getByText("Needs $338,667 today · has $320,000 · reached at age 35"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Not before retirement")).toBeInTheDocument();
    expect(within(card).getByText("Needs $302,393 today · has $100,000")).toBeInTheDocument();
  });

  it("shows only the super meter when there is no bridge (B3)", () => {
    renderResults(exampleB3);

    const card = splitCard();
    expect(within(card).queryByText(/^Outside super funds/)).not.toBeInTheDocument();
    expect(within(card).getByText(/^Super funds the years after access/)).toBeInTheDocument();
  });

  it("keeps today's dollars figures when the dollars toggle changes", async () => {
    const user = userEvent.setup();
    renderResults(exampleA);

    await user.click(screen.getByRole("button", { name: "Today's dollars" }));

    expect(
      within(splitCard()).getByText("Needs $338,667 today · has $740,000"),
    ).toBeInTheDocument();
  });

  it("opens the working behind a need", async () => {
    const user = userEvent.setup();
    renderResults(exampleB2);

    const meter = within(splitCard())
      .getByText("Outside super funds the bridge on its own")
      .closest<HTMLElement>(".status-meter")!;
    await user.click(within(meter).getByRole("button", { name: "How is this calculated?" }));

    expect(breakdownRows(meter).at(-1)).toBe("= Outside super needed today$160,000");
  });

  it("adds an 'On this page' link that targets the card, and is absent without super", () => {
    const { unmount } = renderResults(exampleB2);

    expect(screen.getByRole("link", { name: "Super and outside super" })).toHaveAttribute(
      "href",
      "/results?view=coast-split",
    );
    expect(splitCard().id).toBe("coast-split");
    unmount();

    renderResults({
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
        projectionEndAge: 65,
      },
      expenses: { livingAnnual: 30000 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000 }],
    });
    expect(
      screen.queryByRole("heading", { name: "Super and outside super" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Super and outside super" })).not.toBeInTheDocument();
  });
});

describe("the bridge chart on Results", () => {
  it("sits inside the bridge card, with a data table of the two balances (B2)", () => {
    renderResults(exampleB2);

    const card = bridgeCard();
    expect(
      within(card).getByRole("heading", { name: "Bridge period: outside super, then super" }),
    ).toBeInTheDocument();

    const table = within(card).getByRole("table", { name: /stacked by year.*: data/ });
    const rows = within(table)
      .getAllByRole("row")
      .map((row) => row.textContent);
    expect(rows[0]).toBe("YearAgeOutside super (portfolio and cash)Super");
    // Nothing is drawn in 2027 (retired at 56, first spending year is 2028); in 2033 the portfolio is empty and super locked.
    expect(rows).toContain("202756$100,000$100,000");
    expect(rows).toContain("203362$0$100,000");
    expect(rows).toContain("203766$0$60,000");
  });

  it("is not shown without the card", () => {
    renderResults(blankPlan);

    expect(screen.queryByRole("img", { name: /stacked by year/ })).not.toBeInTheDocument();
  });
});

describe("Milestones with super", () => {
  it("lists 'Super accessible' at the effective access age's year", () => {
    renderResults(exampleB2);

    const milestones = document.getElementById("milestones")!;
    const item = within(milestones).getByText("Super accessible").closest("li")!;
    expect(within(item).getByText("2036")).toBeInTheDocument();
    expect(within(item).getByText("Age 65")).toBeInTheDocument();
  });

  it("uses the first retired year when retiring after the access age (B3: 62, not 60)", () => {
    renderResults(exampleB3);

    const item = within(document.getElementById("milestones")!)
      .getByText("Super accessible")
      .closest("li")!;
    expect(within(item).getByText("2033")).toBeInTheDocument();
    expect(within(item).getByText("Age 62")).toBeInTheDocument();
  });

  it("has no such milestone without super", () => {
    renderResults({
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
        projectionEndAge: 65,
      },
      expenses: { livingAnnual: 30000 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000 }],
    });

    expect(
      within(document.getElementById("milestones")!).queryByText(/Super accessible/),
    ).not.toBeInTheDocument();
  });

  it("says it isn't reached when the plan ends first", () => {
    renderResults({
      ...exampleB2,
      household: { ...exampleB2.household, projectionEndAge: 62 },
    });

    expect(
      within(document.getElementById("milestones")!).getByText("Super accessible: not by age 62"),
    ).toBeInTheDocument();
  });
});

describe("Year by year bands with super", () => {
  it("B2: Working, then Bridge with the access age, then Super accessible", () => {
    renderResults(exampleB2);

    expect(bandTexts()).toEqual([
      "Working · contributing",
      "Bridge · retired, super locked until 65",
      "Super accessible",
    ]);
  });

  it("B1: the Bridge band says 60", () => {
    renderResults(exampleB1);

    expect(bandTexts()).toEqual([
      "Working · contributing",
      "Bridge · retired, super locked until 60",
      "Super accessible",
    ]);
  });

  it("B3: no Bridge band, Super accessible opens the retired years", () => {
    renderResults(exampleB3);

    expect(bandTexts()).toEqual(["Working · contributing", "Super accessible"]);
  });

  it("keeps the single Retired band when there is no super", () => {
    renderResults({
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
        projectionEndAge: 65,
      },
      expenses: { livingAnnual: 30000 },
      portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000 }],
    });

    expect(bandTexts()).toEqual([
      "Working · contributing",
      "Retired · spending drawn from the portfolio, then cash",
    ]);
  });
});
