import { describe, expect, it } from "vitest";
import { slugFor } from "../business-units";

describe("slugFor (a new business unit's name in the URL)", () => {
  it.each([
    ["West Operations", [], "west-operations"],
    ["  Data & Insight  ", [], "data-insight"],
    ["Gestión Financière", [], "gestion-financiere"],
    ["Ana's Team", [], "ana-s-team"],
    ["!!!", [], "unit"], // nothing usable left
    ["West Operations", ["west-operations"], "west-operations-2"],
    ["West Operations", ["west-operations", "west-operations-2"], "west-operations-3"],
  ])("%j with %j taken → %s", (name, taken, expected) => {
    expect(slugFor(name, taken)).toBe(expected);
  });
});
