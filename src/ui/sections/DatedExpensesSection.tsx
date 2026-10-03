import { usePlan, usePlanDispatch, usePlanStartYear } from "../../plan/PlanProvider";
import { DEFAULT_PROJECTION_END_AGE } from "../../plan/defaults";
import type { DatedExpense } from "../../plan/types";
import { Card } from "../components/Card";
import { EditableTable, type EditableColumn } from "../components/EditableTable";
import { MoneyField } from "../components/MoneyField";
import { TextField } from "../components/TextField";
import { YearField } from "../components/YearField";
import { formatDollars } from "../format";

/**
 * Form section for EXP-3's dated and one-off expenses (a car in 2030, school
 * fees from 2032 to 2035). Each row is paid from the portfolio, then cash, in
 * its years, even before retirement. Amounts are in today's dollars and grow
 * with inflation. Used by the Income & expenses screen.
 *
 *   plan.expenses.datedExpenses ──► EditableTable rows ──edits──► dispatch(updateDatedExpense, ...)
 *
 * The From and To years are limited to the years the projection covers: the
 * start year + 1 (row 0 is today and has no flows) up to the year the person
 * reaches their plan-until age. The upper limit needs the current age; until it
 * is entered the years are only limited from below.
 */
export function DatedExpensesSection() {
  const plan = usePlan();
  const dispatch = usePlanDispatch();
  const startYear = usePlanStartYear();

  const expenses = plan.expenses.datedExpenses ?? [];

  const firstYear = startYear + 1;
  const currentAge = plan.household.people[0]?.currentAge;
  const endAge = plan.household.projectionEndAge ?? DEFAULT_PROJECTION_END_AGE;

  // The last year of the projection; unknown until the current age is entered,
  // and ignored if the ages are inconsistent (the Household screen reports that).
  const lastYearIfKnown = currentAge === undefined ? undefined : startYear + (endAge - currentAge);
  const lastYear =
    lastYearIfKnown !== undefined && lastYearIfKnown >= firstYear ? lastYearIfKnown : undefined;

  /** Applies edits to one row; used by every column's editor. */
  function updateExpense(
    id: string,
    changes: Partial<Pick<DatedExpense, "name" | "annual" | "fromYear" | "toYear">>,
  ) {
    dispatch({ type: "updateDatedExpense", id, changes });
  }

  const columns: EditableColumn<DatedExpense>[] = [
    {
      header: "Expense",
      cell: (expense) => (expense.name === "" ? "(unnamed)" : expense.name),
      editor: (expense) => (
        <TextField
          label={`Expense name for ${describe(expense)}`}
          value={expense.name}
          onChange={(name) => updateExpense(expense.id, { name })}
        />
      ),
    },
    {
      header: "Per year",
      // An unset amount counts as $0, shown as such.
      cell: (expense) => formatDollars(expense.annual ?? 0),
      editor: (expense) => (
        <MoneyField
          label={`Amount per year for ${describe(expense)}`}
          value={expense.annual}
          defaultValue={0}
          min={0}
          onChange={(annual) => updateExpense(expense.id, { annual })}
        />
      ),
    },
    {
      header: "From",
      cell: (expense) => String(expense.fromYear),
      editor: (expense) => (
        <YearField
          label={`From year for ${describe(expense)}`}
          value={expense.fromYear}
          min={firstYear}
          max={lastYear}
          // A cleared year can't be "unset": the row always has years, so ignore it.
          onChange={(fromYear) => {
            if (fromYear !== undefined) updateExpense(expense.id, { fromYear });
          }}
        />
      ),
    },
    {
      header: "To",
      cell: (expense) => (expense.toYear === expense.fromYear ? "(once)" : String(expense.toYear)),
      editor: (expense) => (
        <YearField
          label={`To year for ${describe(expense)}`}
          value={expense.toYear}
          min={firstYear}
          max={lastYear}
          onChange={(toYear) => {
            if (toYear !== undefined) updateExpense(expense.id, { toYear });
          }}
        />
      ),
    },
  ];

  return (
    <Card title="Dated and one-off expenses">
      <EditableTable
        label="Dated and one-off expenses"
        rows={expenses}
        columns={columns}
        getRowId={(expense) => expense.id}
        getRowName={(expense) => expense.name}
        addNoun="expense"
        emptyText="No dated expenses yet."
        onAdd={() => {
          const id = crypto.randomUUID();
          dispatch({ type: "addDatedExpense", id, startYear });
          return id;
        }}
        onDuplicate={(id) =>
          dispatch({ type: "duplicateDatedExpense", id, newId: crypto.randomUUID() })
        }
        onDelete={(id) => dispatch({ type: "removeDatedExpense", id })}
      />

      <div className="hint">
        In today&apos;s dollars, grown with inflation. Paid from the portfolio, then cash, in those
        years, even before you retire.
      </div>
    </Card>
  );
}

/** A row's name for field labels, matching the table's own wording for unnamed rows. */
function describe(expense: DatedExpense): string {
  return expense.name === "" ? "unnamed row" : expense.name;
}
