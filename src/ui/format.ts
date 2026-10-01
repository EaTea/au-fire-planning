// Formatting and parsing of the two kinds of number M1 shows: dollars and
// percentages. The fields (MoneyField, PercentField), ExplainPanel and the
// results screens all go through here so a figure looks the same wherever it
// appears, and so what a user types is read back the same way it is shown.
//
// M1 shows today's dollars only. `formatDollars` is replaced by a
// today's/nominal-aware `formatMoney` in M2.

const dollarFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

// Whole numbers print without a decimal point ("45%"); otherwise at most one
// decimal place ("4.5%").
const percentFormatter = new Intl.NumberFormat("en-AU", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Formats whole dollars for display, e.g. 1600000 becomes "$1,600,000". */
export function formatDollars(value: number): string {
  return dollarFormatter.format(value);
}

/** Formats a fraction as a percentage with at most one decimal, e.g. 0.045 becomes "4.5%". */
export function formatPercent(fraction: number): string {
  return percentFormatter.format(fraction);
}

// Optional "$", then digits either plain ("60000") or grouped in threes
// ("60,000"), then an optional decimal part ("60000.50").
const dollarTextPattern = /^\$?\s*(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/;

/**
 * Reads the text a user typed into a MoneyField. Accepts "60000", "60,000",
 * "$60,000" and "60000.50". Returns undefined for empty text (the field was
 * cleared) and NaN for anything else, so the caller can tell "cleared" from
 * "invalid" without exceptions.
 */
export function parseDollars(text: string): number | undefined {
  const trimmed = text.trim();

  if (trimmed === "") {
    return undefined;
  }
  if (!dollarTextPattern.test(trimmed)) {
    return NaN;
  }

  // Drop the "$" and the thousands separators, then let Number read the rest.
  return Number(trimmed.replace(/[$,\s]/g, ""));
}

// Digits with an optional decimal part, then an optional "%".
const percentTextPattern = /^(\d+(\.\d+)?|\.\d+)\s*%?$/;

/**
 * Reads the text a user typed into a PercentField. Accepts "4", "4.5" and
 * "4.5%" and returns a fraction (0.045), the form the plan stores. Returns
 * undefined for empty text and NaN for anything else.
 */
export function parsePercent(text: string): number | undefined {
  const trimmed = text.trim();

  if (trimmed === "") {
    return undefined;
  }
  if (!percentTextPattern.test(trimmed)) {
    return NaN;
  }

  const percentNumber = Number(trimmed.replace(/[%\s]/g, ""));

  // Rounding removes binary floating-point noise from the division
  // (so 4.1% is 0.041, not 0.040999999999999995).
  return Number((percentNumber / 100).toFixed(10));
}
