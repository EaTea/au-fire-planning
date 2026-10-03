import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { Plan } from "../../plan/types";
import { blankPlan, renderSection } from "./sectionTestHelpers";
import { SuperSection } from "./SuperSection";

// Component tests for the Super card (the test clock is fixed in 2026): each
// field stores into the person's super account, clears back to its default,
// and respects its limits.

/** A plan whose only person has the given ages, so the retirement year is known. */
const agedPlan: Plan = {
  ...blankPlan,
  household: {
    people: [{ id: "person-1", label: "Person 1", currentAge: 40, targetRetirementAge: 60 }],
  },
};

/** Replaces whatever a field shows with `text` and commits it with Enter. */
async function enter(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, text: string) {
  await user.clear(field);
  await user.type(field, `${text}{Enter}`);
}

/** The first person's super account as stored in the plan. */
function superOf(plan: Plan) {
  return plan.household.people[0]?.superAccount;
}

describe("SuperSection defaults", () => {
  it("starts empty, showing the legislated rates and years as dashed defaults", () => {
    renderSection(<SuperSection />, agedPlan);

    expect(screen.getByLabelText("Super balance")).toHaveValue("$0");
    expect(screen.getByLabelText("Return, net of fees")).toHaveValue("7%");

    const employerRate = screen.getByLabelText("Employer contribution rate");
    expect(employerRate).toHaveValue("12% (legislated)");
    expect(employerRate.closest(".input")).toHaveClass("default");

    // Next year, and the retirement year (2026 + 60 − 40).
    expect(screen.getByLabelText("Salary sacrifice from year")).toHaveValue("2027");
    expect(screen.getByLabelText("Salary sacrifice to year")).toHaveValue("2046");
    expect(screen.getByLabelText("Non-concessional contributions from year")).toHaveValue("2027");
    expect(screen.getByLabelText("Non-concessional contributions to year")).toHaveValue("2046");
    expect(screen.getByLabelText("Salary sacrifice to year").closest(".input")).toHaveClass(
      "default",
    );
  });

  it("shows no 'to' default while the retirement age is unset", () => {
    renderSection(<SuperSection />);

    expect(screen.getByLabelText("Salary sacrifice to year")).toHaveValue("");
    expect(screen.getByLabelText("Non-concessional contributions to year")).toHaveValue("");
    expect(screen.getByLabelText("Salary sacrifice from year")).toHaveValue("2027");
  });

  it("shows the hints", () => {
    renderSection(<SuperSection />);

    expect(screen.getByText("After fees, before tax. The app takes off the tax on earnings."));
    expect(
      screen.getByText("Before tax, from your salary while you work. Taxed 15% going in."),
    ).toBeVisible();
    expect(screen.getByText("From after-tax money. Not taxed going in.")).toBeVisible();
  });
});

describe("SuperSection fields", () => {
  it("stores and clears the balance", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SuperSection />);

    await user.type(screen.getByLabelText("Super balance"), "180000{Enter}");
    expect(superOf(readPlan())).toEqual({ balance: 180000 });
    expect(screen.getByLabelText("Super balance")).toHaveValue("$180,000");

    await user.clear(screen.getByLabelText("Super balance"));
    await user.tab();
    expect(readPlan().household.people[0]).not.toHaveProperty("superAccount");
  });

  it("rejects a negative balance", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SuperSection />);

    await user.type(screen.getByLabelText("Super balance"), "-5{Enter}");

    expect(superOf(readPlan())).toBeUndefined();
    expect(screen.getByText(/Enter a number/)).toBeInTheDocument();
  });

  it.each([
    ["Return, net of fees", "returnRate", 0.065, "7%"],
    ["Employer contribution rate", "employerRate", 0.115, "12% (legislated)"],
  ] as const)(
    "stores %s as a fraction and restores the default",
    async (label, key, fraction, defaultText) => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<SuperSection />);

      await user.type(screen.getByLabelText(label), `${fraction * 100}{Enter}`);
      expect(superOf(readPlan())).toEqual({ [key]: fraction });

      await user.clear(screen.getByLabelText(label));
      await user.tab();
      expect(superOf(readPlan())).toBeUndefined();
      expect(screen.getByLabelText(label)).toHaveValue(defaultText);
    },
  );

  it("accepts a 0% employer rate (set, not default)", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SuperSection />);

    await user.type(screen.getByLabelText("Employer contribution rate"), "0{Enter}");

    expect(superOf(readPlan())).toEqual({ employerRate: 0 });
  });

  it.each(["Return, net of fees", "Employer contribution rate", "Tax on earnings"])(
    "limits %s to 0% to 100%",
    async (label) => {
      const user = userEvent.setup();
      const { readPlan } = renderSection(<SuperSection />);
      await user.click(screen.getByText("Advanced"));

      await enter(user, screen.getByLabelText(label), "101");
      expect(superOf(readPlan())).toBeUndefined();
      expect(screen.getByText(/at most 100%/)).toBeInTheDocument();

      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), "-1{Enter}");
      expect(superOf(readPlan())).toBeUndefined();
    },
  );

  it.each([
    ["Salary sacrifice per year", "salarySacrifice"],
    ["Non-concessional contributions per year", "nonConcessional"],
  ] as const)("stores, clears and limits %s", async (label, key) => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SuperSection />);

    await user.type(screen.getByLabelText(label), "10000{Enter}");
    expect(superOf(readPlan())).toEqual({ [key]: { annual: 10000 } });

    await user.clear(screen.getByLabelText(label));
    await user.type(screen.getByLabelText(label), "-5{Enter}");
    expect(screen.getByText(/Enter a number/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(label));
    await user.tab();
    expect(superOf(readPlan())).toBeUndefined();
  });
});

describe("SuperSection contribution years", () => {
  it.each([
    ["Salary sacrifice", "salarySacrifice"],
    ["Non-concessional contributions", "nonConcessional"],
  ] as const)("%s keeps To at or after From, and limits the years", async (name, key) => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SuperSection />, agedPlan);

    const from = screen.getByLabelText(`${name} from year`);
    const to = screen.getByLabelText(`${name} to year`);

    await user.type(to, "2035{Enter}");
    await user.type(from, "2030{Enter}");
    expect(superOf(readPlan())).toEqual({ [key]: { fromYear: 2030, toYear: 2035 } });

    // From passes To: To follows.
    await enter(user, from, "2040");
    expect(superOf(readPlan())).toEqual({ [key]: { fromYear: 2040, toYear: 2040 } });
    expect(to).toHaveValue("2040");

    // Clearing both goes back to the dashed defaults.
    await user.clear(from);
    await user.tab();
    await user.clear(to);
    await user.tab();
    expect(superOf(readPlan())).toBeUndefined();
    expect(from).toHaveValue("2027");
    expect(to).toHaveValue("2046");

    // Limits: not before next year, not after 2200.
    await enter(user, from, "2026");
    expect(screen.getByText(/at least 2027/)).toBeInTheDocument();
    await user.clear(from);
    await user.type(from, "2201{Enter}");
    expect(screen.getByText(/at most 2200/)).toBeInTheDocument();
    expect(superOf(readPlan())).toBeUndefined();
  });
});

describe("SuperSection advanced", () => {
  it("keeps tax on earnings in a closed disclosure whose summary can be reached by keyboard", async () => {
    const user = userEvent.setup();
    const { container } = renderSection(<SuperSection />);

    const details = container.querySelector("details");
    expect(details).not.toHaveAttribute("open");

    // Tab through every field ahead of the summary, then open it with Enter.
    const summary = screen.getByText("Advanced");
    for (let presses = 0; presses < 20 && summary !== document.activeElement; presses += 1) {
      await user.tab();
    }
    expect(summary).toHaveFocus();
  });

  it("shows the legislated 15% by default, stores a typed rate, and restores the default", async () => {
    const user = userEvent.setup();
    const { readPlan } = renderSection(<SuperSection />);
    await user.click(screen.getByText("Advanced"));

    const tax = screen.getByLabelText("Tax on earnings");
    expect(tax).toHaveValue("15% (legislated)");
    expect(tax.closest(".input")).toHaveClass("default");
    expect(screen.getByText(/15% is the most the law charges/)).toBeVisible();

    await user.type(tax, "10{Enter}");
    expect(superOf(readPlan())).toEqual({ earningsTaxRate: 0.1 });

    await user.clear(tax);
    await user.tab();
    expect(superOf(readPlan())).toBeUndefined();
    expect(tax).toHaveValue("15% (legislated)");
  });
});

describe("SuperSection people", () => {
  it("prefixes labels with names when there are two people", () => {
    renderSection(<SuperSection />, {
      ...blankPlan,
      household: {
        people: [
          { id: "a", label: "Alex" },
          { id: "s", label: "Sam" },
        ],
      },
    });

    expect(screen.getByLabelText("Alex: Super balance")).toBeInTheDocument();
    expect(screen.getByLabelText("Sam: Salary sacrifice from year")).toBeInTheDocument();
  });
});
