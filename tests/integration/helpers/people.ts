import type { BookingInput } from "@/domain/events";
import type { Actor } from "@/domain/permissions";
import { db } from "@/server/db";
import { toBooking, toEventData } from "@/server/mappers";
import { createUser } from "./create-user";

// The people the booking tests use, keyed by id:
// - West: Ops (Priya, Ben, and Tom the admin), Legal (Dan), and Newbie, who is unassigned.
// - North: Payroll (Nina, and Grace the super admin).
// Roles only matter on the Actor a service is given, so the user rows are all alike.
export async function createPeople(): Promise<Record<string, Actor>> {
  const west = await db.businessUnit.create({ data: { name: "West", slug: "west" } });
  const north = await db.businessUnit.create({ data: { name: "North", slug: "north" } });
  const ops = await db.team.create({
    data: { businessUnitId: west.id, name: "Ops", sortOrder: 1 },
  });
  const legal = await db.team.create({
    data: { businessUnitId: west.id, name: "Legal", sortOrder: 2 },
  });
  const payroll = await db.team.create({
    data: { businessUnitId: north.id, name: "Payroll", sortOrder: 1 },
  });
  const people: Actor[] = [
    { id: "priya", role: "USER", businessUnitId: west.id, teamId: ops.id },
    { id: "ben", role: "USER", businessUnitId: west.id, teamId: ops.id },
    { id: "tom", role: "ADMIN", businessUnitId: west.id, teamId: ops.id },
    { id: "dan", role: "USER", businessUnitId: west.id, teamId: legal.id },
    { id: "newbie", role: "USER", businessUnitId: west.id, teamId: null },
    { id: "nina", role: "USER", businessUnitId: north.id, teamId: payroll.id },
    { id: "grace", role: "SUPER_ADMIN", businessUnitId: north.id, teamId: payroll.id },
  ];
  const actors: Record<string, Actor> = {};
  for (const person of people) {
    await createUser(person.id, { businessUnitId: person.businessUnitId, teamId: person.teamId });
    actors[person.id] = person;
  }
  return actors;
}

// Full days of annual leave, e.g. annualLeave("priya", "2030-06-17", "2030-06-21").
export function annualLeave(userId: string, startDate: string, endDate = startDate): BookingInput {
  return { userId, type: "ANNUAL", startDate, startHalf: "AM", endDate, endHalf: "PM" };
}

// Puts a booking row straight into the database, skipping the services' rules: for
// bookings that are already in the past, and public holiday copies. Tom created it.
export async function insertRow(booking: BookingInput & { publicHolidayId?: string }) {
  const row = await db.event.create({
    data: toEventData({ publicHolidayId: null, createdById: "tom", ...booking }),
  });
  return row.id;
}

// Every public holiday exclusion in the database, e.g. [{ userId: "priya", publicHolidayId }].
export function exclusionsInDb() {
  return db.publicHolidayExclusion.findMany({ select: { userId: true, publicHolidayId: true } });
}

// Every booking in the database, by person then start date, e.g.
// "priya ANNUAL 2030-06-17 AM – 2030-06-18 PM".
export async function bookingsInDb() {
  const rows = await db.event.findMany({ orderBy: [{ userId: "asc" }, { startDate: "asc" }] });
  return rows
    .map(toBooking)
    .map((b) => `${b.userId} ${b.type} ${b.startDate} ${b.startHalf} – ${b.endDate} ${b.endHalf}`);
}
