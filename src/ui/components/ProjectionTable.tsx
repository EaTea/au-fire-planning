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
}

/**
 * A table with one row per projection year (mockup 06, OUT-1), built from column
 * definitions so later milestones add columns without changing this component.
 * It knows nothing about dollars modes or the engine: each column's `cell`
 * decides how a row's value is shown. Used by YearByYearScreen. A highlighted
 * row is drawn on a raised background and in bold, and carries
 * `data-highlighted="true"` so it can be found without relying on colour.
 */
export function ProjectionTable<Row>({
  rows,
  columns,
  getRowKey,
  isHighlighted,
  label,
}: ProjectionTableProps<Row>) {
  return (
    <div className="projection-table-wrapper">
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
          {rows.map((row) => {
            const highlighted = isHighlighted?.(row) === true;

            return (
              <tr
                key={getRowKey(row)}
                className={highlighted ? "projection-row-highlight" : undefined}
                data-highlighted={highlighted ? "true" : undefined}
              >
                {columns.map((column) => (
                  <td key={column.header}>{column.cell(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
