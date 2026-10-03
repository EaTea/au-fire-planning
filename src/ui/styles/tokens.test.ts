import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { describe, expect, it } from "vitest";

// Guards the readability of the colour scheme (see "Colour scheme: green and
// gold" in PLAN.md). The test reads tokens.css from disk as text, so it checks
// the same values the browser gets, and fails if a palette edit drops any text colour
// below the WCAG AA contrast minimum against a background it is shown on.

// Read from disk rather than imported: Vitest replaces CSS imports, `?raw`
// included, with an empty string unless CSS processing is switched on. The
// path is relative to the repository root, where Vitest runs (in jsdom,
// import.meta.url is not a file URL, so it can't locate the file).
const tokensCss = readFileSync(resolve(cwd(), "src/ui/styles/tokens.css"), "utf8");

/** WCAG AA minimum contrast for normal-size text. */
const minimumTextContrast = 4.5;

/**
 * Every text-on-background pairing of role variables that the stylesheets
 * use. Add a pair here whenever a stylesheet puts a text role on a new
 * background role.
 */
const textOnBackgroundPairs: ReadonlyArray<readonly [text: string, background: string]> = [
  ["--colour-text", "--colour-page-background"],
  ["--colour-text-muted", "--colour-page-background"],
  ["--colour-text-faint", "--colour-page-background"],
  ["--colour-text", "--colour-header-background"],
  ["--colour-text", "--colour-surface-raised"],
  ["--colour-on-accent", "--colour-accent"],
  ["--colour-text-error", "--colour-page-background"],
  ["--colour-text-muted", "--colour-surface-raised"],
  ["--colour-input-text", "--colour-input-background"],
  ["--colour-header-text", "--colour-header-background"],
  ["--colour-text-highlight", "--colour-page-background"],
];

/** WCAG 1.4.11 minimum contrast for graphics: chart lines, markers and axis lines. */
const minimumGraphicsContrast = 3;

/**
 * Every graphic (not text) role against the background it is drawn on. Kept
 * apart from the text pairs above because the minimum is 3:1, not 4.5:1. The
 * band is drawn at low opacity, so its visible fill is lighter than this full
 * colour; its label is text and is checked separately below.
 */
const graphicOnBackgroundPairs: ReadonlyArray<readonly [graphic: string, background: string]> = [
  ["--colour-chart-primary", "--colour-page-background"],
  ["--colour-chart-reference", "--colour-page-background"],
  ["--colour-chart-band", "--colour-page-background"],
  ["--colour-border", "--colour-page-background"],
  // The Milestones markers: solid or outlined gold, drawn on the card.
  ["--colour-accent", "--colour-page-background"],
];

/**
 * Reads every `--name: value;` declaration in a stylesheet into a map from
 * variable name to its raw value (which may itself be a `var(--other)`).
 * Comments are stripped first so commented-out declarations don't count.
 */
function readCustomProperties(css: string): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const declarationPattern = /(--[\w-]+)\s*:\s*([^;]+);/g;

  const properties = new Map<string, string>();
  for (const [, name, value] of withoutComments.matchAll(declarationPattern)) {
    if (name !== undefined && value !== undefined) {
      properties.set(name, value.trim());
    }
  }

  return properties;
}

/**
 * Follows `var(--other)` references until it reaches a literal value, so a
 * role variable can be checked by the hex colour it ends up as. Throws on an
 * undefined variable, since that would render as no colour at all.
 */
function resolveVariable(properties: Map<string, string>, name: string): string {
  const value = properties.get(name);
  if (value === undefined) {
    throw new Error(`${name} is not defined in tokens.css`);
  }

  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference?.[1] === undefined ? value : resolveVariable(properties, reference[1]);
}

/**
 * The WCAG relative luminance of a `#rrggbb` colour: how bright it looks,
 * from 0 (black) to 1 (white). Used by contrastRatio.
 */
function relativeLuminance(hexColour: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexColour);
  if (match === null) {
    throw new Error(`Expected a #rrggbb colour, got ${hexColour}`);
  }

  // Convert each sRGB channel to linear light, per the WCAG 2 definition.
  const [red, green, blue] = match.slice(1).map((channelHex) => {
    const channel = parseInt(channelHex, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The WCAG contrast ratio between two colours, from 1:1 up to 21:1. */
function contrastRatio(firstColour: string, secondColour: string): number {
  const [darker, lighter] = [relativeLuminance(firstColour), relativeLuminance(secondColour)].sort(
    (first, second) => first - second,
  ) as [number, number];

  return (lighter + 0.05) / (darker + 0.05);
}

describe("contrastRatio", () => {
  // Known values: black on white is the maximum, a colour on itself the minimum.
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#012169", "#012169")).toBeCloseTo(1, 5);
  });
});

describe("colour tokens", () => {
  const properties = readCustomProperties(tokensCss);

  // The scheme is built on Australia's official national green and gold.
  it("uses the national green for the header and gold for the accent", () => {
    expect(resolveVariable(properties, "--colour-header-background")).toBe("#00843d");
    expect(resolveVariable(properties, "--colour-accent")).toBe("#ffcd00");
  });

  it.each(textOnBackgroundPairs)(
    "%s on %s meets WCAG AA contrast",
    (textVariable, backgroundVariable) => {
      const ratio = contrastRatio(
        resolveVariable(properties, textVariable),
        resolveVariable(properties, backgroundVariable),
      );

      expect(ratio).toBeGreaterThanOrEqual(minimumTextContrast);
    },
  );

  it.each(graphicOnBackgroundPairs)(
    "%s on %s meets the 3:1 graphics contrast",
    (graphicVariable, backgroundVariable) => {
      const ratio = contrastRatio(
        resolveVariable(properties, graphicVariable),
        resolveVariable(properties, backgroundVariable),
      );

      expect(ratio).toBeGreaterThanOrEqual(minimumGraphicsContrast);
    },
  );

  // The "Shortfall" label (plain text colour: error pink on the band is only
  // 4.2:1) sits on top of the band, not on the bare page, so
  // check the text against the page with the band blended in at its opacity.
  it("keeps the band label readable on the band at its opacity", () => {
    const opacity = Number(properties.get("--chart-band-opacity"));
    const page = resolveVariable(properties, "--colour-page-background");
    const band = resolveVariable(properties, "--colour-chart-band");

    const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16);
    const blended = [1, 3, 5]
      .map((start) =>
        Math.round(opacity * channel(band, start) + (1 - opacity) * channel(page, start)),
      )
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    const ratio = contrastRatio(resolveVariable(properties, "--colour-text"), `#${blended}`);

    expect(opacity).toBeGreaterThan(0);
    expect(ratio).toBeGreaterThanOrEqual(minimumTextContrast);
  });

  // Gold text on the header green would be unreadable (3.2:1), which is why
  // the header uses white text and gold only as a fill or underline there.
  // This pins down that reasoning.
  it("would fail contrast if gold were used as text on the header", () => {
    const ratio = contrastRatio(
      resolveVariable(properties, "--colour-accent"),
      resolveVariable(properties, "--colour-header-background"),
    );

    expect(ratio).toBeLessThan(minimumTextContrast);
  });
});
