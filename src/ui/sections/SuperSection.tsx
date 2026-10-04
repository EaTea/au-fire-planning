import {
  DEFAULT_INFLATION_RATE,
  DEFAULT_SUPER_BALANCE,
  DEFAULT_SUPER_CONTRIBUTION_ANNUAL,
  DEFAULT_SUPER_RETURN,
} from "../../plan/defaults";
import { usePlan, usePlanDispatch, usePlanStartYear } from "../../plan/PlanProvider";
import { bundledRuleSet } from "../../rules/bundledRuleSet";
import { rulesForYear } from "../../rules/ruleSet";
import { Card } from "../components/Card";
import { MoneyField } from "../components/MoneyField";
import { PerPersonFields } from "../components/PerPersonFields";
import { PercentField } from "../components/PercentField";
import { YearField } from "../components/YearField";
import { formatPercent } from "../format";

/** The last calendar year the stored plan accepts for a contribution (the wire limit). */
const LAST_CONTRIBUTION_YEAR = 2200;

/** A rate field's range: 0% to 100%, the same limits as the stored document. */
const MAXIMUM_RATE = 1;

/**
 * Form section for IN-21 to IN-23 and SUPER-5: each person's super balance,
 * its return net of fees, the employer contribution rate, salary sacrifice
 * and non-concessional contributions (each with From and To years), and, under
 * "Advanced", the tax on earnings. Shown first on Assets (mockup 03d).
 *
 *   plan.household.people[].superAccount ──► fields ──edits──► dispatch(setSuper…, personId)
 *
 * The employer rate and the tax on earnings show the law's figure for the
 * plan's start year, read from the bundled rules (NFR-3) and never typed
 * into this file, as "12% (legislated)" while unset. Unset contribution
 * years show next year (From) and the retirement year (To) as dashed
 * defaults. Built with `PerPersonFields` so a second person (M7) gets their
 * own named fields. Reads the plan with `usePlan()` and edits it with
 * `usePlanDispatch()`.
 */
export function SuperSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();
  const startYear = usePlanStartYear();

  // The law's rates for this year, which the dashed defaults show.
  const legislated = rulesForYear(
    bundledRuleSet,
    startYear,
    plan.assumptions.inflationRate ?? DEFAULT_INFLATION_RATE,
  ).superannuation;

  // Row 0 is today and has no flows, so contributions start no earlier than next year.
  const firstYear = startYear + 1;

  return (
    <Card title="Super">
      <PerPersonFields people={plan.household.people}>
        {(person, fieldLabel) => {
          const account = person.superAccount;

          // The retirement year needs both ages; without them "To" has no default.
          const retirementYear =
            person.currentAge !== undefined && person.targetRetirementAge !== undefined
              ? startYear + (person.targetRetirementAge - person.currentAge)
              : undefined;
          const defaultToYear =
            retirementYear !== undefined && retirementYear >= firstYear
              ? retirementYear
              : undefined;

          return (
            <>
              <MoneyField
                label={fieldLabel("Super balance")}
                value={account?.balance}
                defaultValue={DEFAULT_SUPER_BALANCE}
                min={0}
                onChange={(balance) =>
                  dispatch({ type: "setSuperBalance", personId: person.id, balance })
                }
              />

              <PercentField
                label={fieldLabel("Return, net of fees")}
                value={account?.returnRate}
                defaultValue={DEFAULT_SUPER_RETURN}
                min={0}
                max={MAXIMUM_RATE}
                hint="After fees, before tax. The app takes off the tax on earnings."
                onChange={(rate) => dispatch({ type: "setSuperReturn", personId: person.id, rate })}
              />

              <PercentField
                label={fieldLabel("Employer contribution rate")}
                value={account?.employerRate}
                defaultValue={legislated.guaranteeRate}
                defaultText={`${formatPercent(legislated.guaranteeRate)} (legislated)`}
                min={0}
                max={MAXIMUM_RATE}
                onChange={(rate) =>
                  dispatch({ type: "setEmployerRate", personId: person.id, rate })
                }
              />

              <MoneyField
                label={fieldLabel("Salary sacrifice per year")}
                value={account?.salarySacrifice?.annual}
                defaultValue={DEFAULT_SUPER_CONTRIBUTION_ANNUAL}
                min={0}
                hint="Before tax, from your salary while you work. Taxed 15% going in."
                onChange={(annual) =>
                  dispatch({ type: "setSalarySacrifice", personId: person.id, annual })
                }
              />
              <YearField
                label={fieldLabel("Salary sacrifice from year")}
                value={account?.salarySacrifice?.fromYear}
                defaultValue={firstYear}
                min={firstYear}
                max={LAST_CONTRIBUTION_YEAR}
                onChange={(year) =>
                  dispatch({ type: "setSalarySacrificeFromYear", personId: person.id, year })
                }
              />
              <YearField
                label={fieldLabel("Salary sacrifice to year")}
                value={account?.salarySacrifice?.toYear}
                defaultValue={defaultToYear}
                min={firstYear}
                max={LAST_CONTRIBUTION_YEAR}
                onChange={(year) =>
                  dispatch({ type: "setSalarySacrificeToYear", personId: person.id, year })
                }
              />

              <MoneyField
                label={fieldLabel("Non-concessional contributions per year")}
                value={account?.nonConcessional?.annual}
                defaultValue={DEFAULT_SUPER_CONTRIBUTION_ANNUAL}
                min={0}
                hint="From after-tax money. Not taxed going in."
                onChange={(annual) =>
                  dispatch({ type: "setNonConcessional", personId: person.id, annual })
                }
              />
              <YearField
                label={fieldLabel("Non-concessional contributions from year")}
                value={account?.nonConcessional?.fromYear}
                defaultValue={firstYear}
                min={firstYear}
                max={LAST_CONTRIBUTION_YEAR}
                onChange={(year) =>
                  dispatch({ type: "setNonConcessionalFromYear", personId: person.id, year })
                }
              />
              <YearField
                label={fieldLabel("Non-concessional contributions to year")}
                value={account?.nonConcessional?.toYear}
                defaultValue={defaultToYear}
                min={firstYear}
                max={LAST_CONTRIBUTION_YEAR}
                onChange={(year) =>
                  dispatch({ type: "setNonConcessionalToYear", personId: person.id, year })
                }
              />

              {/* A native disclosure: keyboard-reachable and toggled with Enter or Space. */}
              <details className="advanced">
                <summary>Advanced</summary>

                <PercentField
                  label={fieldLabel("Tax on earnings")}
                  value={account?.earningsTaxRate}
                  defaultValue={legislated.earningsTaxRate}
                  defaultText={`${formatPercent(legislated.earningsTaxRate)} (legislated)`}
                  min={0}
                  max={MAXIMUM_RATE}
                  hint="15% is the most the law charges. Funds often pay less because of the 10% rate on long-held gains and franking credits. Enter your fund's rate if you know it."
                  onChange={(rate) =>
                    dispatch({ type: "setEarningsTaxRate", personId: person.id, rate })
                  }
                />
              </details>
            </>
          );
        }}
      </PerPersonFields>
    </Card>
  );
}
