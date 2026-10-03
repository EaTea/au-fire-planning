import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

/**
 * One column of an EditableTable. `header` is also used in each cell's
 * accessible name ("Amount for Replace car"), so keep it short and unique.
 */
export interface EditableColumn<Row> {
  readonly header: string;
  /** What to show for this row when the cell isn't being edited. */
  readonly cell: (row: Row) => ReactNode;
  /**
   * Makes the column editable. Returns the field to show while editing.
   * Call `commit` once the new value has been reported (the table then closes
   * the editor and returns focus to the cell) and `cancel` to discard.
   * The table also closes the editor itself on Escape (cancel), on Enter, and
   * when focus leaves the editor; the editor only has to report its value.
   * Text the field rejects (it shows an error) keeps the editor open on Enter,
   * but is discarded if focus leaves.
   */
  readonly editor?: (row: Row, commit: () => void, cancel: () => void) => ReactNode;
}

/** What EditableTable needs: the rows, the columns, and callbacks for the row-level actions. */
interface EditableTableProps<Row> {
  readonly rows: readonly Row[];
  readonly columns: readonly EditableColumn<Row>[];
  /** A stable id for a row; used for keys and to find the row after changes. */
  readonly getRowId: (row: Row) => string;
  /** The row's name for assistive technology, e.g. "Replace car". Falls back to the caller's wording when empty. */
  readonly getRowName: (row: Row) => string;
  /** Names the table for assistive technology. */
  readonly label: string;
  /** What is being added, for the button "+ Add {noun}", e.g. "expense". */
  readonly addNoun: string;
  /**
   * Called by the add button. Must add a row and return its id, so the table
   * can open that row's first editable cell.
   */
  readonly onAdd: () => string;
  readonly onDuplicate: (rowId: string) => void;
  readonly onDelete: (rowId: string) => void;
  /** The one line shown instead of the table body when there are no rows. */
  readonly emptyText: string;
}

/** Where focus should go after an editor or menu closes. */
type PendingFocus =
  | { readonly kind: "cell"; readonly address: CellAddress }
  | { readonly kind: "menu"; readonly rowId: string }
  | { readonly kind: "add" };

/** The cell currently being edited. */
interface CellAddress {
  readonly rowId: string;
  readonly columnIndex: number;
}

/**
 * A table whose cells are edited in place (mockup 03d's expenses table, and
 * later the tables for other lists). It is generic: it knows rows, columns and
 * row actions, nothing about what the rows mean. Used by the Income & expenses
 * screen for dated expenses.
 *
 *   cell button --click/Enter--> editor (a real field) --Enter/blur--> cell button
 *                                      '----Escape (cancel)---------> cell button
 *   "⋯" button ──► menu: Duplicate, Delete        "+ Add noun" ──► new row, first editor open
 *
 * Focus returns to the cell after Enter, Escape or a commit. When focus leaves
 * the editor because the user went elsewhere, it is not pulled back.
 */
export function EditableTable<Row>({
  rows,
  columns,
  getRowId,
  getRowName,
  label,
  addNoun,
  onAdd,
  onDuplicate,
  onDelete,
  emptyText,
}: EditableTableProps<Row>) {
  const [editing, setEditing] = useState<CellAddress | undefined>(undefined);
  const [menuRowId, setMenuRowId] = useState<string | undefined>(undefined);

  // Where focus should land after the next render: a cell, a row's menu button, or the add button.
  // A ref, not state: it is set in the same event handlers that change what is shown, so a render follows anyway.
  const pendingFocusRef = useRef<PendingFocus | undefined>(undefined);

  const tableRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // True while focus is leaving an editor for somewhere else: a commit caused by that must not steal focus back.
  const focusIsLeavingEditorRef = useRef(false);

  const firstEditableColumnIndex = columns.findIndex((column) => column.editor !== undefined);

  // After every render, moves focus to where an earlier handler asked for it (the element exists by now).
  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (pendingFocus === undefined) return;
    pendingFocusRef.current = undefined;

    if (pendingFocus.kind === "add") {
      addButtonRef.current?.focus();
    } else {
      const selector =
        pendingFocus.kind === "cell"
          ? `[data-cell="${pendingFocus.address.rowId}:${pendingFocus.address.columnIndex}"]`
          : `[data-menu-button="${pendingFocus.rowId}"]`;
      tableRef.current?.querySelector<HTMLElement>(selector)?.focus();
    }
  });

  /** Closes the editor; returns focus to its cell unless the user already moved focus elsewhere. */
  function closeEditor(address: CellAddress) {
    setEditing(undefined);

    // The flag is cleared when an editor next opens, not here: a commit and the
    // blur that caused it both call this, and both must see the same answer.
    if (!focusIsLeavingEditorRef.current) {
      pendingFocusRef.current = { kind: "cell", address };
    }
  }

  /** Opens the editor for a cell. */
  function openEditor(address: CellAddress) {
    focusIsLeavingEditorRef.current = false;
    setEditing(address);
  }

  /** Adds a row through the caller, then opens its first editable cell. */
  function addRow() {
    const newRowId = onAdd();

    if (firstEditableColumnIndex >= 0) {
      openEditor({ rowId: newRowId, columnIndex: firstEditableColumnIndex });
    }
  }

  return (
    <div className="editable-table" ref={tableRef}>
      {rows.length === 0 ? (
        <p className="editable-table-empty">{emptyText}</p>
      ) : (
        <div className="projection-table-wrapper">
          <table className="editable-table-grid" aria-label={label}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.header} scope="col">
                    {column.header}
                  </th>
                ))}
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const rowId = getRowId(row);
                const rowName = getRowName(row);

                return (
                  <tr key={rowId}>
                    {columns.map((column, columnIndex) => {
                      const address = { rowId, columnIndex };
                      const isEditing =
                        editing?.rowId === rowId && editing.columnIndex === columnIndex;

                      return (
                        <td key={column.header}>
                          {isEditing && column.editor !== undefined ? (
                            <EditorShell
                              renderEditor={(commit, cancel) =>
                                column.editor?.(row, commit, cancel)
                              }
                              onClose={() => closeEditor(address)}
                              onFocusLeaving={() => {
                                focusIsLeavingEditorRef.current = true;
                              }}
                              onFocusLeft={() => closeEditor(address)}
                            />
                          ) : column.editor !== undefined ? (
                            <button
                              type="button"
                              className="editable-cell"
                              data-cell={`${rowId}:${columnIndex}`}
                              aria-label={`${column.header} for ${rowName === "" ? "unnamed row" : rowName}`}
                              onClick={() => openEditor(address)}
                            >
                              {column.cell(row)}
                            </button>
                          ) : (
                            column.cell(row)
                          )}
                        </td>
                      );
                    })}

                    <td>
                      <RowMenu
                        rowId={rowId}
                        rowName={rowName === "" ? "unnamed row" : rowName}
                        isOpen={menuRowId === rowId}
                        onOpen={() => setMenuRowId(rowId)}
                        onClose={(returnFocus) => {
                          setMenuRowId(undefined);
                          if (returnFocus) pendingFocusRef.current = { kind: "menu", rowId };
                        }}
                        onDuplicate={() => onDuplicate(rowId)}
                        onDelete={() => {
                          onDelete(rowId);
                          // The row (and its menu button) is gone, so focus the add button.
                          pendingFocusRef.current = { kind: "add" };
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        className="footer-link editable-table-add"
        ref={addButtonRef}
        onClick={addRow}
      >
        + Add {addNoun}
      </button>
    </div>
  );
}

/** What EditorShell needs: the editor field and what to do on each way of finishing. */
interface EditorShellProps {
  /** Builds the field, handing it the `commit` and `cancel` callbacks. Called by the shell's own render. */
  readonly renderEditor: (commit: () => void, cancel: () => void) => ReactNode;
  /** Closes the editor (after Enter, a commit, or Escape). */
  readonly onClose: () => void;
  /** Focus is about to leave the editor for another element (fires before the field's own blur handler). */
  readonly onFocusLeaving: () => void;
  /** Focus has left the editor. */
  readonly onFocusLeft: () => void;
}

/**
 * Wraps an editor field to give it the table's shared keys: Escape cancels,
 * Enter closes once the field has accepted the value, and moving focus out
 * closes it. The field itself (NumberField, TextField) handles parsing and
 * reports its value through the column's `editor` callback. Used only by EditableTable.
 */
function EditorShell({ renderEditor, onClose, onFocusLeaving, onFocusLeft }: EditorShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  // Set by Escape. Some browsers fire a blur when the focused field is removed,
  // and the field would then commit what the user just cancelled; this stops that blur.
  const cancelledRef = useRef(false);

  // Opening an editor puts the cursor in its field, so the user can type straight away.
  useEffect(() => {
    shellRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, []);

  /** Escape: marks the shell cancelled so a blur on removal can't commit the edit, then closes. */
  function cancelFromKeyboard() {
    cancelledRef.current = true;
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelFromKeyboard();
      return;
    }

    if (event.key === "Enter") {
      // The field's own Enter handler has run (it bubbles up to here). If it
      // rejected the text it shows aria-invalid once React has re-rendered, so
      // look after that render: an invalid field stays open for correction.
      const field = event.target as HTMLElement;
      window.setTimeout(() => {
        if (field.isConnected && field.getAttribute("aria-invalid") !== "true") {
          onClose();
        }
      }, 0);
    }
  }

  return (
    <div
      ref={shellRef}
      className="editable-cell-editor"
      onKeyDown={handleKeyDown}
      // Capture phase: runs before the field's own blur commit, so a commit caused by tabbing away knows not to take focus back.
      onBlurCapture={(event) => {
        if (cancelledRef.current) {
          event.stopPropagation();
          return;
        }

        const nextFocus = event.relatedTarget as Node | null;
        if (nextFocus === null || !shellRef.current?.contains(nextFocus)) {
          onFocusLeaving();
        }
      }}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget as Node | null;
        if (nextFocus === null || !shellRef.current?.contains(nextFocus)) {
          onFocusLeft();
        }
      }}
    >
      {renderEditor(onClose, onClose)}
    </div>
  );
}

/** What RowMenu needs. */
interface RowMenuProps {
  readonly rowId: string;
  readonly rowName: string;
  readonly isOpen: boolean;
  readonly onOpen: () => void;
  /** Closes the menu; `returnFocus` is true when the user closed it with the keyboard or chose Duplicate. */
  readonly onClose: (returnFocus: boolean) => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

/**
 * The "⋯" button and its small menu (Duplicate, Delete) for one row. Works
 * from the keyboard: Enter or Space opens it with the first item focused,
 * Arrow Up/Down move between items, Escape closes it and returns focus to the
 * button, and Tab or a click elsewhere closes it. Used by EditableTable.
 */
function RowMenu({ rowId, rowName, isOpen, onOpen, onClose, onDuplicate, onDelete }: RowMenuProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (isOpen) {
      containerRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [isOpen]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose(true);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const items = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(currentIndex + step + items.length) % items.length]?.focus();
    }
  }

  return (
    <div
      className="row-menu"
      ref={containerRef}
      onBlur={(event) => {
        // Focus moving outside the whole menu (button and items) closes it without pulling focus back.
        const nextFocus = event.relatedTarget as Node | null;
        if (isOpen && (nextFocus === null || !containerRef.current?.contains(nextFocus))) {
          onClose(false);
        }
      }}
    >
      <button
        type="button"
        className="row-menu-button"
        data-menu-button={rowId}
        aria-label={`Actions for ${rowName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => (isOpen ? onClose(false) : onOpen())}
      >
        ⋯
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Row actions for ${rowName}`}
          onKeyDown={handleMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose(true);
              onDuplicate();
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
