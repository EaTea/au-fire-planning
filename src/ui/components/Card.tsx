import type { ReactNode } from "react";

/** What Card needs: a title, the content inside the box, and optionally a control in the header. */
interface CardProps {
  readonly title: string;
  /** A control shown beside the title, e.g. the dollars toggle on a chart card. */
  readonly headerAction?: ReactNode;
  readonly children?: ReactNode;
}

/**
 * A titled box that groups related fields or results on a screen (the
 * mockups' `.card`). Used by the input screens and the Results screen to
 * break a page into sections. A `headerAction` sits at the right of the title
 * row, for a control that changes what the card shows.
 */
export function Card({ title, headerAction, children }: CardProps) {
  return (
    <section className="card">
      {headerAction === undefined ? (
        <h3>{title}</h3>
      ) : (
        <div className="card-header">
          <h3>{title}</h3>
          {headerAction}
        </div>
      )}
      {children}
    </section>
  );
}
