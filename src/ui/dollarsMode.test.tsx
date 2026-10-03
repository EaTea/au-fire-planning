import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DollarsModeProvider, DollarsModeToggle, useMoneyFormatter } from "./dollarsMode";

/** Shows $1,640,000 at index 1.025 through the formatter, so tests can read the result. */
function MoneyProbe() {
  const formatMoney = useMoneyFormatter();
  return <p data-testid="money">{formatMoney(1640000, 1.025)}</p>;
}

// Tests for the today's/nominal choice and the formatter that follows it.
describe("dollars mode", () => {
  // $1,640,000 in a year with index 1.025 is $1,600,000 today.
  it("divides by the inflation index in today's mode", () => {
    render(
      <DollarsModeProvider initialMode="today">
        <MoneyProbe />
      </DollarsModeProvider>,
    );

    expect(screen.getByTestId("money")).toHaveTextContent("$1,600,000");
  });

  // The default: nominal values are shown as they are.
  it("shows the nominal value as it is in nominal mode", () => {
    render(
      <DollarsModeProvider>
        <MoneyProbe />
      </DollarsModeProvider>,
    );

    expect(screen.getByTestId("money")).toHaveTextContent("$1,640,000");
  });

  // The toggle starts on nominal dollars and switches both ways.
  it("switches mode with the toggle", async () => {
    const user = userEvent.setup();
    render(
      <DollarsModeProvider>
        <DollarsModeToggle />
        <MoneyProbe />
      </DollarsModeProvider>,
    );

    expect(screen.getByRole("button", { name: "Nominal" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("money")).toHaveTextContent("$1,640,000");

    await user.click(screen.getByRole("button", { name: "Today's dollars" }));
    expect(screen.getByTestId("money")).toHaveTextContent("$1,600,000");
    expect(screen.getByRole("button", { name: "Today's dollars" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Nominal" }));
    expect(screen.getByTestId("money")).toHaveTextContent("$1,640,000");
  });

  it("fails clearly when used outside the provider", () => {
    const consoleError = console.error;
    console.error = () => {};

    try {
      expect(() => render(<MoneyProbe />)).toThrow(
        "useDollarsMode must be used inside a DollarsModeProvider",
      );
    } finally {
      console.error = consoleError;
    }
  });
});
