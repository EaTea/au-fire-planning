// Types for engine results that carry their own explanation (NFR-1).
//
// Every figure the engine produces is an `Explained`: the value plus the lines
// of working behind it. The UI's ExplainPanel (a later M1 step) renders the
// lines as-is, so the breakdown a user sees is always the calculation that was
// actually done, never a separate description that could drift.

/**
 * The unit of a figure: whole dollars, a fraction (0.45 means 45%), or a
 * factor to multiply by (1.3213 means "× 1.3213", e.g. inflation growth).
 */
export type ExplainedUnit = "dollars" | "fraction" | "factor";

/** One line of working, e.g. "Safe withdrawal rate  ÷  4%". */
export interface ExplanationLine {
  /** Human-readable name, e.g. "Retirement spending per year". */
  readonly label: string;
  readonly value: number;
  readonly unit: ExplainedUnit;
  /** How this line combines with the ones above it. Absent on the first line. */
  readonly operator?: "+" | "−" | "×" | "÷" | "=";
  /** Typed in by the user, filled in from a default, or worked out by the engine. */
  readonly source: "input" | "default" | "calculated";
}

/** A calculated figure and the breakdown that produced it. */
export interface Explained {
  readonly value: number;
  readonly unit: ExplainedUnit;
  /** The breakdown shown by ExplainPanel. */
  readonly lines: readonly ExplanationLine[];
}
