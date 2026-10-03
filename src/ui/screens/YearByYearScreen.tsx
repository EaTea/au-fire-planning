import { usePlanSummary } from "../../plan/PlanProvider";
import { StepPage } from "../components/StepPage";
import { DollarsModeToggle } from "../dollarsMode";
import { steps } from "../navigation/steps";
import { MissingInputsBanner } from "./MissingInputsBanner";
import { YearByYearSection } from "./YearByYearSection";

const step = steps.find((candidate) => candidate.id === "year-by-year")!;

/**
 * The Year by year step, kept only until the table's move onto Results is
 * finished (PLAN.md, "Results and Year by year on one page", step B removes
 * it). Shows the same YearByYearSection as Results, with its own dollars
 * toggle, or what's missing when the plan isn't complete. Routed from App.
 */
export function YearByYearScreen() {
  const summary = usePlanSummary();

  return (
    <StepPage step={step} intro={introText} headerAction={<DollarsModeToggle />}>
      {summary.status === "incomplete" ? (
        <MissingInputsBanner missing={summary.missing} />
      ) : summary.projection.status === "incomplete" ? (
        <MissingInputsBanner missing={summary.projection.missing} />
      ) : (
        <YearByYearSection projection={summary.projection} />
      )}
    </StepPage>
  );
}

/** The sentence under the page title, shared by every state of the screen. */
const introText =
  "Your cash and portfolio year by year: contributions, growth, spending and whether the money lasts.";
