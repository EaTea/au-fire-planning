import type { ReactNode } from "react";

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
 */
export function AppShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="logo">AU FIRE Planner</span>
        <StepNav />
      </header>

      <main>{children}</main>
    </div>
  );
}
