import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectionTable } from "./ProjectionTable";

/** A tiny row type, so the table is tested without any engine types. */
interface TestRow {
  readonly year: number;
  readonly amount: number;
}

const rows: TestRow[] = [
  { year: 2026, amount: 10 },
  { year: 2027, amount: 20 },
  { year: 2028, amount: 30 },
];

const columns = [
  { header: "Year", cell: (row: TestRow) => row.year },
  { header: "Amount", cell: (row: TestRow) => `$${row.amount}` },
];

describe("ProjectionTable", () => {
  it("renders a header row and one row per item, using each column's cell", () => {
    render(
      <ProjectionTable
        label="Test table"
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.year}
      />,
    );

    const table = screen.getByRole("table", { name: "Test table" });
    const rowTexts = within(table)
      .getAllByRole("row")
      .map((row) => row.textContent);

    expect(rowTexts).toEqual(["YearAmount", "2026$10", "2027$20", "2028$30"]);
  });

  it("highlights only the rows the predicate selects", () => {
    render(
      <ProjectionTable
        label="Test table"
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.year}
        isHighlighted={(row) => row.year === 2027}
      />,
    );

    const highlighted = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("data-highlighted") === "true");

    expect(highlighted.map((row) => row.textContent)).toEqual(["2027$20"]);
  });

  it("highlights nothing when no predicate is given", () => {
    render(
      <ProjectionTable
        label="Test table"
        rows={rows}
        columns={columns}
        getRowKey={(r) => r.year}
      />,
    );

    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });
});
