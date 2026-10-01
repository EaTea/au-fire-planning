import { useId, useState } from "react";

import type { Explained } from "../../engine/explained";
import { ExplainPanel } from "./ExplainPanel";

/** What MetricTile needs: the headline figure, and optionally its working. */
interface MetricTileProps {
  readonly label: string;
  /** The already-formatted headline value, e.g. "$1,600,000". */
  readonly value: string;
  /** A short line under the value, e.g. "Spending ÷ withdrawal rate". */
  readonly subLine?: string;
  /** If given, a "How is this calculated?" button reveals this breakdown. */
  readonly explanation?: Explained;
}

/**
 * A headline result (the mockups' `.metric`): label, large value, sub-line
 * and an optional button that expands the ExplainPanel beneath it. Used on
 * the Results screen for the FI number and progress to FI.
 */
export function MetricTile({ label, value, subLine, explanation }: MetricTileProps) {
  const panelId = useId();
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {subLine !== undefined && <div className="sub">{subLine}</div>}

      {explanation !== undefined && (
        <>
          <button
            type="button"
            className="explain-toggle"
            aria-expanded={isExplanationOpen}
            aria-controls={panelId}
            onClick={() => setIsExplanationOpen(!isExplanationOpen)}
          >
            How is this calculated?
          </button>

          <div id={panelId}>{isExplanationOpen && <ExplainPanel explained={explanation} />}</div>
        </>
      )}
    </div>
  );
}
