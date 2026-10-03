import type { ReactNode } from "react";
import { Link } from "react-router";

import { getNeighbouringSteps, type Step } from "../navigation/steps";

/** What StepPage needs: the step it shows, an intro line, the content and optionally a header control. */
interface StepPageProps {
  readonly step: Step;
  /** One-paragraph explanation shown under the title. */
  readonly intro: string;
  /** A control shown at the right of the title, for one that changes the whole page (the dollars toggle on Results). */
  readonly headerAction?: ReactNode;
  readonly children?: ReactNode;
}

/**
 * The common layout of every step's page: title, intro paragraph, content and
 * a footer with Back and Next links to the neighbouring steps (each hidden at
 * the ends of the journey). Used by every step's screen. A `headerAction`
 * sits beside the title, for a control that applies to everything on the
 * page. Must be rendered inside a router.
 */
export function StepPage({ step, intro, headerAction, children }: StepPageProps) {
  const { previous, next } = getNeighbouringSteps(step.id);
  const title = <h1 className="page-title">{step.label}</h1>;

  return (
    <section className="page">
      {headerAction === undefined ? (
        title
      ) : (
        <div className="page-header">
          {title}
          {headerAction}
        </div>
      )}
      <p className="page-intro">{intro}</p>

      {children}

      <footer className="page-footer">
        {previous !== undefined && (
          <Link className="footer-link footer-back" to={previous.path}>
            ← {previous.label}
          </Link>
        )}

        {next !== undefined && (
          <Link className="footer-link footer-next" to={next.path}>
            Next: {next.label} →
          </Link>
        )}
      </footer>
    </section>
  );
}
