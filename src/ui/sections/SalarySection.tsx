import { useId, useState } from "react";

import { calculateIncomeTax } from "../../engine/incomeTax";
import { DEFAULT_INFLATION_RATE, DEFAULT_SALARY_GROWTH } from "../../plan/defaults";
import { usePlan, usePlanDispatch, usePlanStartYear } from "../../plan/PlanProvider";
import { bundledRuleSet } from "../../rules/bundledRuleSet";
import { rulesForYear } from "../../rules/ruleSet";
import { Card } from "../components/Card";
import { ExplainPanel } from "../components/ExplainPanel";
import { GrowthRateField, type GrowthRateOption } from "../components/GrowthRateField";
import { MoneyField } from "../components/MoneyField";
import { PerPersonFields } from "../components/PerPersonFields";
import { formatDollars } from "../format";

/** Every way a salary can grow (IN-7), in the order the dropdown lists them. */
const SALARY_GROWTH_OPTIONS: readonly GrowthRateOption[] = [
  "inflation",
  "inflationPlus",
  "inflationMinus",
  "fixed",
  "none",
];

/**
 * Form section for IN-7: each person's gross (pre-tax) salary and how it
 * grows. Shown first on Income & expenses, as in mockup 02. The salary sets
 * employer super contributions (from M5 step 5) and appears in Year by year.
 * Under each salary, an estimate of the tax and take-home pay on it (M8) with
 * its working. Built with `PerPersonFields`, so a second person (M7) gets their own
 * named fields with no change here. Reads the plan with `usePlan()` and edits
 * it with `usePlanDispatch()`.
 */
export function SalarySection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();
  const startYear = usePlanStartYear();

  // The tax rules for the plan's start year; today's salary is taxed on them.
  const yearRules = rulesForYear(
    bundledRuleSet,
    startYear,
    plan.assumptions.inflationRate ?? DEFAULT_INFLATION_RATE,
  );
  const incomeTaxRules = yearRules.incomeTax;
  // "2025-26" is shown with an en dash, like the other year ranges on screen.
  const ratesYearText = yearRules.incomeTaxFinancialYear.replace("-", "–");

  return (
    <Card title="Salary">
      <PerPersonFields people={plan.household.people}>
        {(person, fieldLabel) => (
          <>
            <MoneyField
              label={fieldLabel("Gross salary per year")}
              value={person.salary?.annual}
              hint="Before tax. Sets your employer super contributions. The estimated tax and take-home pay are shown below."
              onChange={(annual) => dispatch({ type: "setSalary", personId: person.id, annual })}
            />

            <GrowthRateField
              label={fieldLabel("Grows at")}
              options={SALARY_GROWTH_OPTIONS}
              value={person.salary?.growth}
              defaultValue={DEFAULT_SALARY_GROWTH}
              hint="No growth keeps the same dollars every year."
              numberLabel={fieldLabel}
              onChange={(growth) =>
                dispatch({ type: "setSalaryGrowth", personId: person.id, growth })
              }
            />

            {(person.salary?.annual ?? 0) > 0 && (
              <TaxEstimate
                label={fieldLabel}
                salary={person.salary?.annual ?? 0}
                incomeTaxRules={incomeTaxRules}
                ratesYearText={ratesYearText}
              />
            )}
          </>
        )}
      </PerPersonFields>
    </Card>
  );
}

/** What TaxEstimate needs. */
interface TaxEstimateProps {
  /** Adds the person's name to the text when there are several people. */
  readonly label: (label: string) => string;
  /** Today's gross salary per year; above $0 (the caller hides the estimate otherwise). */
  readonly salary: number;
  readonly incomeTaxRules: Parameters<typeof calculateIncomeTax>[1];
  /** The financial year of the rules used, e.g. "2025–26", for the caption. */
  readonly ratesYearText: string;
}

/**
 * One person's estimated tax and take-home pay on today's salary, with a
 * "How is this calculated?" breakdown from `calculateIncomeTax`. A guide: it
 * is the gross salary before salary sacrifice, interest and other income, in
 * today's dollars whatever the dollars toggle says. Used by SalarySection
 * under each salary above $0.
 */
function TaxEstimate({ label, salary, incomeTaxRules, ratesYearText }: TaxEstimateProps) {
  const panelId = useId();
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  const tax = calculateIncomeTax(salary, incomeTaxRules);
  const takeHome = salary - tax.value;

  return (
    <div className="tax-estimate">
      <p>
        {label(
          `Estimated tax ${formatDollars(tax.value)} · take-home ${formatDollars(takeHome)} a year`,
        )}
      </p>
      <p className="hint">
        {`On today's salary at ${ratesYearText} rates, before salary sacrifice and interest.`}
      </p>

      <button
        type="button"
        className="explain-toggle"
        aria-expanded={isExplanationOpen}
        aria-controls={panelId}
        onClick={() => setIsExplanationOpen(!isExplanationOpen)}
      >
        {label("How is this calculated?")}
      </button>

      <div id={panelId}>{isExplanationOpen && <ExplainPanel explained={tax} />}</div>
    </div>
  );
}
