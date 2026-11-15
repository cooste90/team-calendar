import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { getCalendarData } from "@/server/queries/calendar";
import { saveTeamCollapsed } from "@/server/services/save-team-collapsed";
import { createUser } from "./helpers/create-user";

let west = { id: "", hidden: false };
let priya: Actor;

beforeEach(async () => {
  west = await db.businessUnit.create({ data: { name: "West", slug: "west" } });
  await createUser("priya", { businessUnitId: west.id });
  priya = { id: "priya", role: "USER", businessUnitId: west.id, teamId: null };
});

async function collapsedTeamIds() {
  const data = await getCalendarData(priya, west, "2026-11-15", "2026-11-21");
  return data.collapsedTeamIds;
}

describe("saveTeamCollapsed", () => {
  it("remembers collapsed groups, so the next page load starts with them collapsed", async () => {
    await saveTeamCollapsed(priya, "ops", true);
    await saveTeamCollapsed(priya, "unassigned", true);
    expect(await collapsedTeamIds()).toEqual(["ops", "unassigned"]);
  });

  it("forgets a group when it's expanded again", async () => {
    await saveTeamCollapsed(priya, "ops", true);
    await saveTeamCollapsed(priya, "ops", false);
    expect(await collapsedTeamIds()).toEqual([]);
  });

  it("saving the same choice twice changes nothing", async () => {
    await saveTeamCollapsed(priya, "ops", true);
    await saveTeamCollapsed(priya, "ops", true);
    expect(await collapsedTeamIds()).toEqual(["ops"]);
  });

  it("only changes the signed-in person's own preference", async () => {
    await createUser("ben", { businessUnitId: west.id });
    await saveTeamCollapsed(priya, "ops", true);
    const ben = await db.user.findUniqueOrThrow({ where: { id: "ben" } });
    expect(ben.collapsedTeamIds).toEqual([]);
  });
});
