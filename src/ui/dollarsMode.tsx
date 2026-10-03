// Today's dollars or nominal dollars (OUT-2): one choice that every dollar
// figure in the projection follows.
//
//   DollarsModeProvider ──► useDollarsMode()      (mode + setter, used by the toggle)
//                       └─► useMoneyFormatter()   (formatMoney(nominal, inflationIndex))
//
// The mode lives in memory only; remembering it between visits is a follow-up.

import { createContext, useContext, useState, type ReactNode } from "react";

import { SegmentedToggle } from "./components/SegmentedToggle";
import { formatDollars } from "./format";

/** "today": values divided by the inflation index. "nominal": the dollars of that year. */
export type DollarsMode = "today" | "nominal";

/** The mode and how to change it. */
interface DollarsModeContextValue {
  readonly mode: DollarsMode;
  readonly setMode: (mode: DollarsMode) => void;
}

const DollarsModeContext = createContext<DollarsModeContextValue | null>(null);

/** Props of DollarsModeProvider. */
interface DollarsModeProviderProps {
  /** Starting mode; defaults to nominal dollars. Tests use it to start in today's dollars. */
  readonly initialMode?: DollarsMode;
  readonly children: ReactNode;
}

/**
 * Holds the today's/nominal choice for everything below it. Wraps the app in
 * src/ui/App.tsx so the toggle and every figure that shows projected dollars
 * agree.
 */
export function DollarsModeProvider({
  initialMode = "nominal",
  children,
}: DollarsModeProviderProps) {
  const [mode, setMode] = useState<DollarsMode>(initialMode);

  return (
    <DollarsModeContext.Provider value={{ mode, setMode }}>{children}</DollarsModeContext.Provider>
  );
}

/** Returns the current mode and its setter. Used by `DollarsModeToggle`. */
export function useDollarsMode(): DollarsModeContextValue {
  const value = useContext(DollarsModeContext);

  if (value === null) {
    throw new Error("useDollarsMode must be used inside a DollarsModeProvider");
  }

  return value;
}

/**
 * Returns `formatMoney(nominalValue, inflationIndex)`. In today's mode it
 * divides the nominal value by the row's inflation index first; in nominal
 * mode it shows the value as it is. Used by the Year by year table, the chart and the
 * Results screen so every projected figure follows the toggle.
 */
export function useMoneyFormatter(): (nominalValue: number, inflationIndex: number) => string {
  const { mode } = useDollarsMode();

  return (nominalValue, inflationIndex) =>
    formatDollars(mode === "today" ? nominalValue / inflationIndex : nominalValue);
}

/** The "Show values in" switch between today's and nominal dollars. */
export function DollarsModeToggle() {
  const { mode, setMode } = useDollarsMode();

  return (
    <SegmentedToggle
      label="Show values in"
      options={[
        { value: "today", label: "Today's dollars" },
        { value: "nominal", label: "Nominal" },
      ]}
      value={mode}
      onChange={setMode}
    />
  );
}
