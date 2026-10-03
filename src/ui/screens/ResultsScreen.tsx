import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router";

import type { Explained, ExplanationLine } from "../../engine/explained";
import { usePlanSummary } from "../../plan/PlanProvider";
import { Banner } from "../components/Banner";
import { MetricTile } from "../components/MetricTile";
import { StepPage } from "../components/StepPage";
import { DollarsModeToggle } from "../dollarsMode";
import { formatDollars, formatPercent } from "../format";
import { steps } from "../navigation/steps";
import { COAST_CHART_SECTION_ID, CoastChartSection } from "../sections/CoastChartSection";
import { FIRE_CHART_SECTION_ID, FireChartSection } from "../sections/FireChartSection";
import { MILESTONES_SECTION_ID, MilestonesSection } from "../sections/MilestonesSection";
import { MissingInputsBanner } from "./MissingInputsBanner";
import { YEAR_BY_YEAR_SECTION_ID, YearByYearSection } from "./YearByYearSection";

const step = steps.find((candidate) => candidate.id === "results")!;

/**
 * Joins the FI number's working with the extra lines that carry it forward
 * to the retirement age (FIRE-1). The projection's own first line ("FI number
 * today") repeats the "= FI number" line that ends the first breakdown, so it
 * is left out.
 */
function combineFiNumberExplanations(fiNumber: Explained, atRetirement: Explained): Explained {
  return { ...fiNumber, lines: [...fiNumber.lines, ...atRetirement.lines.slice(1)] };
}

/**
 * The Results step: the headline tiles (FIRE-1 – FIRE-3, OUT-3, OUT-4), each
 * with its breakdown, the milestones, the FIRE chart, the Coast FIRE chart, and then every year of the plan in the
 * Year by year section (OUT-1), all following the one dollars toggle in the
 * page header (OUT-2). If the plan is incomplete it lists what's still
 * missing instead, linked to the steps where it is entered. Always shows what
 * isn't modelled yet so the figures aren't over-trusted. `?view=` scrolls to
 * a section and `?year=` to a row of the table. Reads the engine's summary
 * via usePlanSummary(); routed from App.
 */
export function ResultsScreen() {
  const summary = usePlanSummary();
  const projection = summary.status === "complete" ? summary.projection : undefined;
  const projectionComplete = projection?.status === "complete";

  useScrollToRequestedSection();

  return (
    <StepPage
      step={step}
      intro="Your FI number, when you could reach it and retire, whether the money lasts, and every year of the plan behind those figures."
      headerAction={<DollarsModeToggle />}
    >
      {projectionComplete && <JumpLinks />}

      <div className="results-stack">
        {summary.status === "complete" ? (
          <>
            <FiNumberTile summary={summary} />

            <MetricTile
              label="Progress to FI"
              value={formatPercent(summary.progressToFi.value)}
              subLine={`${formatDollars(summary.investable.value)} invested of ${formatDollars(summary.fiNumber.value)}`}
              explanation={summary.progressToFi}
            />

            {summary.projection.status === "complete" ? (
              <>
                <CoastFireTile projection={summary.projection} />
                <FiReachedTile projection={summary.projection} />
                <EarliestRetirementTile projection={summary.projection} />
                <MoneyLastsTile projection={summary.projection} />
                <RunsOutBanner projection={summary.projection} />
                <MilestonesSection projection={summary.projection} />
                <FireChartSection projection={summary.projection} />
                <CoastChartSection projection={summary.projection} />
              </>
            ) : (
              <MissingInputsBanner missing={summary.projection.missing} />
            )}
          </>
        ) : (
          <MissingInputsBanner missing={summary.missing} />
        )}

        <Banner tone="info">
          Not yet modelled: super (M5), the bridge to super (M6), tax (M8), property (M12) and more.
        </Banner>
      </div>

      {projection?.status === "complete" && <YearByYearSection projection={projection} />}
    </StepPage>
  );
}

/**
 * The "On this page" links under the title: Results is long once it ends
 * with the table, so these jump to the milestones, the charts and the table. They set
 * `?view=`, which useScrollToRequestedSection acts on. Shown only when the
 * projection is complete, since both targets need it.
 */
function JumpLinks() {
  return (
    <nav className="page-jump-links" aria-label="On this page">
      <span>On this page:</span>
      <Link to={`${step.path}?view=${MILESTONES_SECTION_ID}`}>Milestones</Link>
      <Link to={`${step.path}?view=${FIRE_CHART_SECTION_ID}`}>FIRE chart</Link>
      <Link to={`${step.path}?view=${COAST_CHART_SECTION_ID}`}>Coast FIRE chart</Link>
      <Link to={`${step.path}?view=${YEAR_BY_YEAR_SECTION_ID}`}>Year by year ↓</Link>
    </nav>
  );
}

/**
 * Scrolls the element named by `?view=` (a section id, e.g. "year-by-year")
 * into view. Keyed on the location as well, so following the same link twice
 * scrolls again. Called by ResultsScreen; rows (`?year=`) are scrolled by the
 * table itself.
 */
function useScrollToRequestedSection() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const requestedSection = searchParams.get("view");

  useEffect(() => {
    if (requestedSection === null) return;

    // jsdom has no layout and no scrollIntoView.
    document.getElementById(requestedSection)?.scrollIntoView?.({ block: "start" });
  }, [requestedSection, location.key]);
}

/** The complete variant of the plan summary, as ResultsScreen receives it. */
type CompleteSummary = Extract<ReturnType<typeof usePlanSummary>, { status: "complete" }>;

/**
 * The FI number tile: today's-dollar figure with its calculation. When the
 * projection is complete it gains a second sub-line with the nominal figure
 * at the target retirement age (FIRE-1), always in nominal dollars (it does
 * not follow the today's/nominal toggle), and the working for it.
 */
function FiNumberTile({ summary }: { readonly summary: CompleteSummary }) {
  const { projection } = summary;
  const todaySubLine = `${formatDollars(summary.retirementSpending.value)}/yr ÷ ${formatPercent(summary.safeWithdrawalRate)}`;

  if (projection.status !== "complete") {
    return (
      <MetricTile
        label="FI number"
        value={formatDollars(summary.fiNumber.value)}
        subLine={todaySubLine}
        explanation={summary.fiNumber}
      />
    );
  }

  const atRetirementLine = `${formatDollars(projection.fiNumberAtRetirement.value)} at age ${projection.retirementAge} (${projection.retirementYear})`;

  return (
    <MetricTile
      label="FI number"
      value={formatDollars(summary.fiNumber.value)}
      subLine={[todaySubLine, atRetirementLine]}
      explanation={combineFiNumberExplanations(summary.fiNumber, projection.fiNumberAtRetirement)}
    />
  );
}

/**
 * The "FI reached" tile (OUT-4): the year the projected balance first meets
 * that year's FI number, or a note that it doesn't by the end of the projection.
 */
function FiReachedTile({
  projection,
}: {
  readonly projection: Extract<CompleteSummary["projection"], { status: "complete" }>;
}) {
  const { fiReached } = projection;

  if (fiReached === undefined) {
    return (
      <MetricTile
        label="FI reached"
        value={`Not by age ${projection.endAge}`}
        subLine="With today's inputs"
      />
    );
  }

  return (
    <MetricTile
      label="FI reached"
      value={String(fiReached.calendarYear)}
      subLine={`Age ${fiReached.age}`}
      explanation={fiReached.explanation}
    />
  );
}

/** The complete variant of the projection summary, as the solvency pieces receive it. */
type CompleteProjection = Extract<CompleteSummary["projection"], { status: "complete" }>;

/**
 * The "Earliest retirement" tile (FIRE-3): the first age at which retiring
 * still leaves the money lasting to the plan-until age, with the year and how
 * it compares with the target retirement age (read from the projection
 * summary). If no age works, says so; the last age tried is one before the
 * plan-until age. Shown only when the projection is complete. The ages and
 * years don't follow the dollars toggle.
 */
function EarliestRetirementTile({ projection }: { readonly projection: CompleteProjection }) {
  const { earliestRetirement } = projection;

  if (earliestRetirement.status === "notFeasible") {
    const lastAgeTried = projection.endAge - 1;

    return (
      <MetricTile
        label="Earliest retirement"
        value={`Not feasible by age ${lastAgeTried}`}
        subLine={`Even retiring at ${lastAgeTried}, the money runs short`}
        explanation={earliestRetirement.explanation}
      />
    );
  }

  return (
    <MetricTile
      label="Earliest retirement"
      value={`Age ${earliestRetirement.age}`}
      subLine={`${earliestRetirement.year} · your target is ${projection.retirementAge} (${projection.retirementYear})`}
      explanation={earliestRetirement.explanation}
    />
  );
}

/**
 * The "Money lasts" tile (OUT-3, OUT-4): whether cash and the portfolio fund
 * every year to the plan-until age, with the working behind it. Shown only
 * when the projection is complete. The money left is nominal in the end year,
 * like the FI number at retirement, so it doesn't follow the dollars toggle.
 */
function MoneyLastsTile({ projection }: { readonly projection: CompleteProjection }) {
  const { solvency } = projection;

  if (solvency.status === "lasts") {
    const lastRow = projection.rows[projection.rows.length - 1];

    return (
      <MetricTile
        label="Money lasts"
        value={`To age ${projection.endAge} ✓`}
        subLine={`${formatDollars(solvency.explanation.value)} left in ${lastRow?.calendarYear} (nominal dollars)`}
        explanation={solvency.explanation}
      />
    );
  }

  const yearCount = solvency.shortfallYears.length;

  return (
    <MetricTile
      label="Money lasts"
      value={`Runs out at age ${solvency.age}`}
      subLine={`${solvency.year} · ${yearCount === 1 ? "1 year" : `${yearCount} years`} can't be funded`}
      explanation={solvency.explanation}
    />
  );
}

/**
 * A warning under the tiles when the money runs out, linking down to the
 * first unfunded year's row in the Year by year section (`?year=`). Renders
 * nothing when the money lasts.
 */
function RunsOutBanner({ projection }: { readonly projection: CompleteProjection }) {
  const { solvency } = projection;
  if (solvency.status !== "runsOut") return null;

  const firstShortfallYear = Math.min(...solvency.shortfallYears);

  return (
    <Banner tone="warning">
      <div>
        Your money runs out at age {solvency.age} ({solvency.year}).{" "}
        <Link to={`${step.path}?year=${firstShortfallYear}`}>
          See the years that can&apos;t be funded.
        </Link>
      </div>
    </Banner>
  );
}

/**
 * The "Coast FIRE" tile (COAST-1, COAST-2): the savings you need today so
 * that, with no further contributions, you would still reach the FI number
 * by your target retirement age; the same amount in the retirement year's
 * dollars; and whether (and when) your savings get there. Placed after
 * "Progress to FI". The headline is a figure for today (row 0), so it reads
 * the same in both dollar modes and does not use the dollars-mode formatter;
 * the retirement-year figure is nominal by definition. Shown only when the
 * projection is complete, since it needs the retirement year.
 */
function CoastFireTile({ projection }: { readonly projection: CompleteProjection }) {
  const { coast } = projection;

  const inRetirementYearLine = `${formatDollars(coast.numberInRetirementYearDollars)} in ${projection.retirementYear} dollars`;
  const statusLine = describeCoastFireStatus(coast.reached, projection.retirementAge);

  return (
    <MetricTile
      label="Coast FIRE"
      value={formatDollars(coast.number.value)}
      subLine={[inRetirementYearLine, statusLine]}
      explanation={explainCoastFireTile(coast)}
    />
  );
}

/**
 * The tile's status sub-line: reached already (year 0), reached in a later
 * year, or not before retirement. Used by CoastFireTile.
 */
function describeCoastFireStatus(
  reached: CompleteProjection["coast"]["reached"],
  retirementAge: number,
): string {
  if (reached === undefined) return `Not before retirement at ${retirementAge}`;
  if (reached.yearIndex === 0) return "Reached: contributions are now optional";

  return `Reached in ${reached.calendarYear}, at age ${reached.age}`;
}

/**
 * The Coast FIRE tile's breakdown: the number's own lines, then either the
 * year it is reached (the engine's lines) or, when it isn't reached, the
 * retirement-year row: investable net worth against the Coast FIRE number,
 * ending in the (negative) margin. Used by CoastFireTile.
 */
function explainCoastFireTile(coast: CompleteProjection["coast"]): Explained {
  if (coast.reached !== undefined) {
    return { ...coast.number, lines: [...coast.number.lines, ...coast.reached.explanation.lines] };
  }

  const retirementPoint = coast.path[coast.path.length - 1];
  if (retirementPoint === undefined) return coast.number;

  const retirementRowLines: ExplanationLine[] = [
    {
      label: `Investable at end of ${retirementPoint.calendarYear} (age ${retirementPoint.age})`,
      value: retirementPoint.investable,
      unit: "dollars",
      source: "calculated",
    },
    {
      label: `Coast FIRE number in ${retirementPoint.calendarYear}`,
      value: retirementPoint.coastNumber,
      unit: "dollars",
      operator: "−",
      source: "calculated",
    },
    {
      label: "Short of Coast FIRE",
      value: retirementPoint.investable - retirementPoint.coastNumber,
      unit: "dollars",
      operator: "=",
      source: "calculated",
    },
  ];

  return { ...coast.number, lines: [...coast.number.lines, ...retirementRowLines] };
}
