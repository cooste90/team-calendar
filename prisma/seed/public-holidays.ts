// Bank holidays and everyone's copies of them (spec §6). Holidays are added in date
// order through the same planner the admin screen uses, so they replace (carve) the
// bookings already there, exactly as in the app.
import { type CalendarDate, toDbDate } from "@/domain/dates";
import type { Booking } from "@/domain/events";
import {
  type PersonSnapshot,
  planPublicHolidayCreate,
  planUserDeletesPhCopy,
  planUserEditsPhCopy,
} from "@/domain/public-holidays";
import { toSlot } from "@/domain/slots";
import { db } from "@/server/db";
import { toBooking, toPublicHoliday } from "@/server/mappers";
import { saveBookingChanges } from "@/server/services/save-booking-changes";
import type { SeededPerson } from "./people";
import { UK_BANK_HOLIDAYS } from "./uk-bank-holidays";

export async function createPublicHolidays(people: SeededPerson[], adminId: string) {
  for (const { date, name } of UK_BANK_HOLIDAYS) {
    const row = await db.publicHoliday.create({ data: { date: toDbDate(date), name } });
    const bookings = await bookingsOn(date);

    const snapshots: PersonSnapshot[] = people.map((person) => ({
      userId: person.id,
      availability: person.availability,
      bookings: bookings.filter((booking) => booking.userId === person.id),
      exclusions: [],
    }));
    await saveBookingChanges(db, planPublicHolidayCreate(toPublicHoliday(row), snapshots), adminId);
  }
}

// Two people have changed their own copy (spec §6.3), so later admin changes to those
// holidays leave them alone: one moved Boxing Day 2026 to the next day, and one deleted
// their Early May bank holiday 2027.
export async function detachSomeCopies(people: SeededPerson[]) {
  const nextDay = "2026-12-29";
  const busyThatDay = new Set((await bookingsOn(nextDay)).map((booking) => booking.userId));
  const boxingDayCopy = (await copiesOf("2026-12-28")).find(
    (copy) =>
      copy.startHalf === "AM" &&
      copy.endHalf === "PM" &&
      !busyThatDay.has(copy.userId) &&
      people.find((person) => person.id === copy.userId)?.availability(nextDay) === "FULL",
  );
  if (boxingDayCopy) {
    const moved = { start: toSlot(nextDay, "AM"), end: toSlot(nextDay, "PM") };
    await saveBookingChanges(
      db,
      { ...planUserEditsPhCopy(boxingDayCopy), update: [{ id: boxingDayCopy.id, range: moved }] },
      boxingDayCopy.userId,
    );
  }

  const [earlyMayCopy] = await copiesOf("2027-05-03");
  if (earlyMayCopy) {
    await saveBookingChanges(db, planUserDeletesPhCopy(earlyMayCopy), earlyMayCopy.userId);
  }
}

async function bookingsOn(date: CalendarDate): Promise<Booking[]> {
  const rows = await db.event.findMany({
    where: { startDate: { lte: toDbDate(date) }, endDate: { gte: toDbDate(date) } },
  });
  return rows.map(toBooking);
}

// The untouched copies of the holiday on this date, in a fixed order.
async function copiesOf(date: CalendarDate): Promise<Booking[]> {
  const rows = await db.event.findMany({
    where: { publicHoliday: { date: toDbDate(date) } },
    orderBy: { userId: "asc" },
  });
  return rows.map(toBooking);
}
