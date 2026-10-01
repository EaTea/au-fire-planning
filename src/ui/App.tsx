import type { ReactElement } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router";

import { PlanProvider } from "../plan/PlanProvider";
import { AppShell } from "./components/AppShell";
import { firstStep, steps, type StepId } from "./navigation/steps";
import { AssetsScreen } from "./screens/AssetsScreen";
import { AssumptionsScreen } from "./screens/AssumptionsScreen";
import { IncomeExpensesScreen } from "./screens/IncomeExpensesScreen";
import { PlaceholderScreen } from "./screens/PlaceholderScreen";
import { ResultsScreen } from "./screens/ResultsScreen";

/** The steps that have a real screen; every other step still shows a placeholder. */
const realScreens: Partial<Record<StepId, ReactElement>> = {
  "income-expenses": <IncomeExpensesScreen />,
  assets: <AssetsScreen />,
  assumptions: <AssumptionsScreen />,
  results: <ResultsScreen />,
};

/**
 * Top-level component, rendered by src/main.tsx. Wraps the app in a hash
 * router (GitHub Pages can't route other paths back to index.html), with one
 * route per step in the step list and a catch-all that redirects `#/` and
 * unknown routes to the first step. The plan provider sits outside the router
 * so every screen can read and edit the plan.
 */
export function App() {
  return (
    <PlanProvider>
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

            <Route path="*" element={<Navigate to={firstStep.path} replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </PlanProvider>
  );
}
