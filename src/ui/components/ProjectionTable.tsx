import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** One column of a ProjectionTable: its heading and how to show a row's value in it. */
export interface ProjectionColumn<Row> {
  readonly header: string;
  /** What to show in this column for a row. Money columns format through `useMoneyFormatter`. */
  readonly cell: (row: Row) => ReactNode;
}

/** What ProjectionTable needs: the rows, the columns, and which rows to highlight. */
interface ProjectionTableProps<Row> {
  readonly rows: readonly Row[];
  readonly columns: readonly ProjectionColumn<Row>[];
  /** A stable key for a row, e.g. its calendar year. */
  readonly getRowKey: (row: Row) => string | number;
  /** Rows for which this returns true are highlighted (the FI row). Omit to highlight none. */
  readonly isHighlighted?: (row: Row) => boolean;
  /** Names the table for assistive technology, e.g. "Year by year projection". */
  readonly label: string;
  /**
   * Groups rows into bands. Whenever this returns a different text from the
   * previous row's (and for the first row), a full-width band row with that
   * text is inserted above it, so a screen reader reads the phase in order.
   * Omit for no bands.
   */
  readonly getBandText?: (row: Row) => string;
  /**
   * The key (see `getRowKey`) of a row to scroll into view and outline for a
   * few seconds, e.g. when the page was opened with `?year=2038`. Omit or pass
   * a key no row has to do nothing.
   */
  readonly scrollToKey?: string | number;
}

/** How long the scrolled-to row stays outlined, in milliseconds. */
const OUTLINE_DURATION_MS = 4000;

/**
 * A table with one row per projection year (mockup 05, OUT-1), built from column
 * definitions so later milestones add columns without changing this component.
 * It knows nothing about dollars modes or the engine: each column's `cell`
 * decides how a row's value is shown. Used by YearByYearSection. A highlighted
 * row is drawn on a raised background and in bold, and carries
 * `data-highlighted="true"` so it can be found without relying on colour.
 * Bands (`getBandText`) and scroll-to-a-row (`scrollToKey`, outlined briefly
 * and marked `data-outlined="true"`) serve the drawdown phases and the chart's
 * click-through to a year.
 */
export function ProjectionTable<Row>({
  rows,
  columns,
  getRowKey,
  isHighlighted,
  label,
  getBandText,
  scrollToKey,
}: ProjectionTableProps<Row>) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // The key of the row currently outlined; cleared after a few seconds.
  const [outlinedKey, setOutlinedKey] = useState<string | number | undefined>(undefined);

  // Scrolls to the requested row and outlines it briefly. Runs when the requested key changes.
  useEffect(() => {
    if (scrollToKey === undefined) return;

    const row = wrapperRef.current?.querySelector<HTMLElement>(
      `[data-row-key="${String(scrollToKey)}"]`,
    );
    if (row === null || row === undefined) return;

    // jsdom has no layout and no scrollIntoView.
    row.scrollIntoView?.({ block: "center" });

    setOutlinedKey(scrollToKey);
    const timer = window.setTimeout(() => setOutlinedKey(undefined), OUTLINE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [scrollToKey]);

  // For each row, the band text if that row opens a new band, else undefined.
  const bandOpenedByRow = rows.map((row, index) => {
    const bandText = getBandText?.(row);
    const previousBandText = index === 0 ? undefined : getBandText?.(rows[index - 1]!);

    return bandText !== undefined && bandText !== previousBandText ? bandText : undefined;
  });

  return (
    <div className="projection-table-wrapper" ref={wrapperRef}>
      <table className="projection-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => {
            const rowKey = getRowKey(row);
            const highlighted = isHighlighted?.(row) === true;
            const outlined = outlinedKey === rowKey;

            // A band row opens each new band, before the first row in it.
            const bandText = bandOpenedByRow[rowIndex];

            return (
              <Fragment key={rowKey}>
                {bandText !== undefined && (
                  <tr className="projection-band">
                    <td colSpan={columns.length}>{bandText}</td>
                  </tr>
                )}

                <tr
                  className={
                    [
                      highlighted ? "projection-row-highlight" : "",
                      outlined ? "projection-row-outlined" : "",
                    ]
                      .filter((name) => name !== "")
                      .join(" ") || undefined
                  }
                  data-row-key={rowKey}
                  data-highlighted={highlighted ? "true" : undefined}
                  data-outlined={outlined ? "true" : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.header}>{column.cell(row)}</td>
                  ))}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
