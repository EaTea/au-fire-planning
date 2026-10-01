import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// ESLint flat config, run by `npm run lint` (and later by `npm run check` and CI).
// Order matters: later entries override earlier ones, so eslint-config-prettier
// comes last to switch off any style rules that would fight Prettier.
export default defineConfig(
  // Build output, reports and the requirements mockups are not app code.
  {
    ignores: ["dist/", "playwright-report/", "test-results/", "requirements/"],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  // App code and its unit/component tests run in the browser (jsdom) and use
  // React hooks.
  {
    files: ["src/**/*.{ts,tsx}", "tests/unit/**", "tests/setup/**"],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat.recommended],
  },

  // Tooling config files (vite.config.ts, eslint.config.js, ...) run in Node.
  {
    files: ["*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },

  prettierConfig,
);
