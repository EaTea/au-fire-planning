import { describe, expect, it } from "vitest";

import { defaultInterimSpending, retirementSpendingDollars } from "./interimDefault";
import type { Person, Plan } from "./types";

/** A plan with the given people and expenses, for the default rule. */
function planOf(people: Person[], expenses: Plan["expenses"] = {}): Plan {
  return { household: { people }, expenses, portfolios: [] } as unknown as Plan;
}

const alex: Person = {
  id: "a",
  label: "Person 1",
  name: "Alex",
  currentAge: 50,
  targetRetirementAge: 55,
};
const sam: Person = {
  id: "s",
  label: "Person 2",
  name: "Sam",
  currentAge: 40,
  targetRetirementAge: 60,
};

describe("retirementSpendingDollars", () => {
  it("reads an amount, a share of living expenses, and the 100% default", () => {
    expect(
      retirementSpendingDollars(
        planOf([alex], { retirementSpending: { kind: "amount", annual: 30000 } }),
      ),
    ).toBe(30000);
    expect(
      retirementSpendingDollars(
        planOf([alex], {
          livingAnnual: 50000,
          retirementSpending: { kind: "percentOfToday", fraction: 0.8 },
        }),
      ),
    ).toBe(40000);
    expect(retirementSpendingDollars(planOf([alex], { livingAnnual: 50000 }))).toBe(50000);
  });

  it("is unknown when it is a share and living expenses are not entered", () => {
    expect(retirementSpendingDollars(planOf([alex]))).toBeUndefined();
  });
});

describe("defaultInterimSpending", () => {
  const expenses: Plan["expenses"] = { retirementSpending: { kind: "amount", annual: 40000 } };

  it("is $0 for one person", () => {
    expect(defaultInterimSpending(planOf([alex], expenses))).toEqual({
      amount: 0,
      followsRetirementSpending: false,
    });
  });

  it("is the retirement spending when the later-retiring partner has no salary", () => {
    const result = defaultInterimSpending(planOf([alex, sam], expenses));

    expect(result.amount).toBe(40000);
    expect(result.followsRetirementSpending).toBe(true);
    expect(result.laterPerson?.name).toBe("Sam");
    expect(result.earlierPerson?.name).toBe("Alex");
  });

  it("is $0 when the later-retiring partner has a salary, even if the earlier one has none", () => {
    const result = defaultInterimSpending(
      planOf([alex, { ...sam, salary: { annual: 80000 } }], expenses),
    );

    expect(result.amount).toBe(0);
    expect(result.followsRetirementSpending).toBe(false);
  });

  it("only looks at the later partner's salary, not the earlier one's", () => {
    const result = defaultInterimSpending(
      planOf([{ ...alex, salary: { annual: 80000 } }, sam], expenses),
    );

    expect(result.amount).toBe(40000);
  });

  it("is $0 when both retire in the same year, or an age is missing", () => {
    expect(
      defaultInterimSpending(
        planOf([alex, { ...sam, targetRetirementAge: 50, currentAge: 45 }], expenses),
      ).amount,
    ).toBe(0);
    expect(
      defaultInterimSpending(planOf([alex, { ...sam, currentAge: undefined }], expenses)).amount,
    ).toBe(0);
  });
});
