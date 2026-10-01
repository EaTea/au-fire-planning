import type { ReactNode } from "react";
import { Link } from "react-router";

import { getNeighbouringSteps, type Step } from "../navigation/steps";

/** What StepPage needs: the step it shows, an intro line and the content. */
interface StepPageProps {
  readonly step: Step;
  /** One-paragraph explanation shown under the title. */
  readonly intro: string;
  readonly children?: ReactNode;
}

/**
 * The common layout of every step's page: title, intro paragraph, content and
 * a footer with Back and Next links to the neighbouring steps (each hidden at
 * the ends of the journey). Used by PlaceholderScreen now and by the real
 * screens in later milestones. Must be rendered inside a router.
 */
export function StepPage({ step, intro, children }: StepPageProps) {
  const { previous, next } = getNeighbouringSteps(step.id);

  return (
    <section className="page">
      <h1 className="page-title">{step.label}</h1>
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
