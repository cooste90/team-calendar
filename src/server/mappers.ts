// Turns Prisma rows into the plain domain types in src/domain, and domain values back
// into row data for saving. This is the only file where Prisma types meet domain types.
import "server-only";
import type { Override, PatternVersion, WeeklyPattern } from "@/domain/availability";
import { fromDbDate, toDbDate } from "@/domain/dates";
import type { Booking, NewBooking } from "@/domain/events";
import type { PublicHoliday } from "@/domain/public-holidays";
import type {
  Event as EventRow,
  AvailabilityOverride as OverrideRow,
  PublicHoliday as PublicHolidayRow,
  WorkingPattern as WorkingPatternRow,
} from "@/generated/prisma/client";

export function toBooking(row: EventRow): Booking {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    startDate: fromDbDate(row.startDate),
    startHalf: row.startHalf,
    endDate: fromDbDate(row.endDate),
    endHalf: row.endHalf,
    // The domain uses "no notes" (undefined) rather than null.
    notes: row.notes ?? undefined,
    publicHolidayId: row.publicHolidayId,
    createdById: row.createdById,
  };
}

// The reverse of toBooking, for saving a new booking.
export function toEventData(booking: NewBooking) {
  return {
    userId: booking.userId,
    type: booking.type,
    startDate: toDbDate(booking.startDate),
    startHalf: booking.startHalf,
    endDate: toDbDate(booking.endDate),
    endHalf: booking.endHalf,
    notes: booking.notes ?? null,
    publicHolidayId: booking.publicHolidayId,
    createdById: booking.createdById ?? null,
  };
}

// The domain's weekly pattern is a 7-item list, Sunday first.
export function toPatternVersion(row: WorkingPatternRow): PatternVersion {
  return {
    effectiveFrom: fromDbDate(row.effectiveFrom),
    pattern: [row.sun, row.mon, row.tue, row.wed, row.thu, row.fri, row.sat],
  };
}

// The reverse of toPatternVersion's list, for saving a pattern.
export function toPatternColumns(pattern: WeeklyPattern) {
  const [sun, mon, tue, wed, thu, fri, sat] = pattern;
  return { sun, mon, tue, wed, thu, fri, sat };
}

export function toOverride(row: OverrideRow): Override {
  return { date: fromDbDate(row.date), value: row.value };
}

export function toPublicHoliday(row: PublicHolidayRow): PublicHoliday {
  return { id: row.id, date: fromDbDate(row.date), name: row.name };
}
