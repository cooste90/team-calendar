import { describe, expect, it } from "vitest";
import { personFilterOptions, teamFilterOptions } from "../filter-options";

const teams = [
  { id: "legal", name: "Legal", sortOrder: 2 },
  { id: "ops", name: "Operations", sortOrder: 1 },
];

function person(id: string, firstName: string, surname: string, teamId: string | null) {
  return { id, firstName, preferredName: null, surname, teamId };
}

describe("filter options", () => {
  it("lists teams in the admin-defined order", () => {
    expect(teamFilterOptions(teams)).toEqual([
      { id: "ops", name: "Operations", group: null },
      { id: "legal", name: "Legal", group: null },
    ]);
  });

  it("groups people by team in admin order, unassigned last, each team by surname", () => {
    const people = [
      person("dan", "Dan", "Evans", "legal"),
      person("owen", "Owen", "Hughes", null),
      person("priya", "Priya", "Shah", "ops"),
      person("ben", "Ben", "Carter", "ops"),
    ];
    expect(personFilterOptions(teams, people)).toEqual([
      { id: "ben", name: "Ben Carter", group: "Operations" },
      { id: "priya", name: "Priya Shah", group: "Operations" },
      { id: "dan", name: "Dan Evans", group: "Legal" },
      { id: "owen", name: "Owen Hughes", group: "Unassigned" },
    ]);
  });

  it("uses the preferred first name", () => {
    const people = [{ ...person("tom", "Thomas", "Okafor", "ops"), preferredName: "Tom" }];
    expect(personFilterOptions(teams, people)[0].name).toBe("Tom Okafor");
  });
});
