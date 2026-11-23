import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { getAdminUsers } from "@/server/queries/users";
import { deleteUser, moveUserToBusinessUnit, moveUserToTeam } from "@/server/services/users";
import { annualLeave, createPeople, insertRow } from "./helpers/people";

// West has Ops (Priya, Ben and Tom the admin) and Legal (Dan), and Newbie is unassigned.
// North has Payroll (Nina, and Grace the super admin).
let actors: Record<string, Actor> = {};

beforeEach(async () => {
  actors = await createPeople();
});

async function teamId(name: string) {
  const team = await db.team.findFirstOrThrow({ where: { name } });
  return team.id;
}

function userInDb(id: string) {
  return db.user.findUnique({ where: { id }, select: { businessUnitId: true, teamId: true } });
}

describe("moving someone to a team", () => {
  it("an admin moves an unassigned person into a team in their BU", async () => {
    await moveUserToTeam(actors.tom, "newbie", await teamId("Legal"));
    expect(await userInDb("newbie")).toMatchObject({ teamId: await teamId("Legal") });
  });

  it("a team in another BU is rejected", async () => {
    await expect(
      moveUserToTeam(actors.grace, "priya", await teamId("Payroll")),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "That team isn't in Test priya's business unit.",
    });
  });

  it.each([
    ["an admin of another BU", "tom", "nina", "Payroll"],
    ["a regular user", "priya", "ben", "Legal"],
  ])("%s can't", async (_who, actor, person, team) => {
    await expect(moveUserToTeam(actors[actor], person, await teamId(team))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("deleting someone", () => {
  it("removes them, their bookings and their sessions", async () => {
    await insertRow(annualLeave("priya", "2030-06-17"));
    await db.session.create({
      data: { id: "s1", userId: "priya", token: "t1", expiresAt: new Date("2030-01-01") },
    });

    await deleteUser(actors.tom, "priya");

    expect(await userInDb("priya")).toBeNull();
    expect(await db.event.count({ where: { userId: "priya" } })).toBe(0);
    expect(await db.session.count({ where: { userId: "priya" } })).toBe(0);
  });

  it("an admin can delete another admin in their BU", async () => {
    const otherAdmin = { ...actors.dan, role: "ADMIN" as const };
    await deleteUser(otherAdmin, "tom");
    expect(await userInDb("tom")).toBeNull();
  });

  it.each([
    ["nobody can delete themselves", "tom", "tom", "You can't delete yourself."],
    ["an admin can't delete someone in another BU", "tom", "nina", "You can't delete this person."],
    ["a regular user can't delete anyone", "priya", "ben", "You can't delete this person."],
  ])("%s", async (_rule, actor, person, message) => {
    await expect(deleteUser(actors[actor], person)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message,
    });
    expect(await userInDb(person)).not.toBeNull();
  });
});

describe("moving someone to another BU (spec §1.3)", () => {
  it("a super admin moves them: they keep their bookings and start in Unassigned", async () => {
    await insertRow(annualLeave("priya", "2030-06-17"));
    const north = actors.nina.businessUnitId;

    await moveUserToBusinessUnit(actors.grace, "priya", north);

    expect(await userInDb("priya")).toEqual({ businessUnitId: north, teamId: null });
    expect(await db.event.count({ where: { userId: "priya" } })).toBe(1);
  });

  it("an admin who isn't a super admin can't", async () => {
    await expect(
      moveUserToBusinessUnit(actors.tom, "priya", actors.nina.businessUnitId),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("the Users tab's data", () => {
  it("lists everyone in the BU by surname, only for admins of the BU", async () => {
    await db.user.update({ where: { id: "tom" }, data: { preferredName: "Tommy" } });
    const westId = actors.tom.businessUnitId;
    expect(await getAdminUsers(actors.priya, westId)).toBeNull();
    expect(await getAdminUsers(actors.nina, westId)).toBeNull();

    const users = (await getAdminUsers(actors.tom, westId)) ?? [];
    expect(users.map((user) => user.id)).toEqual(["ben", "dan", "newbie", "priya", "tom"]);
    expect(users.find((user) => user.id === "tom")).toMatchObject({
      name: "Tommy tom",
      ssoName: "Test tom",
      initials: "TT",
      teamId: await teamId("Ops"),
    });
    expect(users.find((user) => user.id === "priya")).toMatchObject({ ssoName: null });
  });
});
