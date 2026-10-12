import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StartOverDialog } from "./StartOverDialog";

// Component tests for the confirmation shown before Start over clears the plan.
// Escape and backdrop clicks are the browser's, so tests/e2e/startOver.spec.ts covers them.
describe("StartOverDialog", () => {
  // Closed, it shows nothing a screen reader or keyboard user could reach.
  it("is hidden while closed", () => {
    render(<StartOverDialog isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Open, it explains what will be lost, and the safe choice has focus.
  it("asks for confirmation with Keep my plan focused", () => {
    render(<StartOverDialog isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Start over?" });
    expect(dialog).toHaveAccessibleDescription(/can't be undone/);
    expect(screen.getByRole("button", { name: "Keep my plan" })).toHaveFocus();
  });

  // Keep my plan cancels and never confirms.
  it("cancels from Keep my plan", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<StartOverDialog isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: "Keep my plan" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // Start over confirms and never cancels.
  it("confirms from Start over", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<StartOverDialog isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  // Closing it again (after either choice) hides it.
  it("closes when isOpen becomes false", () => {
    const { rerender } = render(
      <StartOverDialog isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    rerender(<StartOverDialog isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
