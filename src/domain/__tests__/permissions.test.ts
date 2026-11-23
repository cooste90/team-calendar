import { describe, expect, it } from "vitest";
import {
  type Actor,
  canDeleteUser,
  canEditBookingsFor,
  canEditProfileOf,
  canExport,
  canManageBusinessUnit,
  canManageBusinessUnits,
  canManagePublicHolidays,
  canSeeUnassigned,
  canViewBusinessUnit,
  type Subject,
} from "../permissions";

// Two business units. "west" has teams "ops" and "finance"; "east" has team "sales".
const priya: Actor = { id: "priya", role: "USER", businessUnitId: "west", teamId: "ops" };
const newStarter: Actor = { id: "new", role: "USER", businessUnitId: "west", teamId: null };
const westAdmin: Actor = { id: "wadmin", role: "ADMIN", businessUnitId: "west", teamId: "finance" };
const superAdmin: Actor = {
  id: "sa",
  role: "SUPER_ADMIN",
  businessUnitId: "east",
  teamId: "sales",
};

const people: Record<string, Subject> = {
  self: { id: "priya", businessUnitId: "west", teamId: "ops" },
  teammate: { id: "tom", businessUnitId: "west", teamId: "ops" },
  otherTeam: { id: "ana", businessUnitId: "west", teamId: "finance" },
  unassigned: { id: "new", businessUnitId: "west", teamId: null },
  otherBusinessUnit: { id: "sam", businessUnitId: "east", teamId: "sales" },
};

describe("canEditBookingsFor (spec §5.3)", () => {
  it.each([
    // A USER in a team: themselves and their own team only.
    [priya, "self", true],
    [priya, "teammate", true],
    [priya, "otherTeam", false],
    [priya, "unassigned", false],
    [priya, "otherBusinessUnit", false],
    // An unassigned USER: nobody, not even themselves.
    [newStarter, "unassigned", false],
    [newStarter, "self", false],
    // An ADMIN: anyone in their BU, including Unassigned people.
    [westAdmin, "self", true],
    [westAdmin, "otherTeam", true],
    [westAdmin, "unassigned", true],
    [westAdmin, "otherBusinessUnit", false],
    // A SUPER_ADMIN: anyone.
    [superAdmin, "teammate", true],
    [superAdmin, "unassigned", true],
    [superAdmin, "otherBusinessUnit", true],
  ] as const)("%o → %s: %s", (actor, subject, expected) => {
    expect(canEditBookingsFor(actor, people[subject])).toBe(expected);
  });
});

describe("canViewBusinessUnit", () => {
  const hiddenWest = { id: "west", hidden: true };
  const hiddenNorth = { id: "north", hidden: true };
  const normalEast = { id: "east", hidden: false };

  it.each([
    ["a member sees their own hidden BU", priya, hiddenWest, true],
    ["a non-member can't see a hidden BU", priya, hiddenNorth, false],
    ["a super admin sees any hidden BU", superAdmin, hiddenNorth, true],
    ["anyone sees a normal BU", priya, normalEast, true],
  ] as const)("%s", (_, actor, businessUnit, expected) => {
    expect(canViewBusinessUnit(actor, businessUnit)).toBe(expected);
  });
});

describe("admin powers", () => {
  it.each([
    ["a USER", priya, "west", false],
    ["an ADMIN in their own BU", westAdmin, "west", true],
    ["an ADMIN in another BU", westAdmin, "east", false],
    ["a SUPER_ADMIN anywhere", superAdmin, "west", true],
  ] as const)("%s: manage, export and see Unassigned in %s → %s", (_, actor, businessUnitId, expected) => {
    expect(canManageBusinessUnit(actor, businessUnitId)).toBe(expected);
    expect(canExport(actor, businessUnitId)).toBe(expected);
    expect(canSeeUnassigned(actor, businessUnitId)).toBe(expected);
  });

  it("any admin can manage public holidays; only a super admin can manage BUs", () => {
    expect(canManagePublicHolidays(priya)).toBe(false);
    expect(canManagePublicHolidays(westAdmin)).toBe(true);
    expect(canManagePublicHolidays(superAdmin)).toBe(true);
    expect(canManageBusinessUnits(westAdmin)).toBe(false);
    expect(canManageBusinessUnits(superAdmin)).toBe(true);
  });
});

describe("canDeleteUser (spec §9)", () => {
  it.each([
    ["an ADMIN deletes anyone in their BU", westAdmin, "teammate", true],
    ["an ADMIN deletes an unassigned person", westAdmin, "unassigned", true],
    ["an ADMIN can't delete someone in another BU", westAdmin, "otherBusinessUnit", false],
    ["a SUPER_ADMIN deletes anyone", superAdmin, "otherBusinessUnit", true],
    ["a USER can't delete anyone", priya, "teammate", false],
  ] as const)("%s", (_, actor, subject, expected) => {
    expect(canDeleteUser(actor, people[subject])).toBe(expected);
  });

  it("nobody can delete themselves, not even an admin", () => {
    expect(
      canDeleteUser(westAdmin, { id: "wadmin", businessUnitId: "west", teamId: "finance" }),
    ).toBe(false);
  });
});

describe("canEditProfileOf", () => {
  it.each([
    ["anyone edits their own profile", newStarter, "unassigned", true],
    ["a USER can't edit a teammate's profile", priya, "teammate", false],
    ["an ADMIN edits profiles in their BU", westAdmin, "teammate", true],
    ["an ADMIN can't edit profiles in another BU", westAdmin, "otherBusinessUnit", false],
  ] as const)("%s", (_, actor, subject, expected) => {
    expect(canEditProfileOf(actor, people[subject])).toBe(expected);
  });
});
