import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { EditableTable } from "./EditableTable";
import type { EditableColumn } from "./EditableTable";
import { MoneyField } from "./MoneyField";
import { TextField } from "./TextField";

// Component tests for the generic editable table, using a tiny "item" row type
// that has nothing to do with expenses.

interface Item {
  readonly id: string;
  readonly name: string;
  readonly amount?: number;
}

/** A host that keeps the rows in state, as a screen would with the plan. */
function Host({ initialItems }: { readonly initialItems: readonly Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [nextId, setNextId] = useState(1);

  const columns: EditableColumn<Item>[] = [
    {
      header: "Name",
      cell: (item) => item.name,
      editor: (item, commit) => (
        <TextField
          label={`Edit name of ${item.name}`}
          value={item.name}
          onChange={(name) => {
            setItems((all) => all.map((one) => (one.id === item.id ? { ...one, name } : one)));
            commit();
          }}
        />
      ),
    },
    {
      header: "Amount",
      cell: (item) => (item.amount === undefined ? "$0" : `$${item.amount}`),
      editor: (item) => (
        <MoneyField
          label={`Edit amount of ${item.name}`}
          value={item.amount}
          onChange={(amount) =>
            setItems((all) => all.map((one) => (one.id === item.id ? { ...one, amount } : one)))
          }
        />
      ),
    },
    { header: "Read only", cell: () => "fixed" },
  ];

  return (
    <>
      <button type="button">Before</button>
      <EditableTable
        rows={items}
        columns={columns}
        getRowId={(item) => item.id}
        getRowName={(item) => item.name}
        label="Items"
        addNoun="item"
        emptyText="No items yet."
        onAdd={() => {
          const id = `new-${nextId}`;
          setNextId(nextId + 1);
          setItems((all) => [...all, { id, name: "" }]);
          return id;
        }}
        onDuplicate={(id) =>
          setItems((all) => {
            const index = all.findIndex((one) => one.id === id);
            const original = all[index];
            if (original === undefined) return all;
            return [
              ...all.slice(0, index + 1),
              { ...original, id: `${id}-copy` },
              ...all.slice(index + 1),
            ];
          })
        }
        onDelete={(id) => setItems((all) => all.filter((one) => one.id !== id))}
      />
    </>
  );
}

const car: Item = { id: "car", name: "Car", amount: 100 };
const trip: Item = { id: "trip", name: "Trip" };

describe("EditableTable", () => {
  it("shows the empty text, and the add button, when there are no rows", () => {
    render(<Host initialItems={[]} />);

    expect(screen.getByText("No items yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add item" })).toBeInTheDocument();
  });

  it("shows editable cells as buttons with accessible names, and read-only cells as text", () => {
    render(<Host initialItems={[car]} />);

    expect(screen.getByRole("button", { name: "Amount for Car" })).toHaveTextContent("$100");
    expect(screen.getByRole("button", { name: "Name for Car" })).toHaveTextContent("Car");
    expect(screen.getByText("fixed").closest("button")).toBeNull();
  });

  it("commits an edit on Enter and returns focus to the cell", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    await user.click(screen.getByRole("button", { name: "Amount for Car" }));
    const field = screen.getByLabelText("Edit amount of Car");
    expect(field).toHaveFocus();

    await user.clear(field);
    await user.type(field, "250{Enter}");

    const cell = await screen.findByRole("button", { name: "Amount for Car" });
    expect(cell).toHaveTextContent("$250");
    await waitFor(() => expect(cell).toHaveFocus());
  });

  it("commits an edit on blur, without taking focus back", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    await user.click(screen.getByRole("button", { name: "Amount for Car" }));
    const field = screen.getByLabelText("Edit amount of Car");
    await user.clear(field);
    await user.type(field, "300");
    await user.click(screen.getByRole("button", { name: "Before" }));

    expect(await screen.findByRole("button", { name: "Amount for Car" })).toHaveTextContent("$300");
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();
  });

  it("cancels on Escape: the value is unchanged and focus returns to the cell", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    await user.click(screen.getByRole("button", { name: "Amount for Car" }));
    const field = screen.getByLabelText("Edit amount of Car");
    await user.clear(field);
    await user.type(field, "999{Escape}");

    const cell = screen.getByRole("button", { name: "Amount for Car" });
    expect(cell).toHaveTextContent("$100");
    expect(cell).toHaveFocus();
  });

  it("keeps the editor open on Enter when the text is invalid", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    await user.click(screen.getByRole("button", { name: "Amount for Car" }));
    await user.clear(screen.getByLabelText("Edit amount of Car"));
    await user.type(screen.getByLabelText("Edit amount of Car"), "abc{Enter}");

    // Give the table's deferred Enter check time to run.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByLabelText("Edit amount of Car")).toBeInTheDocument();
  });

  it("works with the keyboard alone: Tab to a cell, Enter to edit, type, Enter to commit", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    await user.tab(); // "Before"
    await user.tab(); // Name for Car
    await user.tab(); // Amount for Car
    expect(screen.getByRole("button", { name: "Amount for Car" })).toHaveFocus();

    await user.keyboard("{Enter}");
    const field = screen.getByLabelText("Edit amount of Car");
    expect(field).toHaveFocus();

    await user.keyboard("42{Enter}");

    const cell = await screen.findByRole("button", { name: "Amount for Car" });
    expect(cell).toHaveTextContent("$42");
    await waitFor(() => expect(cell).toHaveFocus());
  });

  it("adds a row and opens its first editable cell", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    await user.click(screen.getByRole("button", { name: "+ Add item" }));

    expect(await screen.findByLabelText("Edit name of")).toHaveFocus();
  });

  it("duplicates a row, putting the copy after the original", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car, trip]} />);

    await user.click(screen.getByRole("button", { name: "Actions for Car" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));

    const names = screen.getAllByRole("button", { name: /^Name for / });
    expect(names.map((button) => button.textContent)).toEqual(["Car", "Car", "Trip"]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("deletes a row, and shows the empty text after the last", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    await user.click(screen.getByRole("button", { name: "Actions for Car" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(screen.getByText("No items yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add item" })).toHaveFocus();
  });

  it("opens the row menu from the keyboard, moves with arrows and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Host initialItems={[car]} />);

    const menuButton = screen.getByRole("button", { name: "Actions for Car" });
    menuButton.focus();
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Enter}");
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus());

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(menuButton).toHaveFocus());
  });
});
