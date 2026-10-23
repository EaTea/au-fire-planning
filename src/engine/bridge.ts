// The bridge check (FIRE-4): can money outside super fund the years from
// retirement until super opens, and can super plus what is left outside fund
// the rest of the plan?
//
//  working ──────► retirement ─── bridge ───► super accessible ─── after access ───► end
//                     row R      (outside super           row A        (super + what's
//                                 funds it alone)                       left outside)
//
//   projectPortfolio ─► rows ─┐
//                             ├─► assessBridge ─► BridgeAssessment ─► Results (M6 step 7)
//   effectiveSuperAccessAge ──┘   (per person)
//
// With several people (M7), row R is the last row everybody works
// (`firstRetirementRowIndex`) and row A is the earliest row at which any
// person's super opens (among people who have super). The bridge need is net
// of portfolio contributions still paid while a partner works, and the
// after-access need is discounted at the partners' super returns weighted by
// their balances. A partner whose super is still locked when after access
// begins gets a separate "locked until" line in the projected working.
//
// The status of each part comes from the projection's own shortfalls, so it is
// exact: a part is MET when none of its years has a shortfall. The "need" and
// "projected" figures are a guide so a bar can compare them: the need is the
// part's spending discounted back to the row before the part starts, and the
// projected amount is what the plan holds at the end of that row.
//
// Every withdrawal this milestone allows is at or after 60, so it is
// tax-free; the explanations say so, and M8 relies on it.
//
// Pure, like the rest of the engine. Called by `summariseProjection`
// (src/engine/fiNumber.ts).

import type { Explained, ExplanationLine } from "./explained";
import {
  effectiveSuperAccessAge,
  firstRetirementRowIndex,
  type ProjectionInputs,
  type ProjectionPerson,
  type ProjectionRow,
} from "./projection";
import { rulesForYear } from "../rules/ruleSet";

/** Whether a part of the plan is funded. The words are shown as text, never by colour alone. */
export type BridgeStatus = "met" | "short";

/** One part of the check: the bridge years, or the years after access. */
export interface BridgePart {
  /** The first and last calendar years of the part. */
  readonly firstYear: number;
  readonly lastYear: number;
  /** The ages in those years. */
  readonly firstAge: number;
  readonly lastAge: number;
  /** The spending in those years, discounted to the row before the part starts (nominal dollars of that row). */
  readonly need: Explained;
  /** What the plan holds at the end of that row (nominal dollars of that row): the bar to compare with the need. */
  readonly projected: Explained;
  /**
   * The need before any portfolio contributions are netted off (the same
   * dollars as `need`). Equal to `need` when no contributions are paid in the
   * part's years, and always for the after-access part. Coasting stops the
   * contributions, so the outside-super Coast FIRE test aims at this figure.
   */
  readonly needBeforeContributions: number;
  /** MET when no year in the part has a shortfall. */
  readonly status: BridgeStatus;
  /** The calendar years in the part that can't be fully funded, in order. */
  readonly shortYears: readonly number[];
}

/** An effective super access age and whose it is. */
export interface EffectiveAccess {
  /** `ProjectionPerson.id` of the person whose super opens first. */
  readonly personId: string;
  /** Their position in `ProjectionInputs.people` (and in each row's `people`). */
  readonly personIndex: number;
  /** Their effective access age. */
  readonly age: number;
}

/** The result of the bridge check. Both parts are absent when there is no super. */
export interface BridgeAssessment {
  /**
   * The first age super can be drawn while retired (see `effectiveSuperAccessAge`),
   * with the person it belongs to: the person who has super and whose super opens
   * first. The age is that person's own, so readers must not pair it with anyone else.
   */
  readonly effectiveAccess?: EffectiveAccess;
  /** The retired years before super opens. Absent when you retire at or after the access age ("no bridge needed"). */
  readonly bridge?: BridgePart;
  /** From the effective access age to the end of the plan. Absent when the plan ends before access. */
  readonly afterAccess?: BridgePart;
}

/**
 * Checks the bridge and the years after access for a projection.
 *
 * `rows` are from `projectPortfolio(inputs, rows[0].calendarYear)`. The bridge
 * is the retired years before the effective access age (of the person whose
 * super opens first); its need is the spending in them discounted to the retirement row at the portfolio's return
 * (the portfolio pays first), and its projected amount is portfolio + cash at
 * the end of the retirement row. After access, the need is that spending
 * discounted to the row before access at super's after-tax return, and the
 * projected amount is super + portfolio + cash at the end of that row.
 * Never throws on user data.
 */
export function assessBridge(
  rows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
): BridgeAssessment {
  const todayRow = rows[0];
  if (todayRow === undefined) return {};

  const startYear = todayRow.calendarYear;
  const opening = firstSuperToOpen(rows, inputs, startYear);
  if (opening === undefined) return {};

  const { person: openingPerson, personIndex: openingPersonIndex, account, accessAge } = opening;

  const retirementRowIndex = firstRetirementRowIndex(inputs);
  const accessRowIndex = accessAge - openingPerson.currentAge;
  const lastRowIndex = rows.length - 1;

  const preservationAge = rulesForYear(account.ruleSet, startYear, inputs.inflationRate)
    .superannuation.preservationAgeYears;
  const taxFreeNote: ExplanationLine = {
    label: "Withdrawals are tax-free from age",
    value: preservationAge,
    unit: "years",
    source: "rule",
  };

  // The bridge: retired years before access, up to the end of the plan.
  let bridge: BridgePart | undefined;
  const retirementRow = rows[retirementRowIndex];
  const bridgeLastIndex = Math.min(accessRowIndex - 1, lastRowIndex);

  if (retirementRow !== undefined && bridgeLastIndex > retirementRowIndex) {
    bridge = describePart({
      rows,
      baseRow: retirementRow,
      firstIndex: retirementRowIndex + 1,
      lastIndex: bridgeLastIndex,
      discountRate: inputs.expectedReturn,
      discountRateName: "the portfolio's return",
      projectedAmount: retirementRow.portfolioClosing + retirementRow.cashClosing,
      projectedLines: [
        { label: "Portfolio", value: retirementRow.portfolioClosing },
        { label: "Cash", value: retirementRow.cashClosing },
      ],
      partPhrase: "for the bridge",
      netOffContributions: true,
    });
  }

  // After access: from the effective access age (never before row 1) to the end.
  let afterAccess: BridgePart | undefined;
  const firstAfterIndex = Math.max(1, accessRowIndex);
  const baseRow = rows[firstAfterIndex - 1];

  if (baseRow !== undefined && firstAfterIndex <= lastRowIndex) {
    afterAccess = describePart({
      rows,
      baseRow,
      firstIndex: firstAfterIndex,
      lastIndex: lastRowIndex,
      discountRate: weightedSuperReturnAfterTax(inputs, baseRow, account),
      discountRateName: "super's return after earnings tax",
      projectedAmount: baseRow.superClosing + baseRow.portfolioClosing + baseRow.cashClosing,
      projectedLines: [
        ...superLinesAt(rows, firstAfterIndex, inputs, startYear, openingPerson, baseRow),
        { label: "Portfolio", value: baseRow.portfolioClosing },
        { label: "Cash", value: baseRow.cashClosing },
      ],
      partPhrase: "after super is accessible",
      taxFreeNote,
    });
  }

  return {
    effectiveAccess: {
      personId: openingPerson.id,
      personIndex: openingPersonIndex,
      age: accessAge,
    },
    ...(bridge === undefined ? {} : { bridge }),
    ...(afterAccess === undefined ? {} : { afterAccess }),
  };
}

/** The person whose super opens first, with their super account and effective access age. */
interface FirstSuperToOpen {
  readonly person: ProjectionPerson;
  readonly personIndex: number;
  readonly account: NonNullable<ProjectionPerson["superAccount"]>;
  readonly accessAge: number;
}

/**
 * Whether one person has any super to speak of: in at least one row they hold
 * a balance or receive a contribution (employer, salary sacrifice or
 * non-concessional). The engine carries an empty account for a person who
 * entered nothing, and that must not count: an empty account never "opens".
 * Called by `firstSuperToOpen`.
 */
function personHasSuper(rows: readonly ProjectionRow[], personIndex: number): boolean {
  return rows.some((row) => {
    const personYear = row.people[personIndex];

    return (
      personYear !== undefined &&
      (personYear.superClosing > 0 ||
        personYear.employerContribution > 0 ||
        personYear.salarySacrifice > 0 ||
        personYear.nonConcessional > 0)
    );
  });
}

/**
 * The person whose super opens first (the earliest access row) among the
 * people who have super (see `personHasSuper`), with their effective access
 * age. `undefined` when nobody has super, which means there is no bridge
 * check. Called by `assessBridge`.
 */
function firstSuperToOpen(
  rows: readonly ProjectionRow[],
  inputs: ProjectionInputs,
  startYear: number,
): FirstSuperToOpen | undefined {
  let earliest: FirstSuperToOpen | undefined;

  for (const [personIndex, person] of inputs.people.entries()) {
    const account = person.superAccount;
    const accessAge = effectiveSuperAccessAge(person, inputs, startYear);
    if (account === undefined || accessAge === undefined) continue;
    if (!personHasSuper(rows, personIndex)) continue;

    // The access row is the age's distance from today; the earliest row wins, the first person on a tie.
    const isEarlier =
      earliest === undefined ||
      accessAge - person.currentAge < earliest.accessAge - earliest.person.currentAge;

    if (isEarlier) earliest = { person, personIndex, account, accessAge };
  }

  return earliest;
}

/**
 * The rate the after-access need is discounted at: each partner's super
 * return after earnings tax, weighted by their super balance at the base row
 * (the row before access). With one person that person's rate exactly. If no
 * one holds a balance at the base row, `fallbackAccount` (the account of the
 * person whose super opens first) supplies the rate. Called by `assessBridge`.
 */
function weightedSuperReturnAfterTax(
  inputs: ProjectionInputs,
  baseRow: ProjectionRow,
  fallbackAccount: NonNullable<ProjectionPerson["superAccount"]>,
): number {
  /** One account's return after earnings tax, with the rules of the base row's year. */
  const afterTaxReturn = (account: NonNullable<ProjectionPerson["superAccount"]>): number => {
    const rules = rulesForYear(
      account.ruleSet,
      baseRow.calendarYear,
      inputs.inflationRate,
    ).superannuation;

    return account.returnRate * (1 - (account.earningsTaxRate ?? rules.earningsTaxRate));
  };

  const holders = inputs.people.flatMap((person, personIndex) => {
    const balance = baseRow.people[personIndex]?.superClosing ?? 0;

    return person.superAccount === undefined || balance <= 0
      ? []
      : [{ account: person.superAccount, balance }];
  });
  const totalBalance = holders.reduce((total, holder) => total + holder.balance, 0);

  if (totalBalance <= 0) return afterTaxReturn(fallbackAccount);

  // Share first, then multiply, so one holder's rate comes back exactly.
  return holders.reduce(
    (rate, holder) => rate + (holder.balance / totalBalance) * afterTaxReturn(holder.account),
    0,
  );
}

/**
 * The super lines of the after-access "projected" working. One person who has
 * super gets the single line "Super". With several holders each gets their
 * own line, and a partner whose super is still locked when after access
 * begins is marked "locked until {age} ({year})", so the total can't look
 * healthier than the early after-access years really are. Called by
 * `assessBridge`.
 */
function superLinesAt(
  rows: readonly ProjectionRow[],
  firstAfterIndex: number,
  inputs: ProjectionInputs,
  startYear: number,
  openingPerson: ProjectionPerson,
  baseRow: ProjectionRow,
): { label: string; value: number; note?: string }[] {
  const holderIndexes = inputs.people.flatMap((_person, personIndex) =>
    personHasSuper(rows, personIndex) ? [personIndex] : [],
  );

  if (holderIndexes.length <= 1) return [{ label: "Super", value: baseRow.superClosing }];

  const firstAfterRow = rows[firstAfterIndex];

  return holderIndexes.flatMap((personIndex) => {
    const person = inputs.people[personIndex];
    const balance = baseRow.people[personIndex]?.superClosing;
    if (person === undefined || balance === undefined) return [];

    const isLocked = firstAfterRow?.people[personIndex]?.superAccessible === false;
    const accessAge = effectiveSuperAccessAge(person, inputs, startYear);

    return [
      {
        label: `${person.label}'s super`,
        value: balance,
        ...(isLocked && accessAge !== undefined
          ? {
              note: `locked until ${accessAge} (${startYear + (accessAge - person.currentAge)})`,
            }
          : {}),
      },
    ];
  });
}

/**
 * Whether the plan has any super to speak of: super holds money in at least one
 * year. The engine always carries a super account (an empty one when nothing
 * was entered), so this is how Results tells "no super" from "super": the
 * bridge card, the "Super accessible" milestone and the bridge bands appear
 * only when it is true. Called by the Results screens.
 */
export function projectionHasSuper(rows: readonly ProjectionRow[]): boolean {
  return rows.some((row) => row.superClosing > 0);
}

/** What `describePart` needs to describe one part of the check. */
interface PartDescription {
  readonly rows: readonly ProjectionRow[];
  /** The row before the part starts; the need and projected amount are in its dollars. */
  readonly baseRow: ProjectionRow;
  readonly firstIndex: number;
  readonly lastIndex: number;
  readonly discountRate: number;
  readonly discountRateName: string;
  readonly projectedAmount: number;
  readonly projectedLines: readonly { label: string; value: number; note?: string }[];
  /**
   * True for the bridge: portfolio contributions still paid in the part's years
   * (while a partner works) are netted off the need, discounted like spending.
   */
  readonly netOffContributions?: boolean;
  /** "for the bridge" or "after super is accessible": completes "Need …" and "Projected …" labels. */
  readonly partPhrase: string;
  /** Added as the last line of the projected working, for parts that withdraw super. */
  readonly taxFreeNote?: ExplanationLine;
}

/**
 * Builds one `BridgePart` from the rows in its years: the discounted need,
 * the projected amount, and the status and short years from the rows'
 * shortfalls. Called by `assessBridge` for each part.
 */
function describePart(description: PartDescription): BridgePart {
  const { rows, baseRow, firstIndex, lastIndex, discountRate } = description;
  const partRows = rows.slice(firstIndex, lastIndex + 1);
  const firstRow = partRows[0] as ProjectionRow;
  const lastRow = partRows[partRows.length - 1] as ProjectionRow;

  // Each year's spending, as a value at the base row: nominal ÷ (1+rate)^(years after the base row).
  const discountFactor = (row: ProjectionRow): number =>
    Math.pow(1 + discountRate, row.yearIndex - baseRow.yearIndex);

  const spendingTotal = partRows.reduce((total, row) => total + row.spending, 0);
  const discountedSpending = partRows.reduce(
    (total, row) => total + row.spending / discountFactor(row),
    0,
  );

  // Contributions still paid into the portfolio in these years pay for part of the spending,
  // so the bridge only has to cover the rest (with none paid, this is exactly 0).
  const discountedContributions = description.netOffContributions
    ? partRows.reduce((total, row) => total + row.contribution / discountFactor(row), 0)
    : 0;

  const rawNeed = discountedSpending - discountedContributions;
  const need = Math.max(0, rawNeed);

  const years = `${firstRow.calendarYear} – ${lastRow.calendarYear}`;
  const percent = `${Number((discountRate * 100).toPrecision(12))}%`;
  const shortYears = partRows.filter((row) => row.shortfall > 0).map((row) => row.calendarYear);

  const contributionLines: ExplanationLine[] =
    discountedContributions > 0
      ? [
          {
            label: `Less portfolio contributions paid in those years, discounted to ${baseRow.calendarYear}`,
            // Never more than the spending, so the lines still add up when contributions cover it all.
            value: rawNeed >= 0 ? discountedContributions : discountedSpending,
            unit: "dollars",
            operator: "−",
            source: "calculated",
          },
        ]
      : [];

  const needExplained: Explained = {
    value: need,
    unit: "dollars",
    lines: [
      {
        label: `Spending in ${years}`,
        value: spendingTotal,
        unit: "dollars",
        source: "calculated",
      },
      {
        label: `Less discounting to ${baseRow.calendarYear} at ${percent} (${description.discountRateName})`,
        value: spendingTotal - discountedSpending,
        unit: "dollars",
        operator: "−",
        source: "calculated",
      },
      ...contributionLines,
      {
        label: `Need ${description.partPhrase} at ${baseRow.calendarYear}`,
        value: need,
        unit: "dollars",
        operator: "=",
        source: "calculated",
      },
    ],
  };

  const projectedExplained: Explained = {
    value: description.projectedAmount,
    unit: "dollars",
    lines: [
      ...description.projectedLines.map((line, index): ExplanationLine => ({
        label: `${line.label} at end of ${baseRow.calendarYear}${line.note === undefined ? "" : `, ${line.note}`}`,
        value: line.value,
        unit: "dollars",
        ...(index === 0 ? {} : { operator: "+" as const }),
        source: "calculated",
      })),
      {
        label: `Projected ${description.partPhrase}`,
        value: description.projectedAmount,
        unit: "dollars",
        operator: "=",
        source: "calculated",
      },
      ...(description.taxFreeNote === undefined ? [] : [description.taxFreeNote]),
    ],
  };

  return {
    firstYear: firstRow.calendarYear,
    lastYear: lastRow.calendarYear,
    firstAge: firstRow.people[0].age,
    lastAge: lastRow.people[0].age,
    need: needExplained,
    needBeforeContributions: discountedSpending,
    projected: projectedExplained,
    status: shortYears.length === 0 ? "met" : "short",
    shortYears,
  };
}
