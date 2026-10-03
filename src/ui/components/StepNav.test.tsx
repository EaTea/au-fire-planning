import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { StepNav } from "./StepNav";

// Component tests for the header step navigation.
describe("StepNav", () => {
  // One link per step, and only the link for the current route is marked.
  it("renders 6 links and marks only the current one with aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/assets"]}>
        <StepNav />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);

    const currentLinks = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toHaveTextContent("Assets");
  });
});
