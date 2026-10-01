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
});
