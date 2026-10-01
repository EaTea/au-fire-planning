import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TextField } from "./TextField";

describe("TextField", () => {
  it("shows the current value under its label", () => {
    render(<TextField label="Name" value="Shares" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Shares");
  });

  it("commits on blur, not while typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField label="Name" value="Shares" onChange={onChange} />);

    await user.type(screen.getByLabelText("Name"), "!");
    expect(onChange).not.toHaveBeenCalled();

    await user.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith("Shares!");
  });

  it("commits on Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField label="Name" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText("Name"), "ETFs{Enter}");

    expect(onChange).toHaveBeenCalledExactlyOnceWith("ETFs");
  });

  it("commits nothing if the text did not change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField label="Name" value="Shares" onChange={onChange} />);

    await user.click(screen.getByLabelText("Name"));
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
  });
});
