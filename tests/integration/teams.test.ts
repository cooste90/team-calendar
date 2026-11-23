import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { getAdminTeams } from "@/server/queries/teams";
import { createTeam, deleteTeam, moveTeam, renameTeam } from "@/server/services/teams";
import { createPeople } from "./helpers/people";

// West has Ops (Priya, Ben and Tom the admin) and Legal (Dan), and Newbie is unassigned.
// North has Payroll (Nina, and Grace the super admin).
let actors: Record<string, Actor> = {};
let westId = "";

beforeEach(async () => {
  actors = await createPeople();
  westId = actors.tom.businessUnitId;
});

async function westTeamNames() {
  const teams = await db.team.findMany({
    where: { businessUnitId: westId },
    orderBy: { sortOrder: "asc" },
  });
  return teams.map((team) => team.name);
}

async function teamId(name: string) {
  const team = await db.team.findFirstOrThrow({ where: { name } });
  return team.id;
}

describe("creating and renaming teams", () => {
  it("a new team goes at the end of the list", async () => {
    await createTeam(actors.tom, westId, "Finance Operations");
    expect(await westTeamNames()).toEqual(["Ops", "Legal", "Finance Operations"]);
  });

  it("a team can be renamed", async () => {
    await renameTeam(actors.tom, await teamId("Legal"), "Legal & Compliance");
    expect(await westTeamNames()).toEqual(["Ops", "Legal & Compliance"]);
  });

  it("a team can be renamed to a different case of its own name", async () => {
    await renameTeam(actors.tom, await teamId("Legal"), "LEGAL");
    expect(await westTeamNames()).toEqual(["Ops", "LEGAL"]);
  });

  it.each([
    ["creating", () => createTeam(actors.tom, westId, "legal")],
    ["renaming", async () => renameTeam(actors.tom, await teamId("Ops"), "LEGAL")],
  ])("a name already used in the BU, in any case, is rejected when %s", async (_when, change) => {
    await expect(change()).rejects.toMatchObject({
      code: "VALIDATION",
      message: "There's already a team called Legal.",
    });
  });

  it("the same name can be used in another BU", async () => {
    await createTeam(actors.tom, westId, "Payroll");
    expect(await westTeamNames()).toContain("Payroll");
  });
});

describe("moving teams", () => {
  it("Move down swaps a team with the one below it, and Move up puts it back", async () => {
    await createTeam(actors.tom, westId, "Commercial");
    await moveTeam(actors.tom, await teamId("Ops"), "down");
    expect(await westTeamNames()).toEqual(["Legal", "Ops", "Commercial"]);

    await moveTeam(actors.tom, await teamId("Ops"), "up");
    expect(await westTeamNames()).toEqual(["Ops", "Legal", "Commercial"]);
  });

  it("moving the first team up, or the last team down, changes nothing", async () => {
    await moveTeam(actors.tom, await teamId("Ops"), "up");
    await moveTeam(actors.tom, await teamId("Legal"), "down");
    expect(await westTeamNames()).toEqual(["Ops", "Legal"]);
  });
});

describe("deleting a team", () => {
  it("moves its members to Unassigned", async () => {
    await deleteTeam(actors.tom, await teamId("Ops"));
    expect(await westTeamNames()).toEqual(["Legal"]);
    const unassigned = await db.user.findMany({
      where: { businessUnitId: westId, teamId: null },
      orderBy: { id: "asc" },
    });
    expect(unassigned.map((user) => user.id)).toEqual(["ben", "newbie", "priya", "tom"]);
  });

  it("a team that doesn't exist is not found", async () => {
    await expect(deleteTeam(actors.tom, "no-such-team")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("who can manage teams", () => {
  it.each([
    ["an admin of another BU can't", "tom", "north", "FORBIDDEN"],
    ["a regular user can't, even in their own BU", "priya", "west", "FORBIDDEN"],
    ["a super admin can, in any BU", "grace", "west", "ok"],
  ] as const)("%s", async (_rule, actor, unit, result) => {
    const businessUnit = await db.businessUnit.findUniqueOrThrow({ where: { slug: unit } });
    const team = await db.team.findFirstOrThrow({ where: { businessUnitId: businessUnit.id } });
    // Each one runs on its own, one after the other. Delete goes last.
    const changes = [
      () => createTeam(actors[actor], businessUnit.id, "New team"),
      () => renameTeam(actors[actor], team.id, "Renamed"),
      () => moveTeam(actors[actor], team.id, "down"),
      () => deleteTeam(actors[actor], team.id),
    ];
    for (const change of changes) {
      if (result === "ok") {
        await expect(change()).resolves.toBeUndefined();
      } else {
        await expect(change()).rejects.toMatchObject({ code: result });
      }
    }
  });

  it("the Teams tab's data is only loaded for admins of the BU", async () => {
    const northId = actors.nina.businessUnitId;
    expect(await getAdminTeams(actors.tom, northId)).toBeNull();
    expect(await getAdminTeams(actors.priya, westId)).toBeNull();
    expect(await getAdminTeams(actors.grace, westId)).not.toBeNull();
    expect(await getAdminTeams(actors.tom, westId)).toEqual({
      teams: [
        { id: await teamId("Ops"), name: "Ops", memberCount: 3 },
        { id: await teamId("Legal"), name: "Legal", memberCount: 1 },
      ],
      unassignedCount: 1,
    });
  });
});
