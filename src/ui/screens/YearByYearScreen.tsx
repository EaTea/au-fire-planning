import type { ProjectionRow } from "../../engine/projection";
import { usePlanSummary } from "../../plan/PlanProvider";
import { Banner } from "../components/Banner";
import { ProjectionTable, type ProjectionColumn } from "../components/ProjectionTable";
import { StepPage } from "../components/StepPage";
import { DollarsModeToggle, useMoneyFormatter } from "../dollarsMode";
import { formatPercent } from "../format";
import { steps } from "../navigation/steps";
import { MissingInputsBanner } from "./MissingInputsBanner";

const step = steps.find((candidate) => candidate.id === "year-by-year")!;

/**
 * The Year by year step (OUT-1, OUT-2): the portfolio's projection as a
 * table, in today's or nominal dollars. Shows the years from today to the
 * later of the target retirement age and the year FI is reached (or to the
 * retirement age if FI isn't reached), with the FI row highlighted. If the
 * plan isn't complete it lists what's missing, like Results. Reads the
 * engine's summary via usePlanSummary(); routed from App.
 */
export function YearByYearScreen() {
  const summary = usePlanSummary();
  const formatMoney = useMoneyFormatter();

  if (summary.status === "incomplete") {
    return (
      <StepPage step={step} intro={introText}>
        <MissingInputsBanner missing={summary.missing} />
      </StepPage>
    );
  }

  const { projection } = summary;

  if (projection.status === "incomplete") {
    return (
      <StepPage step={step} intro={introText}>
        <MissingInputsBanner missing={projection.missing} />
      </StepPage>
    );
  }

  const fiYearIndex = projection.fiReached?.yearIndex;
  const lastAgeShown = Math.max(projection.retirementAge, projection.fiReached?.age ?? 0);
  const visibleRows = projection.rows.filter((row) => row.age <= lastAgeShown);

  // All money goes through formatMoney so it follows the dollars toggle.
  const columns: ProjectionColumn<ProjectionRow>[] = [
    { header: "Year", cell: (row) => row.calendarYear },
    { header: "Age", cell: (row) => row.age },
    {
      header: "Contributions",
      cell: (row) => formatMoney(row.contribution, row.inflationIndex),
    },
    { header: "Growth", cell: (row) => formatMoney(row.portfolioGrowth, row.inflationIndex) },
    {
      header: "Portfolio balance",
      cell: (row) => formatMoney(row.portfolioClosing, row.inflationIndex),
    },
    {
      header: "Living expenses",
      cell: (row) => formatMoney(row.livingExpenses, row.inflationIndex),
    },
    { header: "FI number", cell: (row) => formatMoney(row.fiNumber, row.inflationIndex) },
    // A ratio of two values in the same year's dollars, so the toggle doesn't change it.
    { header: "Progress", cell: (row) => formatPercent(row.portfolioClosing / row.fiNumber) },
  ];

  return (
    <StepPage step={step} intro={introText}>
      <div className="results-stack">
        <DollarsModeToggle />

        <Banner tone="info">
          Withdrawals in retirement aren&apos;t modelled yet (M3). Balances after you stop
          contributing assume nothing is spent.
        </Banner>

        <ProjectionTable
          label="Year by year projection"
          rows={visibleRows}
          columns={columns}
          getRowKey={(row) => row.yearIndex}
          isHighlighted={(row) => row.yearIndex === fiYearIndex}
        />
      </div>
    </StepPage>
  );
}

/** The sentence under the page title, shared by every state of the screen. */
const introText =
  "Your portfolio year by year: growth, contributions and how far along you are toward your FI number.";
