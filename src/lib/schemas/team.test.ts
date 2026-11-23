import { describe, expect, it } from "vitest";
import { teamNameSchema } from "./team";

describe("team name", () => {
  it.each([
    ["Finance Operations", "Finance Operations"],
    ["  Legal  ", "Legal"], // spaces at the ends are dropped
    ["Data & Insight", "Data & Insight"],
    ["T".repeat(60), "T".repeat(60)],
  ])("%j is saved as %j", (input, saved) => {
    expect(teamNameSchema.parse(input)).toBe(saved);
  });

  it.each([
    ["", "Enter a team name."],
    ["   ", "Enter a team name."],
    ["T".repeat(61), "Team names can be up to 60 characters."],
    ["Unassigned", `"Unassigned" is built in, so a team can't use that name.`],
    [" unassigned ", `"Unassigned" is built in, so a team can't use that name.`],
  ])("%j is rejected", (input, message) => {
    const result = teamNameSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});
