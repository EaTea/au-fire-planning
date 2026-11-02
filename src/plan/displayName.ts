// How a person is called on screen.

import type { Person } from "./types";

/**
 * A name reduced to what makes two names "the same": spaces trimmed and the
 * case ignored. Used to spot two people given the same name.
 */
function comparableName(person: Pick<Person, "name">): string {
  return (person.name ?? "").trim().toLowerCase();
}

/**
 * The name to show for a person: the name they were given, or "Person N" for
 * their position in the household (`index` is 0-based, so the first person
 * is "Person 1"). A name that is empty or only spaces counts as unnamed.
 *
 * Pass `people` (everyone in the household) so two people given the same name
 * (ignoring case and spaces) can still be told apart: each then reads
 * "Alex (Person 1)" and "Alex (Person 2)". Used wherever a label or sentence
 * names a person, so a couple can be told apart (M7); the engine's
 * explanation lines get the same names through the projection inputs.
 */
export function displayName(
  person: Pick<Person, "name">,
  index: number,
  people?: readonly Pick<Person, "name">[],
): string {
  const name = person.name?.trim();
  const positionName = `Person ${index + 1}`;

  if (name === undefined || name === "") return positionName;

  const sharesName =
    people !== undefined &&
    people.some(
      (other, otherIndex) =>
        otherIndex !== index && comparableName(other) === comparableName(person),
    );

  return sharesName ? `${name} (${positionName})` : name;
}
