/** One choice in a SegmentedToggle. */
interface ToggleOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

/** What SegmentedToggle needs: its choices, the selected one and a callback. */
interface SegmentedToggleProps<Value extends string> {
  /** Names the group for assistive technology, e.g. "Retirement spending as". */
  readonly label: string;
  /** Two or three options. */
  readonly options: readonly ToggleOption<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
}

/**
 * Two or three mutually exclusive choices shown side by side (the mockups'
 * `.toggle`), e.g. "% of today" or "$ amount" for retirement spending. Each
 * choice is a button whose `aria-pressed` says whether it is the selected one.
 * Controlled: the caller owns the selected value.
 */
export function SegmentedToggle<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedToggleProps<Value>) {
  return (
    <div className="toggle" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? "on" : undefined}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
