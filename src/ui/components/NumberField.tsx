import { useId, useState } from "react";

/** What NumberField needs; MoneyField and PercentField fill in the format and parse parts. */
interface NumberFieldProps {
  readonly label: string;
  /** The plan's value; undefined means the user hasn't set it. */
  readonly value?: number;
  /** Shown in the dashed "default" style while `value` is unset. */
  readonly defaultValue?: number;
  /** Called with a valid new value, or undefined when the user clears the field. */
  readonly onChange: (value?: number) => void;
  readonly hint?: string;
  /** Smallest allowed value, in the field's own unit. */
  readonly min?: number;
  /** Largest allowed value, in the field's own unit. */
  readonly max?: number;

  /** Turns a number into the text shown in the box (e.g. formatDollars). */
  readonly formatValue: (value: number) => string;
  /** Reads typed text: a number, undefined for empty, NaN for invalid (e.g. parseDollars). */
  readonly parseText: (text: string) => number | undefined;
  /** Example of valid input, used in the error message. */
  readonly exampleText: string;
}

/**
 * The shared behaviour behind MoneyField and PercentField: a labelled text
 * input that keeps what the user types as a local draft and only reports a
 * value upward when they finish (blur or Enter). That way the plan, and so
 * every result, isn't recalculated on half-typed text.
 *
 *   typing -> draft (local) --blur/Enter--> parse -> valid?   -> onChange, draft dropped
 *                                                  -> invalid? -> inline error, draft kept
 *
 * Not used directly by screens; they use MoneyField or PercentField.
 */
export function NumberField({
  label,
  value,
  defaultValue,
  onChange,
  hint,
  min,
  max,
  formatValue,
  parseText,
  exampleText,
}: NumberFieldProps) {
  const inputId = useId();
  const messageId = useId();

  // undefined means "not editing": the box shows the plan's value instead.
  const [draftText, setDraftText] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // What the box shows when not editing: the plan's value, else the default.
  const isShowingDefault = value === undefined && defaultValue !== undefined;
  const shownValue = value ?? defaultValue;
  const shownText = shownValue === undefined ? "" : formatValue(shownValue);

  /**
   * Checks the draft and, if it is valid, reports it upward. Called on blur
   * and on Enter. Does nothing when the user didn't change the text, so
   * tabbing through a default field doesn't turn the default into a set value.
   */
  function commitDraft() {
    if (draftText === undefined || draftText === shownText) {
      setDraftText(undefined);
      setErrorMessage(undefined);
      return;
    }

    const parsedValue = parseText(draftText);

    if (parsedValue !== undefined && Number.isNaN(parsedValue)) {
      setErrorMessage(`Enter a number, for example ${exampleText}.`);
      return;
    }

    if (parsedValue !== undefined && min !== undefined && parsedValue < min) {
      setErrorMessage(`Enter a value of at least ${formatValue(min)}.`);
      return;
    }

    if (parsedValue !== undefined && max !== undefined && parsedValue > max) {
      setErrorMessage(`Enter a value of at most ${formatValue(max)}.`);
      return;
    }

    onChange(parsedValue);
    setDraftText(undefined);
    setErrorMessage(undefined);
  }

  // The dashed "default" look applies only while showing the default and not mid-edit.
  const inputClasses = [
    "input",
    isShowingDefault && draftText === undefined ? "default" : "",
    errorMessage === undefined ? "" : "invalid",
  ]
    .filter((className) => className !== "")
    .join(" ");

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>

      <div className={inputClasses}>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={draftText ?? shownText}
          aria-invalid={errorMessage !== undefined}
          aria-describedby={errorMessage === undefined ? undefined : messageId}
          // Select everything on focus so typing replaces the shown value or
          // default instead of being appended to it ("100%" + "90").
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraftText(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitDraft();
            }
          }}
        />
      </div>

      {errorMessage !== undefined && (
        <div className="field-error" id={messageId}>
          {errorMessage}
        </div>
      )}
      {hint !== undefined && <div className="hint">{hint}</div>}
    </div>
  );
}
