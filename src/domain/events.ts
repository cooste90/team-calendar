// Bookings ("events"): their shape, input validation, the form's half-day controls,
// and BookingChanges, the one plain object every booking planner returns.
import { z } from "zod";
import { type CalendarDate, calendarDateSchema, diffDays } from "./dates";
import { type LeaveType, leaveTypes } from "./leave-types";
import {
  datesOfRange,
  type HalfDay,
  type Portion,
  rangeOf,
  type SlotRange,
  subtract,
  toSlot,
} from "./slots";

export type BookingInput = {
  userId: string;
  type: LeaveType;
  startDate: CalendarDate;
  startHalf: HalfDay; // AM = from the morning, PM = afternoon only
  endDate: CalendarDate;
  endHalf: HalfDay; // PM = to the end of the day, AM = morning only
  notes?: string;
};

// A saved booking. publicHolidayId is set only on untouched public holiday copies.
// createdById is optional here because only splitting needs it (to keep the creator).
export type Booking = BookingInput & {
  id: string;
  publicHolidayId: string | null;
  createdById?: string | null;
};

// A booking to create. When createdById is left out, the service uses the signed-in person.
export type NewBooking = BookingInput & {
  publicHolidayId: string | null;
  createdById?: string | null;
};

// A deleted booking, as the delete hands it back for Undo (spec §5.6). publicHolidayId
// lets Undo link a public holiday copy to its holiday again.
export type DeletedBooking = { booking: BookingInput; publicHolidayId: string | null };

// What a planner wants saved. saveBookingChanges (T12) writes it in one transaction.
export type BookingChanges = {
  create: NewBooking[];
  update: { id: string; range: SlotRange }[]; // bookings that were shortened
  remove: string[]; // booking ids to delete
  addExclusions: { userId: string; publicHolidayId: string }[];
  unlink: string[]; // booking ids whose publicHolidayId becomes null
};

export function emptyChanges(): BookingChanges {
  return { create: [], update: [], remove: [], addExclusions: [], unlink: [] };
}

// Combines several planners' changes into one object to save together.
export function mergeChanges(all: BookingChanges[]): BookingChanges {
  return {
    create: all.flatMap((changes) => changes.create),
    update: all.flatMap((changes) => changes.update),
    remove: all.flatMap((changes) => changes.remove),
    addExclusions: all.flatMap((changes) => changes.addExclusions),
    unlink: all.flatMap((changes) => changes.unlink),
  };
}

// Notes are optional and short (spec §5.1).
export const NOTES_MAX_LENGTH = 500;

// A booking can span at most 366 days. This is a sanity limit, not a spec rule.
const MAX_SPAN_DAYS = 366;

const halfDaySchema = z.enum(["AM", "PM"]);

// The checks every create and update goes through, in the browser and on the server.
// Any half-day combination is fine as long as the end isn't before the start.
export const bookingInputSchema = z
  .object({
    userId: z.string().min(1),
    // Object.keys gives the leave type names; the cast tells zod they're all LeaveTypes.
    type: z.enum(Object.keys(leaveTypes) as [LeaveType, ...LeaveType[]], "Choose a leave type"),
    startDate: calendarDateSchema,
    startHalf: halfDaySchema,
    endDate: calendarDateSchema,
    endHalf: halfDaySchema,
    notes: z
      .string()
      .trim()
      .max(NOTES_MAX_LENGTH, `Notes can be up to ${NOTES_MAX_LENGTH} characters`)
      .transform((notes) => notes || undefined)
      .optional(),
  })
  .refine(
    (booking) =>
      toSlot(booking.startDate, booking.startHalf) <= toSlot(booking.endDate, booking.endHalf),
    {
      message: "The end can't be before the start",
      path: ["endDate"],
    },
  )
  .refine((booking) => diffDays(booking.startDate, booking.endDate) < MAX_SPAN_DAYS, {
    message: `A booking can be at most ${MAX_SPAN_DAYS} days long`,
    path: ["endDate"],
  });

// The booking form's half-day controls (spec §5.5): "Duration" for a single day,
// "First day" (Full / Afternoon only) and "Last day" (Full / Morning only) otherwise.
export type FormDays = { duration: Portion; firstDay: "FULL" | "PM"; lastDay: "FULL" | "AM" };

export function formPortionToHalves(
  singleDay: boolean,
  form: FormDays,
): { startHalf: HalfDay; endHalf: HalfDay } {
  if (singleDay) {
    if (form.duration === "FULL") return { startHalf: "AM", endHalf: "PM" };
    return { startHalf: form.duration, endHalf: form.duration };
  }
  return {
    startHalf: form.firstDay === "PM" ? "PM" : "AM",
    endHalf: form.lastDay === "AM" ? "AM" : "PM",
  };
}

export function halvesToFormPortion(
  singleDay: boolean,
  startHalf: HalfDay,
  endHalf: HalfDay,
): FormDays {
  if (singleDay) {
    const duration = startHalf === endHalf ? startHalf : "FULL";
    return { duration, firstDay: "FULL", lastDay: "FULL" };
  }
  return {
    duration: "FULL",
    firstDay: startHalf === "PM" ? "PM" : "FULL",
    lastDay: endHalf === "AM" ? "AM" : "FULL",
  };
}

// Cuts `cut` out of a booking: remove it, shorten it, or split it in two.
// Used by Replace and "Remove this day".
export function carveBooking(booking: Booking, cut: SlotRange): BookingChanges {
  return changesForPieces(booking, subtract(rangeOf(booking), cut));
}

// Turns what's left of a booking after carving into changes. No pieces: remove it.
// Otherwise the first piece keeps the booking's id (it's shortened) and every later
// piece becomes a new booking with the same details and original creator.
export function changesForPieces(booking: Booking, pieces: SlotRange[]): BookingChanges {
  const changes = emptyChanges();
  const [first, ...rest] = pieces;

  if (!first) {
    changes.remove.push(booking.id);
    return changes;
  }
  changes.update.push({ id: booking.id, range: first });
  for (const piece of rest) {
    changes.create.push({
      userId: booking.userId,
      type: booking.type,
      ...datesOfRange(piece),
      notes: booking.notes,
      publicHolidayId: booking.publicHolidayId,
      createdById: booking.createdById,
    });
  }
  return changes;
}
