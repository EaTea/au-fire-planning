// Does the money last? (OUT-3, OUT-4.) Reads the projection's rows and says
// whether every year to the end age was fully funded, or when it first wasn't.
//
//   projectPortfolio ─► rows ─► assessSolvency ─► Solvency ─► Results screen
//
// Pure, like the rest of the engine. PR B's earliest-retirement search will
// call it once per candidate retirement age.

import type { Explained } from "./explained";
import type { ProjectionRow } from "./projection";

/** Whether the plan's money lasts to the end age, with the working behind the answer. */
export type Solvency =
  | {
      readonly status: "lasts";
      /** The investable net worth at the end age. */
      readonly explanation: Explained;
    }
  | {
      readonly status: "runsOut";
      /** The first calendar year spending can't be fully funded. */
      readonly year: number;
      /** The age in that year. */
      readonly age: number;
      /** Every calendar year that can't be fully funded, in order. */
      readonly shortfallYears: readonly number[];
      /** That first year's spending, what was available, and the shortfall. */
      readonly explanation: Explained;
    };

/**
 * Checks the rows for shortfall years.
 *
 * If none, the plan "lasts", explained by cash + portfolio at the end age.
 * Otherwise it "runsOut" at the first shortfall year, and lists all of them
 * (the projection carries on after a shortfall, so later years can be flagged
 * too). Called by `summariseProjection` (src/engine/fiNumber.ts).
 */
export function assessSolvency(rows: readonly ProjectionRow[]): Solvency {
  const shortfallRows = rows.filter((row) => row.shortfall > 0);
  const firstShortfall = shortfallRows[0];

  if (firstShortfall !== undefined) {
    const available = firstShortfall.fromCash + firstShortfall.fromPortfolio;

    return {
      status: "runsOut",
      year: firstShortfall.calendarYear,
      age: firstShortfall.age,
      shortfallYears: shortfallRows.map((row) => row.calendarYear),
      explanation: {
        value: firstShortfall.shortfall,
        unit: "dollars",
        lines: [
          {
            label: `Spending to fund in ${firstShortfall.calendarYear}`,
            value: firstShortfall.spending,
            unit: "dollars",
            source: "calculated",
          },
          {
            label: "Cash and portfolio available",
            value: available,
            unit: "dollars",
            operator: "−",
            source: "calculated",
          },
          {
            label: "Shortfall",
            value: firstShortfall.shortfall,
            unit: "dollars",
            operator: "=",
            source: "calculated",
          },
        ],
      },
    };
  }

  const lastRow = rows[rows.length - 1];

  return {
    status: "lasts",
    explanation: {
      value: lastRow?.investableClosing ?? 0,
      unit: "dollars",
      lines:
        lastRow === undefined
          ? []
          : [
              {
                label: `Cash at end of ${lastRow.calendarYear} (age ${lastRow.age})`,
                value: lastRow.cashClosing,
                unit: "dollars",
                source: "calculated",
              },
              {
                label: "Portfolio",
                value: lastRow.portfolioClosing,
                unit: "dollars",
                operator: "+",
                source: "calculated",
              },
              {
                label: "Investable net worth",
                value: lastRow.investableClosing,
                unit: "dollars",
                operator: "=",
                source: "calculated",
              },
            ],
    },
  };
}
