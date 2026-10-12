import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from "react";

/** Props of StartOverDialog. */
interface StartOverDialogProps {
  /** Whether the dialog is showing. AppShell opens it when the logo is clicked. */
  readonly isOpen: boolean;
  /** Called when the user presses "Start over". AppShell then replaces the plan. */
  readonly onConfirm: () => void;
  /** Called when the user keeps their plan: "Keep my plan", Escape, or a click outside the dialog. */
  readonly onCancel: () => void;
}

/**
 * Asks the user to confirm before "Start over" clears their plan (NFR-8),
 * because the cleared plan can't be recovered. Rendered by AppShell.
 *
 * Uses the browser's modal <dialog>, which keeps focus inside it, closes on
 * Escape (the `cancel` event) and returns focus to the logo when it closes.
 * "Keep my plan" gets focus when it opens, so an accidental Enter is safe.
 *
 *   isOpen false ──► true : showModal(), focus "Keep my plan"
 *   isOpen true  ──► false: close()
 *   Escape / backdrop / "Keep my plan" ──► onCancel
 *   "Start over"                        ──► onConfirm
 */
export function StartOverDialog({ isOpen, onConfirm, onCancel }: StartOverDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepPlanButtonRef = useRef<HTMLButtonElement>(null);

  // Keep the native dialog in step with `isOpen`, which AppShell owns.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      keepPlanButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  /**
   * Escape fires `cancel`. The browser would close the dialog itself, but
   * AppShell's `isOpen` must change too, so let onCancel close it instead.
   */
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onCancel();
  }

  /**
   * A click whose target is the <dialog> itself landed on the backdrop: the
   * dialog's contents fill its box, so clicks inside hit a child element.
   */
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="start-over-dialog"
      aria-labelledby="start-over-title"
      aria-describedby="start-over-description"
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="start-over-dialog-content">
        <h2 id="start-over-title">Start over?</h2>
        <p id="start-over-description">
          This clears everything you&apos;ve entered on this device. It can&apos;t be undone.
        </p>

        <div className="start-over-dialog-buttons">
          <button ref={keepPlanButtonRef} type="button" className="footer-link" onClick={onCancel}>
            Keep my plan
          </button>
          <button type="button" className="footer-link start-over-confirm" onClick={onConfirm}>
            Start over
          </button>
        </div>
      </div>
    </dialog>
  );
}
