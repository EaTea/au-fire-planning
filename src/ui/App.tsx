import type { ReactElement } from "react";
import { HashRouter, Navigate, Route, Routes, useSearchParams } from "react-router";

import { PlanProvider } from "../plan/PlanProvider";
import { PersistenceProvider } from "../persistence/PersistenceProvider";
import type { PlanStore } from "../persistence/planStore";
import { DollarsModeProvider } from "./dollarsMode";
import { AppShell } from "./components/AppShell";
import { firstStep, steps, type StepId } from "./navigation/steps";
import { AssetsScreen } from "./screens/AssetsScreen";
import { AssumptionsScreen } from "./screens/AssumptionsScreen";
import { HouseholdScreen } from "./screens/HouseholdScreen";
import { IncomeExpensesScreen } from "./screens/IncomeExpensesScreen";
import { PlaceholderScreen } from "./screens/PlaceholderScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { YEAR_BY_YEAR_SECTION_ID } from "./screens/YearByYearSection";

/** The steps that have a real screen; every other step still shows a placeholder. */
const realScreens: Partial<Record<StepId, ReactElement>> = {
  household: <HouseholdScreen />,
  "income-expenses": <IncomeExpensesScreen />,
  assets: <AssetsScreen />,
  assumptions: <AssumptionsScreen />,
  results: <ResultsScreen />,
};

/** Props of App. */
interface AppProps {
  /** Where the plan is stored. Omitted in the real app (browser storage); component tests pass an in-memory store. */
  readonly openStore?: () => Promise<PlanStore>;
  /** Calendar year of today in the projection. Omitted in the real app (the clock is used); tests fix it, e.g. 2026. */
  readonly startYear?: number;
}

/**
 * Top-level component, rendered by src/main.tsx. Wraps the app in a hash
 * router (GitHub Pages can't route other paths back to index.html), with one
 * route per step in the step list, the first-run `/welcome` route (not a step),
 * the old `/year-by-year` route (now a section of Results) and a catch-all that redirects `#/` and
 * unknown routes to the first step. The plan provider sits outside the router
 * so every screen can read and edit the plan, and the persistence provider
 * (inside it) loads the saved plan and autosaves edits.
 */
export function App({ openStore, startYear }: AppProps) {
  return (
    <PlanProvider startYear={startYear}>
      <PersistenceProvider openStore={openStore}>
        <DollarsModeProvider>
          <HashRouter>
            <AppShell>
              <Routes>
                {steps.map((step) => (
                  <Route
                    key={step.id}
                    path={step.path}
                    element={realScreens[step.id] ?? <PlaceholderScreen step={step} />}
                  />
                ))}

                <Route path="/welcome" element={<WelcomeScreen />} />
                <Route path="/year-by-year" element={<YearByYearRedirect />} />

                <Route path="*" element={<Navigate to={firstStep.path} replace />} />
              </Routes>
            </AppShell>
          </HashRouter>
        </DollarsModeProvider>
      </PersistenceProvider>
    </PlanProvider>
  );
}

/**
 * Year by year used to be its own step; it is now the last section of
 * Results. This keeps old links and bookmarks working: `#/year-by-year?year=2038`
 * goes to that row on Results, and a bare `#/year-by-year` to the section's
 * heading (ResultsScreen and YearByYearSection do the scrolling).
 */
function YearByYearRedirect() {
  const [searchParams] = useSearchParams();
  const year = searchParams.get("year");

  const target =
    year === null ? `/results?view=${YEAR_BY_YEAR_SECTION_ID}` : `/results?year=${year}`;

  return <Navigate to={target} replace />;
}
