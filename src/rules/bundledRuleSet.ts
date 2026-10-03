// The rule set that ships with the app: every JSON file in src/rules/data/,
// parsed and validated once when this module is first imported.
//
//   data/fy*.json ──import.meta.glob──► parseRulesFile ──► ruleSetFromWire ──► bundledRuleSet
//
// Adding a new year's file is enough; no code changes (see the README). A
// malformed file throws here, and the unit test that imports this module turns
// that into a failing build rather than a broken app.

import { parseRulesFile } from "./rulesFile";
import { ruleSetFromWire, type RuleSet } from "./ruleSet";

/** Every data file's parsed JSON, found by Vite at build time. */
const rulesFileModules = import.meta.glob("./data/fy*.json", { eager: true, import: "default" });

/** The bundled rules, built once. PlanProvider passes this to the engine (M5 step 2 onwards). */
export const bundledRuleSet: RuleSet = ruleSetFromWire(
  Object.values(rulesFileModules).map(parseRulesFile),
);
