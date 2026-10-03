import { Fragment, type ReactNode } from "react";

import type { Person } from "../../plan/types";

/** What PerPersonFields needs. */
interface PerPersonFieldsProps {
  /** Everyone in the household, in order. */
  readonly people: readonly Person[];
  /**
   * Renders the fields for one person. `fieldLabel` turns a plain label
   * ("Gross salary per year") into the label to show: unchanged for one
   * person, "Alex: Gross salary per year" when there are several, so every
   * label on the page stays unique.
   */
  readonly children: (person: Person, fieldLabel: (label: string) => string) => ReactNode;
}

/**
 * Renders a set of fields once for each person in the household. With one
 * person it adds no name, so the page reads as it always has; couples (M7)
 * get a name on each label with no change to the screens that use this. The
 * caller's render function receives the person, so each field edits that
 * person's data (for example by dispatching with `person.id`).
 */
export function PerPersonFields({ people, children }: PerPersonFieldsProps) {
  const hasSeveralPeople = people.length > 1;

  return (
    <>
      {people.map((person) => (
        <Fragment key={person.id}>
          {children(person, (label) => (hasSeveralPeople ? `${person.label}: ${label}` : label))}
        </Fragment>
      ))}
    </>
  );
}
