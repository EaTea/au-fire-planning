import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Explained } from "../../engine/explained";
import { ExplainPanel } from "./ExplainPanel";

const fiNumberExplained: Explained = {
  value: 1600000,
  unit: "dollars",
  lines: [
    { label: "Retirement spending per year", value: 64000, unit: "dollars", source: "calculated" },
    {
      label: "Safe withdrawal rate",
      value: 0.04,
      unit: "fraction",
      operator: "÷",
      source: "default",
    },
    { label: "FI number", value: 1600000, unit: "dollars", operator: "=", source: "calculated" },
  ],
};

describe("ExplainPanel", () => {
  it("renders one row per line, formatted by unit", () => {
    render(<ExplainPanel explained={fiNumberExplained} />);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("$64,000")).toBeInTheDocument();
    expect(screen.getByText("4%")).toBeInTheDocument();
    expect(screen.getByText("$1,600,000")).toBeInTheDocument();
  });

  it("shows each line's operator", () => {
    render(<ExplainPanel explained={fiNumberExplained} />);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("÷ Safe withdrawal rate");
    expect(rows[2]).toHaveTextContent("= FI number");
  });

  it("marks default values", () => {
    render(<ExplainPanel explained={fiNumberExplained} />);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("(default)");
    expect(rows[0]).not.toHaveTextContent("(default)");
  });

  it("shows only the result line in bold", () => {
    render(<ExplainPanel explained={fiNumberExplained} />);

    const [firstRow, middleRow, resultRow] = screen.getAllByRole("row") as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    expect(resultRow.querySelectorAll("b")).toHaveLength(2);
    expect(firstRow.querySelector("b")).toBeNull();
    expect(middleRow.querySelector("b")).toBeNull();
  });

  // A factor line reads "× Label ... 1.3213": the × comes from the operator, the value is a plain multiplier.
  it("shows a factor line as a four-decimal multiplier", () => {
    const inflationExplained: Explained = {
      value: 2375208.99,
      unit: "dollars",
      lines: [
        { label: "FI number today", value: 1600000, unit: "dollars", source: "calculated" },
        {
          label: "Inflation growth over 16 years",
          value: 1.484505,
          unit: "factor",
          operator: "×",
          source: "calculated",
        },
        {
          label: "FI number at retirement",
          value: 2375208.99,
          unit: "dollars",
          operator: "=",
          source: "calculated",
        },
      ],
    };

    render(<ExplainPanel explained={inflationExplained} />);

    const row = screen.getAllByRole("row")[1];
    expect(row).toHaveTextContent("× Inflation growth over 16 years");
    expect(row).toHaveTextContent("1.4845");
    expect(row).not.toHaveTextContent("%");
  });

  // An age or a count of years is a plain whole number: no dollar sign, no percent, no decimals.
  it("shows a years line as a plain whole number", () => {
    const ageExplained: Explained = {
      value: 43,
      unit: "years",
      lines: [
        {
          label: "Earliest feasible retirement age",
          value: 43,
          unit: "years",
          operator: "=",
          source: "calculated",
        },
      ],
    };

    render(<ExplainPanel explained={ageExplained} />);

    const row = screen.getAllByRole("row")[0];
    expect(row).toHaveTextContent("Earliest feasible retirement age43");
    expect(row).not.toHaveTextContent("$");
    expect(row).not.toHaveTextContent("%");
  });
});
