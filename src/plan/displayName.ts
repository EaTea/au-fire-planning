// How a person is called on screen.

import type { Person } from "./types";

/**
 * The name to show for a person: the name they were given, or "Person N" for
 * their position in the household (`index` is 0-based, so the first person
 * is "Person 1"). A name that is empty or only spaces counts as unnamed.
 * Used wherever a label or sentence names a person, so a couple can be told
 * apart (M7); the engine's explanation lines get the same names through the
 * projection inputs.
 */
export function displayName(person: Pick<Person, "name">, index: number): string {
  const name = person.name?.trim();

  return name === undefined || name === "" ? `Person ${index + 1}` : name;
}
