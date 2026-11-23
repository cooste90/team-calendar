import { describe, expect, it } from "vitest";
import { holidayChangeSchema, holidayNameSchema } from "./public-holiday";

describe("public holiday name", () => {
  it.each([
    ["Christmas Day", "Christmas Day"],
    ["  Boxing Day  ", "Boxing Day"], // spaces at the ends are dropped
    ["N".repeat(60), "N".repeat(60)],
  ])("%j is saved as %j", (input, saved) => {
    expect(holidayNameSchema.parse(input)).toBe(saved);
  });

  it.each([
    ["", "Enter a name."],
    ["   ", "Enter a name."],
    ["N".repeat(61), "Names can be up to 60 characters."],
  ])("%j is rejected", (input, message) => {
    expect(holidayNameSchema.safeParse(input).error?.issues[0].message).toBe(message);
  });
});

describe("a public holiday change", () => {
  it.each([
    { kind: "create", name: "Christmas Day", date: "2026-12-25" },
    { kind: "update", id: "ph1", name: "Christmas Day", date: "2026-12-25" },
    { kind: "delete", id: "ph1" },
  ])("$kind is accepted", (change) => {
    expect(holidayChangeSchema.safeParse(change).success).toBe(true);
  });

  it("a date that doesn't exist is rejected", () => {
    const change = { kind: "create", name: "Leap day", date: "2027-02-29" };
    expect(holidayChangeSchema.safeParse(change).success).toBe(false);
  });
});
