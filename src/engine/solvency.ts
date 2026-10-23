// Does the money last? (OUT-3, OUT-4.) Reads the projection's rows and says
// whether every year to the end age was fully funded, or when it first wasn't.
//
//   projectPortfolio ─► rows ─► assessSolvency ─► Solvency ─► Results screen
//
// Pure, like the rest of the engine. The earliest-retirement search calls it
// once per candidate retirement age. For a couple, ages are quoted for both
// people ("Alex 52 · Sam 50") and each partner whose super is still locked is
// named in the locked-super note.

import type { Explained } from "./explained";
import { describeAges, isShortfallWithSuperLocked, type ProjectionRow } from "./projection";
import type { ExplanationLine } from "./explained";

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
      /** The first person's age in that year. */
      readonly firstPersonAge: number;
      /** Every person's age in that year, with their display names, for wording like "Alex 94 · Sam 92". */
      readonly ages: readonly { readonly label: string; readonly age: number }[];
      /** Every calendar year that can't be fully funded, in order. */
      readonly shortfallYears: readonly number[];
      /** That first year's spending, what was available, and the shortfall. */
      readonly explanation: Explained;
    };

/**
 * Checks the rows for shortfall years.
 *
 * If none, the plan "lasts", explained by cash + portfolio + super at the end age.
 * Otherwise it "runsOut" at the first shortfall year, and lists all of them
 * (the projection carries on after a shortfall, so later years can be flagged
 * too). `superAccessAge` is the effective access age (see
 * `effectiveSuperAccessAge`), used to word the locked-super note: one number
 * for one person, or one entry per person (in order, `undefined` for someone
 * without super) for a couple. Callers without super can leave it out. Called by `summariseProjection`
 * (src/engine/fiNumber.ts) and by the earliest-retirement search.
 */
export function assessSolvency(
  rows: readonly ProjectionRow[],
  superAccessAge?: number | readonly (number | undefined)[],
): Solvency {
  const shortfallRows = rows.filter((row) => row.shortfall > 0);
  const firstShortfall = shortfallRows[0];

  if (firstShortfall !== undefined) {
    const available = firstShortfall.fromCash + firstShortfall.fromPortfolio;

    // Super drawn (age 65 or later) is money that was available too, so the sum stays honest.
    const superLines: ExplanationLine[] =
      firstShortfall.fromSuper > 0
        ? [
            {
              label: "Super available",
              value: firstShortfall.fromSuper,
              unit: "dollars",
              operator: "−",
              source: "calculated",
            },
          ]
        : [];

    // A year before the access age that only locked super could have funded: say so, as a note
    // that is not part of the sum above it.
    const lockedSuperLines: ExplanationLine[] = isShortfallWithSuperLocked(firstShortfall)
      ? lockedSuperNotes(firstShortfall, superAccessAge)
      : [];
    return {
      status: "runsOut",
      year: firstShortfall.calendarYear,
      firstPersonAge: firstShortfall.people[0].age,
      ages: firstShortfall.people.map(({ label, age }) => ({ label, age })),
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
          ...superLines,
          {
            label: "Shortfall",
            value: firstShortfall.shortfall,
            unit: "dollars",
            operator: "=",
            source: "calculated",
          },
          ...lockedSuperLines,
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
                label: `Cash at end of ${lastRow.calendarYear} (${describeAges(lastRow)})`,
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
              // Super counts towards investable net worth, so the sum needs it when there is any.
              ...(lastRow.superClosing > 0
                ? [
                    {
                      label: "Super",
                      value: lastRow.superClosing,
                      unit: "dollars" as const,
                      operator: "+" as const,
                      source: "calculated" as const,
                    },
                  ]
                : []),
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

/**
 * The notes under a shortfall saying whose super is locked. One person keeps
 * the plain wording ("Super (not accessible until 65)"); in a couple each
 * person whose super has a balance but can't be drawn yet gets their own line
 * ("Sam's super (not accessible until 60)"). They are notes, not part of the
 * sum above them. Called by `assessSolvency`.
 */
function lockedSuperNotes(
  row: ProjectionRow,
  superAccessAge: number | readonly (number | undefined)[] | undefined,
): ExplanationLine[] {
  const accessAges = typeof superAccessAge === "number" ? [superAccessAge] : (superAccessAge ?? []);

  const untilWords = (accessAge: number | undefined): string =>
    accessAge === undefined ? "not yet accessible" : `not accessible until ${accessAge}`;

  if (row.people.length === 1) {
    return [
      {
        label: `Super (${untilWords(accessAges[0])})`,
        value: row.superClosing,
        unit: "dollars",
        source: "calculated",
      },
    ];
  }

  return row.people.flatMap((personYear, personIndex): ExplanationLine[] =>
    !personYear.superAccessible && personYear.superClosing > 0
      ? [
          {
            label: `${personYear.label}'s super (${untilWords(accessAges[personIndex])})`,
            value: personYear.superClosing,
            unit: "dollars",
            source: "calculated",
          },
        ]
      : [],
  );
}
