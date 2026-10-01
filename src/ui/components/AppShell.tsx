import type { ReactNode } from "react";

import { useLocation } from "react-router";

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
 */
export function AppShell({ children }: { readonly children: ReactNode }) {
  // The welcome page hides the step navigation so a first-time visitor can't
  // click past the disclaimer. The logo and footer stay.
  const isWelcomePage = useLocation().pathname === "/welcome";

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="logo">AU FIRE Planner</span>
        {!isWelcomePage && <StepNav />}
      </header>

      <main>{children}</main>

      <footer className="app-footer">
        General information only, not financial advice. Your data stays on this device.
      </footer>
    </div>
  );
}
