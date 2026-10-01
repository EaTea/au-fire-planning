import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";

describe("Card", () => {
  it("shows its title and content", () => {
    render(
      <Card title="Living expenses">
        <p>Inside</p>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Living expenses" })).toBeInTheDocument();
    expect(screen.getByText("Inside")).toBeInTheDocument();
  });
});
