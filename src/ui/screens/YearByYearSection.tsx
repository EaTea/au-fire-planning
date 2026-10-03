import { useSearchParams } from "react-router";

import type { ProjectionSummary } from "../../engine/fiNumber";
import type { ProjectionRow } from "../../engine/projection";
import { Banner } from "../components/Banner";
import { ProjectionTable, type ProjectionColumn } from "../components/ProjectionTable";
import { useMoneyFormatter } from "../dollarsMode";

/** The complete variant of the projection summary: the only one with rows to show. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

/** The id of the section's heading, the target of Results' "Year by year" link and `?view=year-by-year`. */
export const YEAR_BY_YEAR_SECTION_ID = "year-by-year";

/** What YearByYearSection needs. */
interface YearByYearSectionProps {
  readonly projection: CompleteProjection;
}

/**
 * The Year by year section at the bottom of Results (OUT-1 – OUT-3): the
 * projection of cash and the portfolio as a table, from today to the
 * plan-until age, in whichever dollars the page's toggle shows. Bands mark
 * the working and retired phases, the FI row is highlighted, years that
 * can't be funded say "Shortfall" and are summarised in a banner above the
 * table, and `?year=` scrolls to and outlines a row (the chart and the
 * runs-out banner link there). Rendered by ResultsScreen only when the
 * projection is complete, so it has no missing-inputs state of its own.
 */
export function YearByYearSection({ projection }: YearByYearSectionProps) {
  const formatMoney = useMoneyFormatter();
  const [searchParams] = useSearchParams();

  const fiYearIndex = projection.fiReached?.yearIndex;

  // `?year=2038` (from the chart or the runs-out banner) asks for that year's row to be scrolled to and outlined.
  const requestedYear = Number(searchParams.get("year"));
  const requestedRow = projection.rows.find((row) => row.calendarYear === requestedYear);

  const shortfallYears =
    projection.solvency.status === "runsOut" ? projection.solvency.shortfallYears : [];

  // All money goes through formatMoney so it follows the dollars toggle.
  const columns: ProjectionColumn<ProjectionRow>[] = [
    { header: "Year", cell: (row) => row.calendarYear },
    { header: "Age", cell: (row) => row.age },
    {
      header: "Contributions",
      cell: (row) => formatMoney(row.contribution, row.inflationIndex),
    },
    {
      header: "Growth & interest",
      cell: (row) => formatMoney(row.portfolioGrowth + row.cashInterest, row.inflationIndex),
    },
    { header: "Spending", cell: (row) => formatMoney(row.spending, row.inflationIndex) },
    { header: "Cash", cell: (row) => formatMoney(row.cashClosing, row.inflationIndex) },
    { header: "Portfolio", cell: (row) => formatMoney(row.portfolioClosing, row.inflationIndex) },
    {
      header: "Investable",
      cell: (row) => formatMoney(row.investableClosing, row.inflationIndex),
    },
    { header: "FI number", cell: (row) => formatMoney(row.fiNumber, row.inflationIndex) },
    {
      header: "Status",
      // The word "Shortfall" and the minus sign mean it doesn't rely on colour alone.
      cell: (row) =>
        row.shortfall > 0 ? (
          <span className="projection-shortfall">
            Shortfall −{formatMoney(row.shortfall, row.inflationIndex)}
          </span>
        ) : (
          "✓"
        ),
    },
  ];

  return (
    <section className="year-by-year-section" aria-labelledby={YEAR_BY_YEAR_SECTION_ID}>
      <h2 id={YEAR_BY_YEAR_SECTION_ID}>Year by year</h2>
      <p className="section-intro">
        Your cash and portfolio each year: contributions, growth, spending and whether the money
        lasts.
      </p>

      {shortfallYears.length > 0 && (
        <Banner tone="warning">{describeShortfallYears(shortfallYears)}</Banner>
      )}

      <ProjectionTable
        label="Year by year projection"
        rows={projection.rows}
        columns={columns}
        getRowKey={(row) => row.yearIndex}
        isHighlighted={(row) => row.yearIndex === fiYearIndex}
        getBandText={(row) => phaseBandText[row.phase]}
        scrollToKey={requestedRow?.yearIndex}
      />
    </section>
  );
}

/** The heading of each phase's band row in the table. */
const phaseBandText: Record<ProjectionRow["phase"], string> = {
  working: "Working · contributing",
  retired: "Retired · spending drawn from cash, then the portfolio",
};

/**
 * Words for the shortfall banner: "3 years can't be funded: 2051 – 2053", with
 * consecutive years collapsed into ranges and separate runs joined by commas
 * ("2031, 2035 – 2036"). Used by YearByYearSection when the money runs out.
 */
function describeShortfallYears(years: readonly number[]): string {
  const sortedYears = [...years].sort((first, second) => first - second);

  // Group into runs of consecutive years.
  const runs: { first: number; last: number }[] = [];
  for (const year of sortedYears) {
    const lastRun = runs[runs.length - 1];
    if (lastRun !== undefined && year === lastRun.last + 1) {
      lastRun.last = year;
    } else {
      runs.push({ first: year, last: year });
    }
  }

  const rangeText = runs
    .map((run) => (run.first === run.last ? String(run.first) : `${run.first} – ${run.last}`))
    .join(", ");
  const countText = sortedYears.length === 1 ? "1 year" : `${sortedYears.length} years`;

  return `${countText} can't be funded: ${rangeText}`;
}
