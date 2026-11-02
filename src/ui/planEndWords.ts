import type { ProjectionSummary } from "../engine/fiNumber";

/** The complete variant of the projection summary, the only one with rows. */
type CompleteProjection = Extract<ProjectionSummary, { status: "complete" }>;

/**
 * Where the plan ends, in words: "age 95" for one person, and for a couple the
 * younger person's name and the plan-until age ("Sam 95"), since the plan runs
 * until the younger one reaches it. Used by the Results tiles and milestones
 * that say "not by …" or "lasts to …", so they all read alike.
 */
export function planEndWords(projection: CompleteProjection): string {
  const lastRow = projection.rows[projection.rows.length - 1];
  const youngest = lastRow?.people.reduce((younger, person) =>
    person.age < younger.age ? person : younger,
  );

  return projection.people.length > 1 && youngest !== undefined
    ? `${youngest.label} ${projection.endAge}`
    : `age ${projection.endAge}`;
}
