import { useId, useState } from "react";

/** What TextField needs: a label, the current text and a commit callback. */
interface TextFieldProps {
  readonly label: string;
  readonly value: string;
  /** Called with the new text when the user finishes editing (blur or Enter). */
  readonly onChange: (value: string) => void;
  readonly hint?: string;
}

/**
 * A labelled plain-text input that commits on blur or Enter, like MoneyField
 * but without parsing. Used for names, e.g. the portfolio name on the Assets
 * screen. Nothing is committed if the text didn't change.
 */
export function TextField({ label, value, onChange, hint }: TextFieldProps) {
  const inputId = useId();

  // undefined means "not editing": the box shows the committed value.
  const [draftText, setDraftText] = useState<string | undefined>(undefined);

  /** Reports the draft upward if it changed, then goes back to showing the committed value. */
  function commitDraft() {
    if (draftText !== undefined && draftText !== value) {
      onChange(draftText);
    }

    setDraftText(undefined);
  }

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>

      <div className="input">
        <input
          id={inputId}
          type="text"
          value={draftText ?? value}
          onChange={(event) => setDraftText(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitDraft();
            }
          }}
        />
      </div>

      {hint !== undefined && <div className="hint">{hint}</div>}
    </div>
  );
}
