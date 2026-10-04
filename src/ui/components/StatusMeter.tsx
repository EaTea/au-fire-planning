import { useId, useState } from "react";

import type { Explained } from "../../engine/explained";
import { ExplainPanel } from "./ExplainPanel";

/**
 * What a meter reports. The kind picks the bar's colour; the word is always
 * shown as well, so the status never relies on colour alone.
 */
export type StatusMeterKind = "met" | "short" | "coasting" | "notYet";

/** What StatusMeter needs. Amounts are formatted by the caller, so the meter follows whatever dollars mode the page is in. */
interface StatusMeterProps {
  /** What is being checked, e.g. "Bridge: outside super, 2042 → 2057". */
  readonly label: string;
  readonly kind: StatusMeterKind;
  /** The status in words, e.g. "MET", "SHORT", "Coasting since 2026" or "Not before retirement". */
  readonly statusWord: string;
  /** The projected amount: its number (sizes the bar) and its formatted text. */
  readonly projected: { readonly amount: number; readonly text: string };
  /** The amount needed: its number (places the marker) and its formatted text. */
  readonly need: { readonly amount: number; readonly text: string };
  /** Words after the need, e.g. "in 2042", giving "Need $978,217 in 2042 · projected ...". */
  readonly needNote?: string;
  /**
   * The words before each amount in the figures line. Default "Need" and
   * "projected"; the Coast FIRE split uses "Needs" and "has", giving "Needs
   * $338,667 today · has $740,000".
   */
  readonly figureWords?: { readonly need: string; readonly projected: string };
  /** Extra text after the projected amount, e.g. "short in 2033 – 2035". */
  readonly detail?: string;
  /** If given, a "How is this calculated?" button reveals this breakdown. */
  readonly explanation?: Explained;
}

/**
 * A labelled bar of a projected amount against a marked need, with a status
 * word (the mockups' `.check` rows). The bar is scaled so the larger of the
 * two fills the track, which keeps the need marker on the track even when the
 * projection falls short. The bar is decoration for the text under it
 * ("Need ... · projected ..."), which carries the same facts. Generic over the
 * status words, so Results' bridge check and the Coast FIRE split meters both
 * use it. Styles use role variables only (see app.css).
 */
export function StatusMeter({
  label,
  kind,
  statusWord,
  projected,
  need,
  needNote,
  figureWords = { need: "Need", projected: "projected" },
  detail,
  explanation,
}: StatusMeterProps) {
  const panelId = useId();
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  // Scale to the larger amount; guard against a zero scale (nothing needed, nothing projected).
  const scale = Math.max(projected.amount, need.amount, 0);
  const fillPercent = scale > 0 ? (Math.max(projected.amount, 0) / scale) * 100 : 0;
  const markerPercent = scale > 0 ? (Math.max(need.amount, 0) / scale) * 100 : 0;

  return (
    <div className={`status-meter status-meter-${kind}`} data-status={kind}>
      <div className="status-meter-header">
        <span className="status-meter-label">{label}</span>
        <span className="status-meter-word">{statusWord}</span>
      </div>

      <div className="status-meter-track" aria-hidden="true">
        <div className="status-meter-fill" style={{ width: `${fillPercent}%` }} />
        <div className="status-meter-need-marker" style={{ left: `${markerPercent}%` }} />
      </div>

      <div className="status-meter-figures">
        {figureWords.need} {need.text}
        {needNote === undefined ? "" : ` ${needNote}`} · {figureWords.projected} {projected.text}
        {detail === undefined ? "" : ` · ${detail}`}
      </div>

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
