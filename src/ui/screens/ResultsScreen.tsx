import type { Explained } from "../../engine/explained";
import { usePlanSummary } from "../../plan/PlanProvider";
import { Banner } from "../components/Banner";
import { MetricTile } from "../components/MetricTile";
import { StepPage } from "../components/StepPage";
import { formatDollars, formatPercent } from "../format";
import { steps } from "../navigation/steps";
import { MissingInputsBanner } from "./MissingInputsBanner";

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
 * The Results step (FIRE-1, FIRE-2): the FI number and progress to FI, each
 * with its breakdown, or a list of what's still missing, linked to the steps
 * where it is entered. Always shows what isn't modelled yet so the figures
 * aren't over-trusted. Reads the engine's summary via usePlanSummary(); routed
 * from App.
 */
export function ResultsScreen() {
  const summary = usePlanSummary();

  return (
    <StepPage
      step={step}
      intro="Your FI number: how much you need invested to fund your retirement, when you could reach it, and how far along you are."
    >
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
              <FiReachedTile projection={summary.projection} />
            ) : (
              <MissingInputsBanner missing={summary.projection.missing} />
            )}
          </>
        ) : (
          <MissingInputsBanner missing={summary.missing} />
        )}

        <Banner tone="info">
          Not yet modelled: withdrawals in retirement and when money runs out (M3), super (M5), tax
          (M8), property (M12) and more.
        </Banner>
      </div>
    </StepPage>
  );
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
        subLine="With today's inputs and no withdrawals"
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
