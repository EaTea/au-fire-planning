import type { Explained, ExplanationLine } from "../../engine/explained";
import { formatDollars, formatFactor, formatPercent } from "../format";

/** What ExplainPanel needs: the explained figure whose working it shows. */
interface ExplainPanelProps {
  readonly explained: Explained;
}

/**
 * Formats one line's value according to its unit, so a rate prints as a
 * percentage, an amount as dollars and a growth multiplier as a factor, and an age or
 * number of years as a plain whole number. Used for each row of the breakdown.
 */
function formatLineValue(line: ExplanationLine): string {
  switch (line.unit) {
    case "dollars":
      return formatDollars(line.value);
    case "factor":
      return formatFactor(line.value);
    case "fraction":
      return formatPercent(line.value);
    case "years":
      return String(line.value);
  }
}

/**
 * Shows the working behind a calculated figure (NFR-1) as the mockups'
 * breakdown table: one row per engine line, with its operator, label and
 * value. Values the user didn't set are marked "(default)". The last line is
 * the result, so it is shown in bold. It renders the engine's own lines
 * unchanged, so the breakdown is always the calculation actually done.
 * Opened from MetricTile's "How is this calculated?" button.
 */
export function ExplainPanel({ explained }: ExplainPanelProps) {
  const lastLineIndex = explained.lines.length - 1;

  return (
    <table className="explain-panel">
      <tbody>
        {explained.lines.map((line, lineIndex) => {
          const isResult = lineIndex === lastLineIndex;

          const labelCell = (
            <>
              {line.operator !== undefined && <span className="operator">{line.operator} </span>}
              {line.label}
              {line.source === "default" && <span className="muted"> (default)</span>}
            </>
          );

          return (
            <tr key={lineIndex}>
              <td>{isResult ? <b>{labelCell}</b> : labelCell}</td>
              <td>{isResult ? <b>{formatLineValue(line)}</b> : formatLineValue(line)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
