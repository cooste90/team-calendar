import { beforeEach, describe, expect, it } from "vitest";
import { availabilityLookup } from "@/domain/availability";
import { addDays, toDbDate } from "@/domain/dates";
import { NotFoundError } from "@/domain/errors";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { toPatternColumns } from "@/server/mappers";
import { getBusinessUnitBySlug } from "@/server/queries/business-units";
import { getCalendarData } from "@/server/queries/calendar";
import { seedDatabase } from "../../prisma/seed/seed-database";
import { createUser } from "./helpers/create-user";

// West has a team (Priya, Ben) and one Unassigned person (Newbie). "Secret" is hidden.
let west = { id: "", hidden: false };
let secret = { id: "", hidden: true };
let priya: Actor;
let westAdmin: Actor;

beforeEach(async () => {
  west = await db.businessUnit.create({ data: { name: "West", slug: "west" } });
  secret = await db.businessUnit.create({ data: { name: "Secret", slug: "secret", hidden: true } });
  const ops = await db.team.create({
    data: { businessUnitId: west.id, name: "Ops", sortOrder: 1 },
  });
  await createUser("priya", { businessUnitId: west.id, teamId: ops.id });
  await createUser("ben", { businessUnitId: west.id, teamId: ops.id });
  await createUser("newbie", { businessUnitId: west.id });
  priya = { id: "priya", role: "USER", businessUnitId: west.id, teamId: ops.id };
  westAdmin = { id: "ben", role: "ADMIN", businessUnitId: west.id, teamId: ops.id };
});

const week = { from: "2026-11-15", to: "2026-11-21" };

describe("getCalendarData", () => {
  it("leaves Unassigned people and their bookings out for a USER, but not for an admin", async () => {
    await db.event.create({
      data: {
        userId: "newbie",
        type: "WFH",
        startDate: toDbDate("2026-11-16"),
        startHalf: "AM",
        endDate: toDbDate("2026-11-16"),
        endHalf: "PM",
      },
    });

    const asUser = await getCalendarData(priya, west, week.from, week.to);
    const asAdmin = await getCalendarData(westAdmin, west, week.from, week.to);

    expect(asUser.people.map((person) => person.id).sort()).toEqual(["ben", "priya"]);
    expect(asUser.bookings).toEqual([]);
    expect(asUser.viewer.canSeeUnassigned).toBe(false);
    expect(asAdmin.people.map((person) => person.id).sort()).toEqual(["ben", "newbie", "priya"]);
    expect(asAdmin.bookings).toHaveLength(1);
    expect(asAdmin.viewer.canSeeUnassigned).toBe(true);
  });

  it("returns only the bookings and public holidays that touch the range", async () => {
    const days = [
      ["before", "2026-11-10", "2026-11-14"],
      ["crossing the start", "2026-11-13", "2026-11-16"],
      ["inside", "2026-11-18", "2026-11-18"],
      ["after", "2026-11-22", "2026-11-23"],
    ];
    for (const [notes, start, end] of days) {
      await db.event.create({
        data: {
          userId: "priya",
          type: "ANNUAL",
          notes,
          startDate: toDbDate(start),
          startHalf: "AM",
          endDate: toDbDate(end),
          endHalf: "PM",
        },
      });
    }
    await db.publicHoliday.create({ data: { date: toDbDate("2026-11-20"), name: "Inside" } });
    await db.publicHoliday.create({ data: { date: toDbDate("2026-11-30"), name: "Outside" } });

    const data = await getCalendarData(priya, west, week.from, week.to);

    expect(data.bookings.map((booking) => booking.notes).sort()).toEqual([
      "crossing the start",
      "inside",
    ]);
    expect(data.publicHolidays.map((holiday) => holiday.name)).toEqual(["Inside"]);
  });

  it("gives each person what's needed to work out their availability on any day", async () => {
    await db.workingPattern.create({
      data: {
        userId: "priya",
        effectiveFrom: toDbDate("2000-01-02"),
        ...toPatternColumns(["OFF", "FULL", "FULL", "OFF", "FULL", "AM", "OFF"]),
      },
    });
    await db.availabilityOverride.create({
      data: { userId: "priya", date: toDbDate("2026-11-18"), value: "FULL" },
    });

    const data = await getCalendarData(priya, west, week.from, week.to);
    const person = data.people.find((item) => item.id === "priya");
    const availability = availabilityLookup(person?.patterns ?? [], person?.overrides ?? []);

    const wholeWeek = Array.from({ length: 7 }, (_, index) =>
      availability(addDays(week.from, index)),
    );
    // Sun to Sat; Wednesday is swapped to a full working day.
    expect(wholeWeek).toEqual(["OFF", "FULL", "FULL", "FULL", "FULL", "AM", "OFF"]);
    // Outside the range too: the following Wednesday is a normal day off.
    expect(availability("2026-11-25")).toBe("OFF");
  });

  it("refuses a hidden BU to someone who isn't a member", async () => {
    await expect(getCalendarData(priya, secret, week.from, week.to)).rejects.toThrow(NotFoundError);
  });
});

describe("getBusinessUnitBySlug", () => {
  it("gives the person's own BU when there's no slug", async () => {
    expect(await getBusinessUnitBySlug(priya, null)).toMatchObject({ id: west.id, name: "West" });
  });

  it("gives a hidden BU only to its members and super admins; anyone else gets their own", async () => {
    expect(await getBusinessUnitBySlug(priya, "secret")).toMatchObject({ id: west.id });
    const superAdmin: Actor = { ...priya, role: "SUPER_ADMIN" };
    expect(await getBusinessUnitBySlug(superAdmin, "secret")).toMatchObject({ id: secret.id });
  });

  it("gives the person's own BU for a slug that doesn't exist (deleted or mistyped)", async () => {
    expect(await getBusinessUnitBySlug(priya, "nowhere")).toMatchObject({ id: west.id });
  });
});

// Needs the large seed (about 10 seconds), and timings on shared CI runners vary too
// much to be useful, so this only runs locally.
it.skipIf(process.env.CI)(
  "loads 300 people for 6 weeks in under 150ms (large seed)",
  async () => {
    await seedDatabase({ size: "large", today: "2026-11-14" });
    const unit = await db.businessUnit.findUniqueOrThrow({ where: { slug: "south-health" } });
    const someone = await db.user.findFirstOrThrow({ where: { businessUnitId: unit.id } });
    const actor: Actor = {
      id: someone.id,
      role: "SUPER_ADMIN",
      businessUnitId: unit.id,
      teamId: null,
    };

    // The first call warms up the connection pool; time the second.
    await getCalendarData(actor, unit, "2026-11-01", "2026-12-12");
    const started = performance.now();
    const data = await getCalendarData(actor, unit, "2026-11-01", "2026-12-12");
    const elapsed = performance.now() - started;

    expect(data.people).toHaveLength(300);
    expect(elapsed).toBeLessThan(150);
  },
  60_000,
);
