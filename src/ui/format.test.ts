import { describe, expect, it } from "vitest";

import {
  formatAge,
  formatDollars,
  formatFactor,
  formatPercent,
  formatYear,
  parseAge,
  parseDollars,
  parsePercent,
  parseYear,
} from "./format";

// Unit tests for the number formatting and parsing used by every field and result.
describe("formatDollars", () => {
  it("formats whole dollars with a symbol and thousands separators", () => {
    expect(formatDollars(1600000)).toBe("$1,600,000");
    expect(formatDollars(0)).toBe("$0");
  });

  it("rounds to whole dollars", () => {
    expect(formatDollars(60000.5)).toBe("$60,001");
  });
});

describe("formatPercent", () => {
  it("shows whole percentages without a decimal point", () => {
    expect(formatPercent(0.45)).toBe("45%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("shows at most one decimal place", () => {
    expect(formatPercent(0.045)).toBe("4.5%");
    expect(formatPercent(0.04123)).toBe("4.1%");
  });
});

describe("parseDollars", () => {
  it("accepts plain, grouped and $-prefixed amounts", () => {
    expect(parseDollars("60000")).toBe(60000);
    expect(parseDollars("60,000")).toBe(60000);
    expect(parseDollars("$60,000")).toBe(60000);
  });

  it("accepts cents", () => {
    expect(parseDollars("60000.50")).toBe(60000.5);
  });

  it("ignores surrounding spaces", () => {
    expect(parseDollars("  60000 ")).toBe(60000);
  });

  it("returns undefined for empty text", () => {
    expect(parseDollars("")).toBeUndefined();
    expect(parseDollars("   ")).toBeUndefined();
  });

  it("returns NaN for anything else", () => {
    expect(parseDollars("abc")).toBeNaN();
    expect(parseDollars("12k")).toBeNaN();
    expect(parseDollars("-5")).toBeNaN();
    expect(parseDollars("60,00")).toBeNaN();
    expect(parseDollars("$")).toBeNaN();
  });
});

describe("parsePercent", () => {
  it("accepts a number with or without a percent sign and returns a fraction", () => {
    expect(parsePercent("4")).toBe(0.04);
    expect(parsePercent("4.5")).toBe(0.045);
    expect(parsePercent("4.5%")).toBe(0.045);
  });

  it("does not leak floating-point noise", () => {
    expect(parsePercent("4.1")).toBe(0.041);
    expect(parsePercent("7")).toBe(0.07);
  });

  it("returns undefined for empty text and NaN for anything else", () => {
    expect(parsePercent("")).toBeUndefined();
    expect(parsePercent("abc")).toBeNaN();
    expect(parsePercent("4%%")).toBeNaN();
    expect(parsePercent("-4")).toBeNaN();
  });
});

describe("formatFactor", () => {
  it("shows four decimal places", () => {
    expect(formatFactor(1.025 ** 12)).toBe("1.3449");
    expect(formatFactor(1.32129)).toBe("1.3213");
    expect(formatFactor(1)).toBe("1.0000");
  });
});

describe("parseAge and formatAge", () => {
  it("accepts whole years and ignores surrounding spaces", () => {
    expect(parseAge("34")).toBe(34);
    expect(parseAge(" 34 ")).toBe(34);
    expect(formatAge(34)).toBe("34");
  });

  it("returns undefined for empty text and NaN for anything else", () => {
    expect(parseAge("")).toBeUndefined();
    expect(parseAge("34.5")).toBeNaN();
    expect(parseAge("abc")).toBeNaN();
    expect(parseAge("-3")).toBeNaN();
  });
});

describe("parseYear and formatYear", () => {
  // Years have no thousands separator, unlike dollars.
  it("accepts whole years and formats them without a separator", () => {
    expect(parseYear("2030")).toBe(2030);
    expect(parseYear(" 2030 ")).toBe(2030);
    expect(formatYear(2030)).toBe("2030");
  });

  it("returns undefined for empty text and NaN for anything else", () => {
    expect(parseYear("")).toBeUndefined();
    expect(parseYear("2030.5")).toBeNaN();
    expect(parseYear("20x0")).toBeNaN();
    expect(parseYear("-3")).toBeNaN();
  });
});
