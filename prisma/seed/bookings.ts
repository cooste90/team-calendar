// Bookings from about 6 months ago to 6 months ahead (spec §5), made the way the app
// makes them: each candidate is validated, and skipped if it clashes with one already
// accepted (findConflicts). Unassigned people can't book, so they get none.
import { fakerEN_GB as faker } from "@faker-js/faker";
import { findConflicts } from "@/domain/conflicts";
import { addDays, type CalendarDate } from "@/domain/dates";
import { type Booking, bookingInputSchema, emptyChanges, type NewBooking } from "@/domain/events";
import type { LeaveType } from "@/domain/leave-types";
import { type HalfDay, rangeOf } from "@/domain/slots";
import { db } from "@/server/db";
import { saveBookingChanges } from "@/server/services/save-booking-changes";
import type { SeededPerson } from "./people";

const HALF_YEAR_IN_DAYS = 182;

// Single days and half days: mostly working from home and annual leave.
const DAY_TYPES = [
  { weight: 4, value: "WFH" },
  { weight: 3, value: "ANNUAL" },
  { weight: 2, value: "FLEXI" },
  { weight: 1, value: "SICKNESS" },
  { weight: 1, value: "SPECIAL" },
  { weight: 1, value: "WELLBEING" },
  { weight: 1, value: "OTHER" },
] satisfies { weight: number; value: LeaveType }[];

// Blocks of several days.
const BLOCK_TYPES = [
  { weight: 6, value: "ANNUAL" },
  { weight: 2, value: "SICKNESS" },
  { weight: 1, value: "SPECIAL" },
  { weight: 1, value: "OTHER" },
] satisfies { weight: number; value: LeaveType }[];

export async function createBookings(people: SeededPerson[], today: CalendarDate) {
  for (const person of people) {
    if (person.teamId === null) continue;

    const accepted: Booking[] = [];
    const create: NewBooking[] = [];
    for (const candidate of candidatesFor(person, today)) {
      if (!bookingInputSchema.safeParse(candidate).success) continue;
      if (findConflicts(rangeOf(candidate), accepted).length > 0) continue;
      accepted.push({ ...candidate, id: `candidate-${accepted.length}` });
      create.push({ ...candidate, createdById: whoBookedIt(person, people) });
    }
    // The person is the actor, so bookings without a createdById are their own.
    await saveBookingChanges(db, { ...emptyChanges(), create }, person.id);
  }
}

function candidatesFor(person: SeededPerson, today: CalendarDate): NewBooking[] {
  const candidates: NewBooking[] = [];

  // About one in ten people is away today, so the grid shows leave that has started.
  if (faker.datatype.boolean({ probability: 0.1 })) {
    const start = addDays(today, -faker.number.int({ min: 1, max: 4 }));
    const end = addDays(today, faker.number.int({ min: 1, max: 6 }));
    const type = faker.helpers.weightedArrayElement(BLOCK_TYPES);
    candidates.push(booking(person, type, start, "AM", end, "PM"));
  }
  // A few long parental leave blocks.
  if (faker.datatype.boolean({ probability: 0.02 })) {
    const start = addDays(today, faker.number.int({ min: -120, max: 60 }));
    const end = addDays(start, faker.number.int({ min: 60, max: 120 }));
    candidates.push(booking(person, "PARENTAL", start, "AM", end, "PM"));
  }

  const count = faker.number.int({ min: 8, max: 16 });
  for (let index = 0; index < count; index++) {
    const date = addDays(
      today,
      faker.number.int({ min: -HALF_YEAR_IN_DAYS, max: HALF_YEAR_IN_DAYS }),
    );
    candidates.push(...randomShape(person, date));
  }
  return candidates;
}

// A full day, a half day, two different halves on one day (e.g. WFH morning, annual
// leave afternoon), or a block of days that may cross weekends and month ends.
function randomShape(person: SeededPerson, date: CalendarDate): NewBooking[] {
  const shape = faker.helpers.weightedArrayElement([
    { weight: 5, value: "fullDay" },
    { weight: 3, value: "halfDay" },
    { weight: 2, value: "twoHalves" },
    { weight: 4, value: "block" },
  ]);
  if (shape === "fullDay") {
    return [booking(person, faker.helpers.weightedArrayElement(DAY_TYPES), date, "AM", date, "PM")];
  }
  if (shape === "halfDay") {
    const half = faker.helpers.arrayElement<HalfDay>(["AM", "PM"]);
    return [booking(person, faker.helpers.weightedArrayElement(DAY_TYPES), date, half, date, half)];
  }
  if (shape === "twoHalves") {
    const [morning, afternoon] = faker.helpers.arrayElements(
      DAY_TYPES.map((item) => item.value),
      2,
    );
    return [
      booking(person, morning, date, "AM", date, "AM"),
      booking(person, afternoon, date, "PM", date, "PM"),
    ];
  }
  // Most blocks are whole days; some start after lunch or end at lunchtime.
  const end = addDays(date, faker.number.int({ min: 2, max: 12 }));
  const startHalf = faker.helpers.arrayElement<HalfDay>(["AM", "AM", "PM"]);
  const endHalf = faker.helpers.arrayElement<HalfDay>(["PM", "PM", "AM"]);
  const type = faker.helpers.weightedArrayElement(BLOCK_TYPES);
  return [booking(person, type, date, startHalf, end, endHalf)];
}

function booking(
  person: SeededPerson,
  type: LeaveType,
  startDate: CalendarDate,
  startHalf: HalfDay,
  endDate: CalendarDate,
  endHalf: HalfDay,
): NewBooking {
  const notes = randomNotes();
  return {
    userId: person.id,
    type,
    startDate,
    startHalf,
    endDate,
    endHalf,
    notes,
    publicHolidayId: null,
  };
}

// Most bookings have no notes. Some have a few words, a sentence, a paragraph, or
// exactly 500 characters (the limit).
function randomNotes(): string | undefined {
  const kind = faker.helpers.weightedArrayElement([
    { weight: 70, value: "none" },
    { weight: 15, value: "words" },
    { weight: 10, value: "sentence" },
    { weight: 4, value: "paragraph" },
    { weight: 1, value: "longest" },
  ]);
  if (kind === "words") return faker.lorem.words({ min: 1, max: 4 });
  if (kind === "sentence") return faker.lorem.sentence();
  if (kind === "paragraph") return faker.lorem.paragraph();
  if (kind === "longest") return `${faker.lorem.paragraphs(8, " ").slice(0, 499)}.`;
  return undefined;
}

// Mostly people book their own leave. Some bookings were made by a teammate or by an
// admin of their BU (spec §5.3), so the "created by" details have something to show.
function whoBookedIt(person: SeededPerson, people: SeededPerson[]): string | undefined {
  const who = faker.helpers.weightedArrayElement([
    { weight: 85, value: "self" },
    { weight: 10, value: "teammate" },
    { weight: 5, value: "admin" },
  ]);
  if (who === "teammate") {
    const teammates = people.filter((other) => other.teamId === person.teamId && other !== person);
    return teammates.length > 0 ? faker.helpers.arrayElement(teammates).id : undefined;
  }
  if (who === "admin") {
    const admin = people.find(
      (other) => other.role === "ADMIN" && other.businessUnitId === person.businessUnitId,
    );
    return admin?.id;
  }
  return undefined;
}
