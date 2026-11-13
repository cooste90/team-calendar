import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { leaveTypes } from "../leave-types";

// Every text colour must have at least 4.5:1 contrast with its background (WCAG 1.4.3).
// The colours are read straight from globals.css, so this test fails if anyone
// changes a token to a colour that's too faint.

const css = fs.readFileSync("src/app/globals.css", "utf8");

// Reads every `--name: #rrggbb;` line inside the block that starts with `selector {`.
function readHexTokens(selector: string) {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

// Relative luminance and contrast ratio, as defined by WCAG 2.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

// [text token, background token]
const pairs: [string, string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["text-muted", "bg"],
  ["text-muted", "surface"],
  ["text-muted", "surface-2"],
  ["primary", "surface"],
  ["on-primary", "primary-solid"],
  ["on-sunset", "sunset"],
  ["destructive", "surface"],
  ["warning-fg", "warning-bg"],
  ...Object.values(leaveTypes).map((info): [string, string] => {
    const code = info.code.toLowerCase();
    return [`leave-${code}-fg`, `leave-${code}-bg`];
  }),
];

const themes = [
  { name: "light", tokens: readHexTokens(":root,\n.light") },
  { name: "dark", tokens: readHexTokens(".dark") },
];

describe.each(themes)("$name theme", ({ tokens }) => {
  it.each(pairs)("%s on %s has at least 4.5:1 contrast", (foreground, background) => {
    expect(tokens[foreground], `--${foreground} is missing`).toBeDefined();
    expect(tokens[background], `--${background} is missing`).toBeDefined();
    expect(contrast(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(4.5);
  });
});
