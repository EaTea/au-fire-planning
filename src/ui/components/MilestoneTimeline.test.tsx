import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MilestoneTimeline } from "./MilestoneTimeline";

// Tests for the milestone timeline: list semantics, ordering and status text.
describe("MilestoneTimeline", () => {
  it("is an ordered list with one item per milestone", () => {
    render(
      <MilestoneTimeline
        items={[
          { year: 2030, label: "A", status: "projected" },
          { year: 2028, label: "B", status: "reached" },
        ]}
      />,
    );

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("puts dated items in year order, then undated items in the order given", () => {
    render(
      <MilestoneTimeline
        items={[
          { label: "Never one", status: "notReached" },
          { year: 2040, label: "Late", status: "projected" },
          { label: "Never two", status: "notReached" },
          { year: 2027, label: "Early", status: "reached" },
        ]}
      />,
    );

    const labels = screen
      .getAllByRole("listitem")
      .map((item) => item.querySelector(".milestone-label")?.textContent);
    expect(labels).toEqual(["Early", "Late", "Never one", "Never two"]);
  });

  it("keeps the given order for items in the same year", () => {
    render(
      <MilestoneTimeline
        items={[
          { year: 2030, label: "First", status: "projected" },
          { year: 2030, label: "Second", status: "projected" },
        ]}
      />,
    );

    const labels = screen
      .getAllByRole("listitem")
      .map((item) => item.querySelector(".milestone-label")?.textContent);
    expect(labels).toEqual(["First", "Second"]);
  });

  it("says each item's status in words, and shows the year and detail when given", () => {
    render(
      <MilestoneTimeline
        items={[
          { year: 2026, label: "Done", detail: "Age 40", status: "reached" },
          { year: 2031, label: "Soon", status: "projected" },
          { label: "Never", status: "notReached" },
        ]}
      />,
    );

    const [done, soon, never] = screen.getAllByRole("listitem");
    expect(done).toHaveTextContent("2026");
    expect(done).toHaveTextContent("Age 40");
    expect(done).toHaveTextContent("Reached");
    expect(soon).toHaveTextContent("Projected");
    expect(never).toHaveTextContent("Not reached");
    expect(never?.querySelector(".milestone-year")).toBeNull();
  });
});
