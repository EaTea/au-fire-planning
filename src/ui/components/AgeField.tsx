import { formatAge, parseAge } from "../format";
import { NumberField } from "./NumberField";

/** Props of AgeField; `value`, `defaultValue`, `min` and `max` are whole years. */
interface AgeFieldProps {
  readonly label: string;
  /** The plan's value in whole years; undefined means "not set". */
  readonly value?: number;
  /** Shown in the dashed "default" style while `value` is unset. */
  readonly defaultValue?: number;
  /** Called with a valid age, or undefined when the user clears the field. */
  readonly onChange: (value?: number) => void;
  readonly hint?: string;
  readonly min?: number;
  readonly max?: number;
}

/**
 * A labelled text input for an age in whole years (current age, target
 * retirement age, the age contributions stop). Accepts "34", rejects "34.5"
 * and text. A thin wrapper over NumberField, like MoneyField and PercentField;
 * used by the Household and Assets screens.
 */
export function AgeField(props: AgeFieldProps) {
  return <NumberField {...props} formatValue={formatAge} parseText={parseAge} exampleText="34" />;
}
