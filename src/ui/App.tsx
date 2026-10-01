import { HashRouter, Navigate, Route, Routes } from "react-router";

import { AppShell } from "./components/AppShell";
import { firstStep, steps } from "./navigation/steps";
import { PlaceholderScreen } from "./screens/PlaceholderScreen";

/**
 * Top-level component, rendered by src/main.tsx. Wraps the app in a hash
 * router (GitHub Pages can't route other paths back to index.html), with one
 * route per step in the step list and a catch-all that redirects `#/` and
 * unknown routes to the first step.
 */
export function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          {steps.map((step) => (
            <Route key={step.id} path={step.path} element={<PlaceholderScreen step={step} />} />
          ))}

          <Route path="*" element={<Navigate to={firstStep.path} replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
