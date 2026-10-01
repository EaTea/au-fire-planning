import type { ReactNode } from "react";

/** What Card needs: a title and the content inside the box. */
interface CardProps {
  readonly title: string;
  readonly children?: ReactNode;
}

/**
 * A titled box that groups related fields or results on a screen (the
 * mockups' `.card`). Used by the input screens and the Results screen to
 * break a page into sections.
 */
export function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
