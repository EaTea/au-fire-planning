import { formatYear, parseYear } from "../format";
import { NumberField } from "./NumberField";

/** Props of YearField; `value`, `defaultValue`, `min` and `max` are calendar years. */
interface YearFieldProps {
  readonly label: string;
  /** The plan's value as a calendar year; undefined means "not set". */
  readonly value?: number;
  /** Shown in the dashed "default" style while `value` is unset. */
  readonly defaultValue?: number;
  /** Called with a valid year, or undefined when the user clears the field. */
  readonly onChange: (value?: number) => void;
  readonly hint?: string;
  readonly min?: number;
  readonly max?: number;
}

/**
 * A labelled text input for a whole calendar year (such as the From and To
 * years of a dated expense). Accepts "2030"; rejects "2030.5" and text; shows
 * the year without a thousands separator. A thin wrapper over NumberField, like
 * AgeField; used as the editor in EditableTable cells by the Income & expenses
 * screen.
 */
export function YearField(props: YearFieldProps) {
  return (
    <NumberField {...props} formatValue={formatYear} parseText={parseYear} exampleText="2030" />
  );
}
