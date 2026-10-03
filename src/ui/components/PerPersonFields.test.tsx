import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Person } from "../../plan/types";
import { PerPersonFields } from "./PerPersonFields";

const alex: Person = { id: "a", label: "Alex" };
const sam: Person = { id: "s", label: "Sam" };

/** Renders one field per person using the fieldLabel helper. */
function renderFields(people: readonly Person[]) {
  render(
    <PerPersonFields people={people}>
      {(person, fieldLabel) => (
        <label>
          {fieldLabel("Gross salary per year")}
          <input data-person={person.id} />
        </label>
      )}
    </PerPersonFields>,
  );
}

// Component tests for rendering a field once per person.
describe("PerPersonFields", () => {
  it("adds no name with one person", () => {
    renderFields([alex]);

    expect(screen.getByLabelText("Gross salary per year")).toHaveAttribute("data-person", "a");
  });

  it("prefixes each label with the person's name when there are several", () => {
    renderFields([alex, sam]);

    expect(screen.getByLabelText("Alex: Gross salary per year")).toHaveAttribute(
      "data-person",
      "a",
    );
    expect(screen.getByLabelText("Sam: Gross salary per year")).toHaveAttribute("data-person", "s");
  });

  it("renders nothing for nobody", () => {
    renderFields([]);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
