import { useState, type ReactNode } from "react";

import { useLocation, useNavigate } from "react-router";

import { createNewPlan } from "../../plan/createNewPlan";
import { isBlankPlan } from "../../plan/isBlankPlan";
import { usePlan, usePlanDispatch } from "../../plan/PlanProvider";
import { firstStep } from "../navigation/steps";
import { StartOverDialog } from "./StartOverDialog";
import { StepNav } from "./StepNav";

/**
 * The frame around every page: the header (the "AU FIRE Planner" logo and
 * StepNav) with the current step's page below it. Rendered by App inside the
 * router. Later milestones add the plan picker, "Edit inputs" and export
 * buttons to the header.
 *
 *   +--------------------------------------------+
 *   | [AU FIRE Planner]  (1)(2)(3)(4)(5)(6)(7)   |  header
 *   +--------------------------------------------+
 *   | page content (a StepPage)                  |  main
 *   +--------------------------------------------+
 *   | General information only, not advice...    |  footer
 *   +--------------------------------------------+
 *
 * The logo is the "Start over" button (NFR-8):
 *
 *   click logo ─► plan blank? ──yes──► new plan, go to Household
 *                     │
 *                     no ──► StartOverDialog ─► Start over ─► new plan, go to Household
 *                                            └► Keep my plan / Escape ─► nothing changes
 *
 * The new plan reaches storage through PersistenceProvider's autosave, like
 * any other edit, so it replaces the saved plan.
 */
export function AppShell({ children }: { readonly children: ReactNode }) {
  // The welcome page hides the step navigation so a first-time visitor can't
  // click past the disclaimer. The footer stays, and so does the logo, but as
  // plain text: there is no plan to clear before the disclaimer is accepted.
  const isWelcomePage = useLocation().pathname === "/welcome";

  const plan = usePlan();
  const dispatch = usePlanDispatch();
  const navigate = useNavigate();
  const [isConfirmingStartOver, setIsConfirmingStartOver] = useState(false);

  /** Replaces the plan with a blank one and goes to step 1. Called once the user has agreed (or had nothing to lose). */
  function startOver() {
    setIsConfirmingStartOver(false);
    dispatch({ type: "replacePlan", plan: createNewPlan(() => crypto.randomUUID()) });
    navigate(firstStep.path);
  }

  /** Handles a click on the logo: asks first unless the plan is still blank. */
  function handleLogoClick() {
    if (isBlankPlan(plan)) {
      startOver();
    } else {
      setIsConfirmingStartOver(true);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        {isWelcomePage ? (
          <span className="logo">AU FIRE Planner</span>
        ) : (
          // The accessible name starts with the visible text (WCAG 2.5.3,
          // label in name), so "click AU FIRE Planner" works for voice control.
          <button
            type="button"
            className="logo logo-button"
            aria-label="AU FIRE Planner, start over"
            title="Start over"
            onClick={handleLogoClick}
          >
            AU FIRE Planner
          </button>
        )}
        {!isWelcomePage && <StepNav />}
      </header>

      <main>{children}</main>

      <footer className="app-footer">
        General information only, not financial advice. Your data stays on this device.
      </footer>

      <StartOverDialog
        isOpen={isConfirmingStartOver}
        onConfirm={startOver}
        onCancel={() => setIsConfirmingStartOver(false)}
      />
    </div>
  );
}
