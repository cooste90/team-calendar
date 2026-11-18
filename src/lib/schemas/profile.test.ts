import { describe, expect, it } from "vitest";
import { preferredNameSchema } from "./profile";

describe("preferred first name", () => {
  it.each([
    ["Tom", "Tom"],
    ["  Tom  ", "Tom"], // spaces at the ends are dropped
    ["Mary-Jane", "Mary-Jane"],
    ["D'Arcy", "D'Arcy"],
    ["Siobhán", "Siobhán"],
    ["Zoë Ann", "Zoë Ann"],
    ["", null], // empty clears it
    ["   ", null],
  ])("%j is saved as %j", (input, saved) => {
    expect(preferredNameSchema.parse(input)).toBe(saved);
  });

  it.each([
    ["Tom2", "letters, spaces, hyphens and apostrophes"],
    ["<b>Tom</b>", "letters, spaces, hyphens and apostrophes"],
    ["T".repeat(41), "up to 40 characters"],
  ])("%j is rejected", (input, message) => {
    const result = preferredNameSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(message);
  });
});
