import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Colour contrast tests (brief §16 accessibility rule 5, WCAG 2.2 AA).
 *
 * Reads the real token values out of src/styles/tokens.css so the
 * palette and the assertions can never drift apart — change a token and
 * this test tells you immediately if the new value fails.
 */

const tokensCss = readFileSync(
  path.resolve(import.meta.dirname, "../../src/styles/tokens.css"),
  "utf8",
);

function token(name: string): string {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Token --${name} not found in tokens.css`);
  return match[1].trim();
}

type Rgb = [number, number, number];

function parseHex(value: string): Rgb {
  const hex = value.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

/** Parses `rgba(r, g, b, a)` into its colour and alpha. */
function parseRgba(value: string): { rgb: Rgb; alpha: number } {
  const match = value.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/,
  );
  if (!match) throw new Error(`Could not parse colour: ${value}`);
  return {
    rgb: [Number(match[1]), Number(match[2]), Number(match[3])] as Rgb,
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as Rgb;
}

function relativeLuminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const bg = parseHex(token("hd-projection-black"));
const surface = parseHex(token("hd-house-black"));
const cream = parseHex(token("hd-stock-cream"));
const agedPaper = parseHex(token("hd-aged-paper"));
const brass = parseHex(token("hd-patina-brass"));
const oxblood = parseHex(token("hd-oxblood"));
const dangerInk = parseHex(token("hd-oxblood-raised"));
const focus = parseHex(token("hd-cool-green-raised"));

// WCAG 2.2: 4.5:1 for body text, 3:1 for UI component boundaries and
// focus indicators.
const TEXT = 4.5;
const NON_TEXT = 3;

describe("text contrast on the projection-room ground", () => {
  const cases: [string, Rgb, Rgb][] = [
    ["ink on background", cream, bg],
    ["ink on surface", cream, surface],
    ["muted ink on background", agedPaper, bg],
    ["muted ink on surface", agedPaper, surface],
    ["accent on background", brass, bg],
    ["accent on surface", brass, surface],
    ["primary button label on accent", bg, brass],
    ["error text on background", dangerInk, bg],
    ["error text on surface", dangerInk, surface],
    ["error text on the tinted error block", dangerInk, composite(oxblood, 0.16, bg)],
  ];

  for (const [name, fg, background] of cases) {
    it(`${name} meets ${TEXT}:1`, () => {
      expect(contrastRatio(fg, background)).toBeGreaterThanOrEqual(TEXT);
    });
  }
});

describe("non-text contrast", () => {
  it("the focus ring is visible on both grounds", () => {
    expect(contrastRatio(focus, bg)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(contrastRatio(focus, surface)).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it("control borders meet the UI component boundary threshold", () => {
    const { rgb, alpha } = parseRgba(token("hd-rule-strong"));
    expect(contrastRatio(composite(rgb, alpha, bg), bg)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(contrastRatio(composite(rgb, alpha, surface), surface)).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe("full-strength Oxblood is a fill, not a text colour", () => {
  it("would fail as text, which is why --hd-danger-ink exists", () => {
    // Documents the reason for the tint. If someone "simplifies"
    // --hd-danger-ink back to --hd-oxblood, the text tests above break
    // and this one explains why.
    expect(contrastRatio(oxblood, bg)).toBeLessThan(TEXT);
  });
});
