import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Banner } from "./Banner";

describe("Banner", () => {
  it("shows an info notice without an alert role", () => {
    render(<Banner tone="info">Not modelled yet</Banner>);

    expect(screen.getByText("Not modelled yet")).toHaveClass("banner-info");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("announces a warning as an alert", () => {
    render(<Banner tone="warning">Enter living expenses</Banner>);

    expect(screen.getByRole("alert")).toHaveTextContent("Enter living expenses");
    expect(screen.getByRole("alert")).toHaveClass("banner-warning");
  });
});
