import { describe, expect, it } from "vitest";

import { formatDollars, formatPercent, parseDollars, parsePercent } from "./format";

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
