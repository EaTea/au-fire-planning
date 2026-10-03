import { formatPercent, parsePercent } from "../format";
import { NumberField } from "./NumberField";

/** Props of PercentField; `value`, `defaultValue`, `min` and `max` are fractions (0.04 is 4%). */
interface PercentFieldProps {
  readonly label: string;
  /** The plan's value as a fraction; undefined means "not set". */
  readonly value?: number;
  /** Shown in the dashed "default" style while `value` is unset. */
  readonly defaultValue?: number;
  /** Called with a valid new fraction, or undefined when the user clears the field. */
  readonly onChange: (value?: number) => void;
  readonly hint?: string;
  readonly min?: number;
  readonly max?: number;
  /** Accept a leading minus, e.g. "-5%". Off by default so other fields keep rejecting it. */
  readonly allowNegative?: boolean;
}

/**
 * A labelled text input for a percentage (safe withdrawal rate, retirement
 * spending as a share of today's). The user types percent ("4.5") but the plan
 * holds a fraction (0.045); the conversion lives in parsePercent and
 * formatPercent. A thin wrapper over NumberField, used by the input screens.
 */
export function PercentField({ allowNegative = false, ...props }: PercentFieldProps) {
  return (
    <NumberField
      {...props}
      formatValue={formatPercent}
      parseText={(text) => parsePercent(text, allowNegative)}
      exampleText="4.5"
    />
  );
}
