import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { getAdminBusinessUnits, getVisibleBusinessUnits } from "@/server/queries/business-units";
import {
  createBusinessUnit,
  deleteBusinessUnit,
  renameBusinessUnit,
  setBusinessUnitHidden,
} from "@/server/services/business-units";
import { createPeople } from "./helpers/people";

// West has Ops (Priya, Ben and Tom the admin), Legal (Dan) and Newbie, who is unassigned.
// North has Payroll (Nina, and Grace the super admin).
let actors: Record<string, Actor> = {};

beforeEach(async () => {
  actors = await createPeople();
});

function unitNamed(name: string) {
  return db.businessUnit.findFirstOrThrow({ where: { name } });
}

describe("creating and renaming business units", () => {
  it("a new BU gets a slug from its name, made unique if it's taken", async () => {
    await createBusinessUnit(actors.grace, "South Health");
    await createBusinessUnit(actors.grace, "South-Health");
    expect((await unitNamed("South Health")).slug).toBe("south-health");
    expect((await unitNamed("South-Health")).slug).toBe("south-health-2");
  });

  it("renaming keeps the slug, so links keep working", async () => {
    const west = await unitNamed("West");
    await renameBusinessUnit(actors.grace, west.id, "West Operations");
    expect(await unitNamed("West Operations")).toMatchObject({ id: west.id, slug: "west" });
  });

  it.each([
    ["creating", () => createBusinessUnit(actors.grace, "north")],
    [
      "renaming",
      async () => renameBusinessUnit(actors.grace, (await unitNamed("West")).id, "NORTH"),
    ],
  ])("a name already used, in any case, is rejected when %s", async (_when, change) => {
    await expect(change()).rejects.toMatchObject({
      code: "VALIDATION",
      message: "There's already a business unit called North.",
    });
  });
});

describe("hiding a business unit (spec §1.3)", () => {
  it("only its members and super admins can see it after that", async () => {
    const north = await unitNamed("North");
    await setBusinessUnitHidden(actors.grace, north.id, true);

    const names = async (actor: Actor) =>
      (await getVisibleBusinessUnits(actor)).map((unit) => unit.name);
    expect(await names(actors.priya)).toEqual(["West"]);
    expect(await names(actors.nina)).toEqual(["North", "West"]); // a member
    expect(await names(actors.grace)).toEqual(["North", "West"]); // a super admin

    await setBusinessUnitHidden(actors.grace, north.id, false);
    expect(await names(actors.priya)).toEqual(["North", "West"]);
  });
});

describe("deleting a business unit", () => {
  it("is refused while it has people", async () => {
    const west = await unitNamed("West");
    await expect(deleteBusinessUnit(actors.grace, west.id)).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Move or delete its 5 people first.",
    });
    expect(await db.businessUnit.count()).toBe(2);
  });

  it("an empty one goes, with its empty teams", async () => {
    await createBusinessUnit(actors.grace, "South");
    const south = await unitNamed("South");
    await db.team.create({ data: { businessUnitId: south.id, name: "Planning", sortOrder: 1 } });

    await deleteBusinessUnit(actors.grace, south.id);
    expect(await db.businessUnit.findUnique({ where: { id: south.id } })).toBeNull();
    expect(await db.team.count({ where: { businessUnitId: south.id } })).toBe(0);
  });
});

describe("who can manage business units", () => {
  it("only a super admin, not even an admin of that BU", async () => {
    const west = await unitNamed("West");
    const changes = [
      () => createBusinessUnit(actors.tom, "South"),
      () => renameBusinessUnit(actors.tom, west.id, "West Ops"),
      () => setBusinessUnitHidden(actors.tom, west.id, true),
      () => deleteBusinessUnit(actors.tom, west.id),
    ];
    for (const change of changes) {
      await expect(change()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(await getAdminBusinessUnits(actors.tom)).toBeNull();
  });

  it("the tab's data counts each BU's people and teams", async () => {
    expect(await getAdminBusinessUnits(actors.grace)).toEqual([
      expect.objectContaining({ name: "North", hidden: false, peopleCount: 2, teamCount: 1 }),
      expect.objectContaining({ name: "West", hidden: false, peopleCount: 5, teamCount: 2 }),
    ]);
  });
});
