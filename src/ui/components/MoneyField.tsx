import { formatDollars, parseDollars } from "../format";
import { NumberField } from "./NumberField";

/** Props of MoneyField; `value`, `defaultValue`, `min` and `max` are in dollars. */
interface MoneyFieldProps {
  readonly label: string;
  /** The plan's value; undefined means "not set". */
  readonly value?: number;
  /** Shown in the dashed "default" style while `value` is unset. */
  readonly defaultValue?: number;
  /** Called with a valid new amount, or undefined when the user clears the field. */
  readonly onChange: (value?: number) => void;
  readonly hint?: string;
  readonly min?: number;
  readonly max?: number;
}

/**
 * A labelled text input for a dollar amount (living expenses, portfolio
 * value, a retirement spending amount). A thin wrapper that gives NumberField
 * the dollar formatter and parser; see NumberField for the draft, commit and
 * error behaviour. Used by the input screens, which store the committed value
 * in the plan through the reducer.
 */
export function MoneyField(props: MoneyFieldProps) {
  return (
    <NumberField
      {...props}
      formatValue={formatDollars}
      parseText={parseDollars}
      exampleText="60,000"
    />
  );
}
