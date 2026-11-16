// The booking form's values, and the plain functions that set them up and change them.
import type { CalendarDate } from "@/domain/dates";
import {
  type BookingInput,
  bookingInputSchema,
  type FormDays,
  formPortionToHalves,
  halvesToFormPortion,
} from "@/domain/events";
import { formatShort } from "@/domain/format";
import type { LeaveType } from "@/domain/leave-types";
import { rangeOf, type SlotRange } from "@/domain/slots";

export type FormValues = {
  type: LeaveType;
  startDate: CalendarDate | null; // null while what's typed isn't a real date
  endDate: CalendarDate | null;
  days: FormDays; // Duration for one day, or First day / Last day for several
  notes: string;
};

const FULL_DAYS: FormDays = { duration: "FULL", firstDay: "FULL", lastDay: "FULL" };

// A new booking: annual leave for the whole of the clicked day (spec §5.5).
export function newBookingValues(date: CalendarDate): FormValues {
  return { type: "ANNUAL", startDate: date, endDate: date, days: FULL_DAYS, notes: "" };
}

export function existingBookingValues(booking: BookingInput): FormValues {
  const oneDay = booking.startDate === booking.endDate;
  return {
    type: booking.type,
    startDate: booking.startDate,
    endDate: booking.endDate,
    days: halvesToFormPortion(oneDay, booking.startHalf, booking.endHalf),
    notes: booking.notes ?? "",
  };
}

// Duration is asked for one day; First day and Last day for several.
export function isOneDay(values: FormValues): boolean {
  return values.startDate === values.endDate;
}

// A new start date. If it's now after the end, the end follows it (spec §5.5).
export function withStartDate(values: FormValues, startDate: CalendarDate | null): FormValues {
  const endBeforeStart = startDate && values.endDate && values.endDate < startDate;
  return { ...values, startDate, endDate: endBeforeStart ? startDate : values.endDate };
}

// The values as a booking, ready for bookingInputSchema and the server. Null while one
// of the dates isn't a real date.
export function toBookingInput(values: FormValues, userId: string): BookingInput | null {
  const { startDate, endDate } = values;
  if (!startDate || !endDate) return null;
  const halves = formPortionToHalves(isOneDay(values), values.days);
  return { userId, type: values.type, startDate, endDate, ...halves, notes: values.notes };
}

// The half-days chosen, for the live day count. Null until the dates make sense.
export function chosenRange(values: FormValues): SlotRange | null {
  const { startDate, endDate } = values;
  if (!startDate || !endDate || endDate < startDate) return null;
  return rangeOf({ startDate, endDate, ...formPortionToHalves(isOneDay(values), values.days) });
}

// A message per field that needs fixing, e.g. { endDate: "The end can't be before the start" }.
export type FormErrors = Partial<Record<"startDate" | "endDate" | "notes", string>>;

// Checks the form before it's sent. The rules are bookingInputSchema's, the same ones
// the server checks again, plus "is it a date at all" and the earliest allowed start
// (null when the start can't be changed anyway).
export function validateForm(
  values: FormValues,
  userId: string,
  earliestStart: CalendarDate | null,
): FormErrors {
  const errors: FormErrors = {};
  const notADate = "Enter a date like 12/11/2026";
  if (!values.startDate) errors.startDate = notADate;
  if (!values.endDate) errors.endDate = notADate;
  if (earliestStart && values.startDate && values.startDate < earliestStart) {
    errors.startDate = `The earliest start you can choose is ${formatShort(earliestStart)}`;
  }

  const booking = toBookingInput(values, userId);
  const result = booking ? bookingInputSchema.safeParse(booking) : null;
  for (const issue of result?.error?.issues ?? []) {
    const field = issue.path[0];
    if (field === "startDate" || field === "endDate" || field === "notes") {
      errors[field] ??= issue.message;
    }
  }
  return errors;
}
