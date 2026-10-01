import { NavLink } from "react-router";

import { steps } from "../navigation/steps";

/**
 * The row of numbered, pill-shaped step links in the header, rendered by
 * AppShell. NavLink marks the link for the current route with
 * aria-current="page", and the "step-active" class gives it the filled style
 * (see src/ui/styles/app.css). Must be rendered inside a router.
 */
export function StepNav() {
  return (
    <nav className="step-nav" aria-label="Steps">
      {steps.map((step) => (
        <NavLink
          key={step.id}
          to={step.path}
          className={({ isActive }) => (isActive ? "step-pill step-active" : "step-pill")}
        >
          <span className="step-number">{step.number}</span>
          {step.label}
        </NavLink>
      ))}
    </nav>
  );
}
