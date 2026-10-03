import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { PlanProvider } from "../../plan/PlanProvider";
import type { Plan } from "../../plan/types";
import { DollarsModeProvider } from "../dollarsMode";
import { blankPlan } from "../sections/sectionTestHelpers";
import { ResultsScreen } from "./ResultsScreen";

/** The worked example from PLAN.md: $64,000 spending, 100% default, $720,000 invested, 4% default. */
const workedPlan: Plan = {
  ...blankPlan,
  expenses: { livingAnnual: 64000 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 720000 }],
};

/** Worked example A from tests/worked-examples/m2-growth.json: FI in 2038 at age 46. */
const exampleA: Plan = {
  ...workedPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 34, targetRetirementAge: 50 }],
  },
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

/** Worked example C: no money, no contributions, so FI is never reached. */
const exampleC: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
  },
  expenses: { livingAnnual: 50000 },
  assumptions: { inflationRate: 0.02 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", expectedReturn: 0 }],
};

/** Worked example A from tests/worked-examples/m3-drawdown.json: example A plus $20,000 cash; the money lasts to 95. */
const exampleAWithCash: Plan = { ...exampleA, cash: { balance: 20000 } };

/** Worked example B from the same fixture: age 60 retired, $10,000 cash, runs short in 2031. */
const exampleB: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
    projectionEndAge: 65,
  },
  expenses: { livingAnnual: 30000, retirementSpending: { kind: "amount", annual: 30000 } },
  assumptions: { inflationRate: 0, interestRate: 0.05 },
  cash: { balance: 10000 },
  portfolios: [{ id: "portfolio-1", name: "Share portfolio", value: 100000, expectedReturn: 0.1 }],
};

/** Renders the Results screen for a plan, with a stand-in route that shows where a link went. */
function renderResults(plan: Plan) {
  return render(
    <PlanProvider initialPlan={plan} startYear={2026}>
      <DollarsModeProvider>
        <MemoryRouter initialEntries={["/results"]}>
          <Routes>
            <Route path="/results" element={<ResultsScreen />} />
            <Route path="/income-expenses" element={<p>Income and expenses page</p>} />
          </Routes>
        </MemoryRouter>
      </DollarsModeProvider>
    </PlanProvider>,
  );
}

/**
 * The text of every row of the open explanation panels, in order. The chart's
 * visually hidden data table and the Year by year table also have rows, so
 * those are left out.
 */
function explanationRows(): (string | null)[] {
  return screen
    .getAllByRole("row")
    .filter((row) => !row.closest(".time-series-chart") && !row.closest(".projection-table"))
    .map((row) => row.textContent);
}

/** Opens the "How is this calculated?" panel of the tile with this label, so tests don't depend on tile order. */
async function openExplanation(user: ReturnType<typeof userEvent.setup>, tileLabel: string) {
  const tile = screen
    .getAllByText(tileLabel, { selector: ".metric .label" })[0]!
    .closest<HTMLElement>(".metric")!;

  await user.click(within(tile).getByRole("button", { name: "How is this calculated?" }));
}

/** The year in the first cell of the Year by year row currently outlined, if any. */
function outlinedRowYear(): string | undefined {
  const outlined = document.querySelector<HTMLElement>('[data-outlined="true"]');
  return outlined === null
    ? undefined
    : (within(outlined).getAllByRole("cell")[0]?.textContent ?? "");
}

describe("ResultsScreen", () => {
  it("shows the worked FI number and progress when the plan is complete", () => {
    renderResults(workedPlan);

    expect(screen.getByText("$1,600,000")).toBeInTheDocument();
    expect(screen.getByText("$64,000/yr ÷ 4%")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("$720,000 invested of $1,600,000")).toBeInTheDocument();
  });

  it("opens the FI number breakdown with its lines", async () => {
    const user = userEvent.setup();
    renderResults(workedPlan);

    await openExplanation(user, "FI number");

    const rows = explanationRows();
    expect(rows).toEqual([
      "Retirement spending per year$64,000",
      "÷ Safe withdrawal rate (default)4%",
      "= FI number$1,600,000",
    ]);
  });

  it("shows the progress breakdown lines", async () => {
    const user = userEvent.setup();
    renderResults(workedPlan);

    await openExplanation(user, "Progress to FI");

    const rows = explanationRows();
    expect(rows).toEqual([
      "Share portfolio$720,000",
      "+ Cash savings (default)$0",
      "+ Super (default)$0",
      "= Investable amount$720,000",
      "÷ FI number$1,600,000",
      "= Progress to FI45%",
    ]);
  });

  it("asks for living expenses, with a link to Income & expenses, when incomplete", async () => {
    const user = userEvent.setup();
    renderResults(blankPlan);

    expect(screen.queryByText("$1,600,000")).not.toBeInTheDocument();
    expect(screen.queryByText("FI number")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Living expenses → Income & expenses" }));

    expect(screen.getByText("Income and expenses page")).toBeInTheDocument();
  });

  it("links a retirement spending problem to Income & expenses", async () => {
    const user = userEvent.setup();
    renderResults({
      ...workedPlan,
      expenses: { livingAnnual: 64000, retirementSpending: { kind: "amount", annual: 0 } },
    });

    await user.click(
      screen.getByRole("link", { name: /Retirement spending must be more than \$0 → Income/ }),
    );

    expect(screen.getByText("Income and expenses page")).toBeInTheDocument();
  });

  it("says what is not modelled yet when incomplete", () => {
    renderResults(blankPlan);

    expect(
      screen.getByText(
        /Not yet modelled: super is only drawn from 65 \(M6 lets you change this and checks the years before\), tax \(M8\)/,
      ),
    ).toBeInTheDocument();
  });

  it("says what is not modelled yet when complete", () => {
    renderResults(workedPlan);

    expect(
      screen.getByText(
        /Not yet modelled: super is only drawn from 65 \(M6 lets you change this and checks the years before\), tax \(M8\)/,
      ),
    ).toBeInTheDocument();
  });

  describe("with the projection", () => {
    it("shows the nominal FI number at retirement as a second sub-line, in nominal dollars", () => {
      renderResults(exampleA);

      expect(screen.getByText("$64,000/yr ÷ 4%")).toBeInTheDocument();
      expect(screen.getByText("$2,375,209 at age 50 (2042)")).toBeInTheDocument();
    });

    it("adds the inflation lines to the FI number breakdown", async () => {
      const user = userEvent.setup();
      renderResults(exampleA);

      await openExplanation(user, "FI number");

      const rows = explanationRows();
      expect(rows).toEqual([
        "Retirement spending per year$64,000",
        "÷ Safe withdrawal rate (default)4%",
        "= FI number$1,600,000",
        "× Inflation growth over 16 years1.4845",
        "= FI number at retirement$2,375,209",
      ]);
    });

    it("shows the year and age FI is reached, with its breakdown", async () => {
      const user = userEvent.setup();
      renderResults(exampleA);

      // The chart's hidden table and the Milestones card also show 2038 and age 46, so look inside the tile.
      const fiReachedTile = screen
        .getByText("FI reached", { selector: ".metric .label" })
        .closest<HTMLElement>(".metric")!;
      expect(within(fiReachedTile).getByText("2038")).toBeInTheDocument();
      expect(within(fiReachedTile).getByText("Age 46")).toBeInTheDocument();

      await openExplanation(user, "FI reached");
      expect(explanationRows()).toEqual([
        "Balance at end of 2038 (age 46)$2,158,231",
        "− FI number in 2038$2,151,822",
        "= FI reached$6,409",
      ]);
    });

    it("says the money lasts to the end age, with the money left and its breakdown (example A)", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      expect(screen.getByText("Money lasts")).toBeInTheDocument();
      expect(screen.getByText("To age 95 ✓")).toBeInTheDocument();
      expect(screen.getByText("$24,101,430 left in 2087 (nominal dollars)")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await openExplanation(user, "Money lasts");
      expect(explanationRows()).toEqual([
        "Cash at end of 2087 (age 95)$0",
        "+ Portfolio$24,101,430",
        "= Investable net worth$24,101,430",
      ]);
    });

    it("shows the earliest retirement age against the target, with its breakdown (example A)", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      expect(screen.getByText("Earliest retirement")).toBeInTheDocument();
      expect(screen.getByText("Age 43")).toBeInTheDocument();
      expect(screen.getByText("2035 · your target is 50 (2042)")).toBeInTheDocument();

      await openExplanation(user, "Earliest retirement");
      const rows = explanationRows();
      expect(rows).toHaveLength(3);
      expect(rows[0]).toMatch(/^Retiring at 42: runs short in 2085 \(age 93\)\$/);
      expect(rows[1]).toMatch(/^Retiring at 43: lasts to age 95\$/);
      expect(rows[2]).toBe("= Earliest feasible retirement age43");
    });

    it("shows the earliest retirement age when it is after the target (example B)", () => {
      renderResults(exampleB);

      expect(screen.getByText("Age 61")).toBeInTheDocument();
      expect(screen.getByText("2027 · your target is 60 (2026)")).toBeInTheDocument();
    });

    it("says when no retirement age is feasible", () => {
      renderResults({
        ...exampleB,
        expenses: {
          ...exampleB.expenses,
          datedExpenses: [
            { id: "big", name: "Huge", annual: 10_000_000, fromYear: 2028, toYear: 2028 },
          ],
        },
      });

      expect(screen.getByText("Not feasible by age 64")).toBeInTheDocument();
      expect(screen.getByText("Even retiring at 64, the money runs short")).toBeInTheDocument();
    });

    it("says when the money runs out, with the shortfall working (example B)", async () => {
      const user = userEvent.setup();
      renderResults(exampleB);

      expect(screen.getByText("Runs out at age 65")).toBeInTheDocument();
      expect(screen.getByText("2031 · 1 year can't be funded")).toBeInTheDocument();

      await openExplanation(user, "Money lasts");
      expect(explanationRows()).toEqual([
        "Spending to fund in 2031$30,000",
        "− Cash and portfolio available$23,271",
        "= Shortfall$6,729",
      ]);
    });

    it("adds the locked super to the breakdown of a year only super could fund (S4)", async () => {
      const user = userEvent.setup();
      // S4: retired at 60 with $500,000 super and nothing else; super is locked until 65.
      renderResults({
        ...blankPlan,
        household: {
          people: [
            {
              id: "person-1",
              label: "Person 1",
              currentAge: 60,
              targetRetirementAge: 60,
              superAccount: { balance: 500000, returnRate: 0 },
            },
          ],
          projectionEndAge: 67,
        },
        expenses: { livingAnnual: 20000 },
        assumptions: { inflationRate: 0 },
      });

      await openExplanation(user, "Money lasts");

      expect(explanationRows()).toEqual([
        "Spending to fund in 2027$20,000",
        "− Cash and portfolio available$0",
        "= Shortfall$20,000",
        "Super (not accessible until 65)$500,000",
      ]);
    });

    it("counts several unfunded years in the tile", () => {
      renderResults({ ...exampleB, household: { ...exampleB.household, projectionEndAge: 67 } });

      expect(screen.getByText("2031 · 3 years can't be funded")).toBeInTheDocument();
    });

    it("warns when the money runs out, linking down to the first unfunded year's row", async () => {
      const user = userEvent.setup();
      renderResults(exampleB);

      // The first alert is under the tiles; the Year by year section has its own below.
      const [runsOutBanner, shortfallBanner] = screen.getAllByRole("alert");
      expect(runsOutBanner).toHaveTextContent(
        "Your money runs out at age 65 (2031). See the years that can't be funded.",
      );
      expect(shortfallBanner).toHaveTextContent("1 year can't be funded: 2031");

      await user.click(screen.getByRole("link", { name: "See the years that can't be funded." }));
      expect(outlinedRowYear()).toBe("2031");
    });

    it("says FI isn't reached when no year gets there", () => {
      renderResults(exampleC);

      expect(screen.getByText("Not by age 95")).toBeInTheDocument();
      expect(screen.getByText("With today's inputs")).toBeInTheDocument();
    });

    it("keeps the M1 tiles and asks for the missing ages when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(screen.getByText("$1,600,000")).toBeInTheDocument();
      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.queryByText("FI reached")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Current age → Household" })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Target retirement age → Household" }),
      ).toBeInTheDocument();
    });

    it("links the plan-until age validation messages to the Household step", () => {
      renderResults({
        ...exampleA,
        household: { ...exampleA.household, projectionEndAge: 50 },
      });

      expect(
        screen.getByRole("link", {
          name: "Target retirement age must be before your plan-until age → Household",
        }),
      ).toBeInTheDocument();

      renderResults({
        ...exampleA,
        household: {
          people: [{ id: "person-1", label: "Person 1", currentAge: 60, targetRetirementAge: 60 }],
          projectionEndAge: 55,
        },
      });

      expect(
        screen.getByRole("link", {
          name: "Plan until age must be after your current age → Household",
        }),
      ).toBeInTheDocument();
    });
  });
  describe("the Coast FIRE tile", () => {
    /** Example D from tests/worked-examples/m4-coast.json: already coasting today. */
    const exampleAlreadyCoasting: Plan = {
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 45, targetRetirementAge: 60 }],
      },
      expenses: { livingAnnual: 50000 },
      portfolios: [
        { id: "portfolio-1", name: "Share portfolio", value: 1_000_000, expectedReturn: 0.07 },
      ],
    };

    /** Example E: never coasts before retirement. */
    const exampleNeverCoasts: Plan = {
      ...blankPlan,
      household: {
        people: [{ id: "person-1", label: "Person 1", currentAge: 30, targetRetirementAge: 40 }],
      },
      expenses: { livingAnnual: 80000 },
      assumptions: { inflationRate: 0.03 },
      portfolios: [
        {
          id: "portfolio-1",
          name: "Share portfolio",
          value: 10_000,
          expectedReturn: 0.05,
          annualContribution: 1000,
        },
      ],
    };

    /** The Coast FIRE tile's element, for scoping assertions to it. */
    function coastTile(): HTMLElement {
      return screen
        .getByText("Coast FIRE", { selector: ".metric .label" })
        .closest<HTMLElement>(".metric")!;
    }

    it("shows the number, the retirement-year figure and the year it is reached (example A)", () => {
      renderResults(exampleAWithCash);

      const tile = within(coastTile());
      expect(tile.getByText("$811,877")).toBeInTheDocument();
      expect(tile.getByText("$1,205,235 in 2042 dollars")).toBeInTheDocument();
      expect(tile.getByText("Reached in 2029, at age 37")).toBeInTheDocument();
    });

    it("comes right after Progress to FI", () => {
      renderResults(exampleAWithCash);

      const labels = Array.from(document.querySelectorAll(".metric .label")).map(
        (label) => label.textContent,
      );
      expect(labels.slice(0, 3)).toEqual(["FI number", "Progress to FI", "Coast FIRE"]);
    });

    it("reads the same in both dollar modes", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      await user.click(screen.getByRole("button", { name: "Today's dollars" }));

      const tile = within(coastTile());
      expect(tile.getByText("$811,877")).toBeInTheDocument();
      expect(tile.getByText("$1,205,235 in 2042 dollars")).toBeInTheDocument();
    });

    it("breaks the number into cash and portfolio, then the year it is reached (example A)", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      await openExplanation(user, "Coast FIRE");

      const rows = explanationRows();
      expect(rows).toContain("= Portfolio needed today$791,877");
      expect(rows).toContain("+ Your cash today$20,000");
      expect(rows).toContain("= Coast FIRE number$811,877");
      expect(rows).toContain("Investable at end of 2029 (age 37)$1,000,975");
      expect(rows).toContain("− Coast FIRE number in 2029$992,580");
      expect(rows).toContain("= Coast FIRE reached$8,395");
      expect(
        rows.some((row) => row?.startsWith("If you stop voluntary contributions after 2029")),
      ).toBe(true);
      expect(rows[rows.length - 1]).toBe("FI number at 2042$2,375,209");
    });

    it("includes the dated-expense line when one falls before retirement (example C)", async () => {
      const user = userEvent.setup();
      renderResults({
        ...exampleAWithCash,
        expenses: {
          ...exampleAWithCash.expenses,
          datedExpenses: [
            { id: "one-off", name: "One-off", annual: 100_000, fromYear: 2030, toYear: 2030 },
          ],
        },
      });

      expect(within(coastTile()).getByText("$890,925")).toBeInTheDocument();

      await openExplanation(user, "Coast FIRE");

      expect(
        explanationRows().some((row) => row?.startsWith("+ Dated expenses the portfolio")),
      ).toBe(true);
    });

    it("says contributions are optional when Coast FIRE is already reached (example D)", () => {
      renderResults(exampleAlreadyCoasting);

      const tile = within(coastTile());
      expect(tile.getByText("$656,162")).toBeInTheDocument();
      expect(tile.getByText("$950,319 in 2041 dollars")).toBeInTheDocument();
      expect(tile.getByText("Reached: contributions are now optional")).toBeInTheDocument();
    });

    it("says not before retirement, and ends the breakdown at the retirement year (example E)", async () => {
      const user = userEvent.setup();
      renderResults(exampleNeverCoasts);

      const tile = within(coastTile());
      expect(tile.getByText("$1,650,096")).toBeInTheDocument();
      expect(tile.getByText("$2,217,591 in 2036 dollars")).toBeInTheDocument();
      expect(tile.getByText("Not before retirement at 40")).toBeInTheDocument();

      await openExplanation(user, "Coast FIRE");

      const rows = explanationRows();
      expect(rows[rows.length - 3]).toMatch(/^Investable at end of 2036 \(age 40\)\$/);
      expect(rows[rows.length - 2]).toMatch(/^− Coast FIRE number in 2036\$/);
      expect(rows[rows.length - 1]).toMatch(/^= Short of Coast FIRE-\$/);
    });

    it("is left out when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(screen.queryByText("Coast FIRE")).not.toBeInTheDocument();
    });
  });

  describe("the Milestones card", () => {
    /** The text of each milestone, in the order the timeline shows them. */
    function milestoneTexts(): (string | null)[] {
      const card = screen.getByRole("heading", { name: "Milestones" }).closest("section")!;
      return within(card)
        .getAllByRole("listitem")
        .map((item) => item.textContent);
    }

    it("lists Coast FIRE, FI reached, retirement and money lasts in year order (example A)", () => {
      renderResults(exampleAWithCash);

      expect(milestoneTexts()).toEqual([
        "2029Coast FIREAge 37Projected",
        "2038FI reachedAge 46Projected",
        "2042Retirement (your target)Age 50Projected",
        "2087Money lasts to 95Projected",
      ]);
    });

    it("marks a milestone reached today as reached (example D)", () => {
      renderResults({
        ...blankPlan,
        household: {
          people: [{ id: "person-1", label: "Person 1", currentAge: 45, targetRetirementAge: 60 }],
        },
        expenses: { livingAnnual: 50000 },
        portfolios: [
          { id: "portfolio-1", name: "Share portfolio", value: 1_000_000, expectedReturn: 0.07 },
        ],
      });

      expect(milestoneTexts()[0]).toBe("2026Coast FIREAge 45Reached");
    });

    it("puts milestones that never happen last, in words (examples E and B)", () => {
      renderResults({
        ...blankPlan,
        household: {
          people: [{ id: "person-1", label: "Person 1", currentAge: 30, targetRetirementAge: 40 }],
        },
        expenses: { livingAnnual: 80000 },
        assumptions: { inflationRate: 0.03 },
        portfolios: [
          {
            id: "portfolio-1",
            name: "Share portfolio",
            value: 10_000,
            expectedReturn: 0.05,
            annualContribution: 1000,
          },
        ],
      });

      const texts = milestoneTexts();
      expect(texts.slice(-2)).toEqual([
        "Coast FIRE: not before retirementNot reached",
        "FI reached: not by age 95Not reached",
      ]);
    });

    it("says when the money runs out, with the year (example B)", () => {
      renderResults(exampleB);

      expect(milestoneTexts()).toContain("2031Money runs out at 65Projected");
    });

    it("is left out when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(screen.queryByRole("heading", { name: "Milestones" })).not.toBeInTheDocument();
    });
  });

  describe("the Coast FIRE chart card", () => {
    /** The chart card's element. */
    function coastChartCard(): HTMLElement {
      return screen
        .getByRole("heading", { name: "When could you stop contributing?" })
        .closest("section")!;
    }

    it("sits after chart (a) and before the Year by year section, with no toggle of its own", () => {
      renderResults(exampleAWithCash);

      const fireHeading = screen.getByRole("heading", {
        name: "Investable net worth vs FI number",
      });
      const coastHeading = screen.getByRole("heading", {
        name: "When could you stop contributing?",
      });
      const tableHeading = screen.getByRole("heading", { level: 2, name: "Year by year" });

      expect(
        fireHeading.compareDocumentPosition(coastHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        coastHeading.compareDocumentPosition(tableHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(within(coastChartCard()).queryByRole("group")).toBeNull();
    });

    it("has a caption in nominal dollars that says so", () => {
      renderResults(exampleAWithCash);

      expect(
        within(coastChartCard()).getByText(/With no more contributions from today/),
      ).toHaveTextContent(
        /^With no more contributions from today, your savings reach \$[\d,]+ by 2042, against an FI number of \$2,375,209 \(nominal dollars\)\.$/,
      );
    });

    it("follows the page's dollars toggle, with the same caption", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      const card = within(coastChartCard());
      // Nominal: the Coast FIRE number in 2042 equals the nominal FI number.
      expect(
        card.getByRole("row", { name: /^2042 50 \$[\d,]+ \$[\d,]+ \$2,375,209 \$2,375,209$/ }),
      ).toBeInTheDocument();
      const caption = card.getByText(/With no more contributions/).textContent;

      await user.click(screen.getByRole("button", { name: "Today's dollars" }));

      expect(
        card.getByRole("row", { name: /^2042 50 \$[\d,]+ \$[\d,]+ \$1,600,000 \$1,600,000$/ }),
      ).toBeInTheDocument();
      expect(card.getByText(/With no more contributions/).textContent).toBe(caption);
    });

    it("links to it from the top of the page", () => {
      renderResults(exampleA);

      const jumpLinks = screen.getByRole("navigation", { name: "On this page" });
      expect(within(jumpLinks).getByRole("link", { name: "Coast FIRE chart" })).toHaveAttribute(
        "href",
        "/results?view=coast-chart",
      );
    });

    it("is left out when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(
        screen.queryByRole("heading", { name: "When could you stop contributing?" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("the chart card", () => {
    it("shows the chart's name, a dollars toggle and the figures as a hidden table", () => {
      renderResults(exampleAWithCash);

      expect(
        screen.getByRole("heading", { name: "Investable net worth vs FI number" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("group", { name: "Show values in" })).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "Investable net worth against the FI number, by year" }),
      ).toBeInTheDocument();

      // Nominal by default: 2027 is cash $20,800 + portfolio $800,400, against a $1,640,000 FI number.
      expect(
        screen.getByRole("row", { name: /^2027 35 \$821,200 \$1,640,000$/ }),
      ).toBeInTheDocument();
    });

    it("follows the dollars toggle", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithCash);

      await user.click(screen.getByRole("button", { name: "Today's dollars" }));

      // $821,200 ÷ 1.025 and the unchanged FI number of $1,600,000.
      expect(
        screen.getByRole("row", { name: /^2027 35 \$801,171 \$1,600,000$/ }),
      ).toBeInTheDocument();
    });

    it("is left out when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(screen.queryByRole("heading", { name: /Investable net worth vs/ })).toBeNull();
      expect(screen.queryByRole("img")).toBeNull();
    });
  });

  describe("the one-page layout", () => {
    it("has one dollars toggle, in the page header, that also changes the table", async () => {
      const user = userEvent.setup();
      renderResults(exampleA);

      expect(screen.getAllByRole("group", { name: "Show values in" })).toHaveLength(1);
      const table = screen.getByRole("table", { name: "Year by year projection" });
      expect(within(table).getAllByText("$800,400").length).toBeGreaterThan(0);

      await user.click(screen.getByRole("button", { name: "Today's dollars" }));

      // 2027's portfolio (and investable), $800,400 ÷ 1.025.
      expect(within(table).queryByText("$800,400")).not.toBeInTheDocument();
      expect(within(table).getAllByText("$780,878").length).toBeGreaterThan(0);
    });

    it("ends with the Year by year section, after the chart", () => {
      renderResults(exampleA);

      const chartHeading = screen.getByRole("heading", {
        name: "Investable net worth vs FI number",
      });
      const tableHeading = screen.getByRole("heading", { level: 2, name: "Year by year" });

      expect(
        chartHeading.compareDocumentPosition(tableHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("links to the chart and the table from the top of the page", () => {
      renderResults(exampleA);

      const jumpLinks = screen.getByRole("navigation", { name: "On this page" });
      expect(within(jumpLinks).getByRole("link", { name: "Milestones" })).toHaveAttribute(
        "href",
        "/results?view=milestones",
      );
      expect(within(jumpLinks).getByRole("link", { name: "FIRE chart" })).toHaveAttribute(
        "href",
        "/results?view=fire-chart",
      );
      expect(within(jumpLinks).getByRole("link", { name: "Year by year ↓" })).toHaveAttribute(
        "href",
        "/results?view=year-by-year",
      );
    });

    it("leaves out the table and the links, with one missing-inputs banner, when the projection is incomplete", () => {
      renderResults(workedPlan);

      expect(screen.queryByRole("table", { name: "Year by year projection" })).toBeNull();
      expect(screen.queryByRole("navigation", { name: "On this page" })).toBeNull();
      expect(screen.getAllByRole("link", { name: "Current age → Household" })).toHaveLength(1);
    });
  });

  describe("with super", () => {
    /** Example A with $185,000 super, a $145,000 salary and salary sacrifice (tests/worked-examples/m5-super.json). */
    const exampleAWithSuper: Plan = {
      ...exampleA,
      cash: { balance: 20000 },
      assumptions: { interestRate: 0.04 },
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
              salarySacrifice: { annual: 10000, fromYear: 2027, toYear: 2042 },
            },
          },
        ],
      },
    };

    it("shows super as its own line in the money-lasts breakdown", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithSuper);

      await openExplanation(user, "Money lasts");

      const rows = explanationRows();
      expect(rows[0]).toMatch(/^Cash at end of 2087/);
      expect(rows.some((row) => row?.startsWith("+ Super$"))).toBe(true);
      expect(rows[rows.length - 1]).toMatch(/^= Investable net worth/);
    });

    it("shows super as its own line in the progress breakdown", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithSuper);

      await openExplanation(user, "Progress to FI");

      expect(explanationRows()).toEqual([
        "Share portfolio$720,000",
        "+ Cash savings$20,000",
        "+ Super$185,000",
        "= Investable amount$925,000",
        "÷ FI number$1,600,000",
        "= Progress to FI57.8%",
      ]);
    });

    it("shows the super lines in the Coast FIRE breakdown", async () => {
      const user = userEvent.setup();
      renderResults(exampleAWithSuper);

      await openExplanation(user, "Coast FIRE");

      const rows = explanationRows();
      expect(rows.some((row) => row?.startsWith("+ Your super today"))).toBe(true);
      expect(rows.some((row) => row?.startsWith("− Your super, growing at 7% net of fees"))).toBe(
        true,
      );
    });
  });
});
