import { useSearchParams } from "react-router";

import { projectionHasSuper } from "../../engine/bridge";
import type { ProjectionSummary } from "../../engine/fiNumber";
import { isShortfallWithSuperLocked, type ProjectionRow } from "../../engine/projection";
import { Banner } from "../components/Banner";
import { ProjectionTable, type ProjectionColumn } from "../components/ProjectionTable";
import { useMoneyFormatter } from "../dollarsMode";
import { formatYearRuns } from "../format";

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
 * projection of cash, the portfolio and super as a table, from today to the
 * plan-until age, in whichever dollars the page's toggle shows. Bands mark
 * the working phase and the retired years (split into the bridge and super
 * accessible when there is super), the FI row is highlighted, years that
 * can't be funded say "Shortfall" and are summarised in a banner above the
 * table, and `?year=` scrolls to and outlines a row (the chart and the
 * runs-out banner link there). Rendered by ResultsScreen only when the
 * projection is complete, so it has no missing-inputs state of its own.
 */
export function YearByYearSection({ projection }: YearByYearSectionProps) {
  const formatMoney = useMoneyFormatter();
  const [searchParams] = useSearchParams();

  // The engine always carries a super account, so "no super" means it never holds money.
  const hasSuper = projectionHasSuper(projection.rows);

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
      header: "Salary",
      // "—" rather than $0 once retired, so a blank year doesn't read as a zero salary.
      cell: (row) => (row.salary > 0 ? formatMoney(row.salary, row.inflationIndex) : "—"),
    },
    {
      header: "Into portfolio",
      cell: (row) => formatMoney(row.contribution, row.inflationIndex),
    },
    {
      header: "Into super",
      // Concessional contributions after the 15% tax, plus non-concessional (which isn't taxed going in).
      cell: (row) =>
        formatMoney(
          row.employerContribution +
            row.salarySacrifice -
            row.contributionsTax +
            row.nonConcessional,
          row.inflationIndex,
        ),
    },
    {
      header: "Growth & interest",
      cell: (row) => formatMoney(row.portfolioGrowth + row.cashInterest, row.inflationIndex),
    },
    { header: "Spending", cell: (row) => formatMoney(row.spending, row.inflationIndex) },
    { header: "Cash", cell: (row) => formatMoney(row.cashClosing, row.inflationIndex) },
    { header: "Portfolio", cell: (row) => formatMoney(row.portfolioClosing, row.inflationIndex) },
    { header: "Super", cell: (row) => formatMoney(row.superClosing, row.inflationIndex) },
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
            {isShortfallWithSuperLocked(row) &&
              projection.superAccessAge !== undefined &&
              ` · super locked until ${projection.superAccessAge}`}
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
        Your cash, portfolio and super each year: money in, growth, spending and whether the money
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
        getBandText={(row) => bandTextForRow(row, hasSuper ? projection.superAccessAge : undefined)}
        scrollToKey={requestedRow?.yearIndex}
      />
    </section>
  );
}

/**
 * The band a row belongs to. The ordering, top to bottom:
 *
 *   Working · contributing
 *   Bridge · retired, super locked until {age}   (retired years before super opens)
 *   Super accessible                             (retired years from then on)
 *
 * With no super (`superAccessAge` undefined) the two retired bands are
 * replaced by the single "Retired" band, as before M6. When you retire at or
 * after the access age there is no bridge, so "Super accessible" opens the
 * retired years directly. A band row opens wherever the text changes, so each
 * of these appears once. Used by YearByYearSection.
 */
function bandTextForRow(row: ProjectionRow, superAccessAge: number | undefined): string {
  if (row.phase === "working" || superAccessAge === undefined) return phaseBandText[row.phase];

  return row.superAccessible
    ? "Super accessible"
    : `Bridge · retired, super locked until ${superAccessAge}`;
}

/** The heading of each phase's band row in the table, for plans without super. */
const phaseBandText: Record<ProjectionRow["phase"], string> = {
  working: "Working · contributing",
  retired: "Retired · spending drawn from the portfolio, then cash",
};

/**
 * Words for the shortfall banner: "3 years can't be funded: 2051 – 2053", with
 * consecutive years collapsed into ranges and separate runs joined by commas
 * ("2031, 2035 – 2036"). Used by YearByYearSection when the money runs out.
 */
function describeShortfallYears(years: readonly number[]): string {
  const countText = years.length === 1 ? "1 year" : `${years.length} years`;

  return `${countText} can't be funded: ${formatYearRuns(years)}`;
}
