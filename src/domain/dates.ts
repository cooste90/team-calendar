// Calendar dates as plain "YYYY-MM-DD" strings, plus the date maths the app needs.
// Times and time zones never come into it, so daylight saving can't shift a date.
import { z } from "zod";

export type CalendarDate = string; // "YYYY-MM-DD"

// "YYYY-MM-DD" strings sort correctly as plain strings, so compare them with
// <, >, <=, >= and === directly. No compare helpers needed.

const MS_PER_DAY = 86_400_000;

// The grid converts the same few dozen dates back and forth tens of thousands of
// times, so both conversions remember their answers. There are only a few thousand
// dates the app will ever see, so these stay small.
const dayNumberCache = new Map<CalendarDate, number>();
const dateCache = new Map<number, CalendarDate>();

// Days since 1970-01-01. Date maths is done on these whole numbers.
export function toDayNumber(date: CalendarDate): number {
  let dayNumber = dayNumberCache.get(date);
  if (dayNumber === undefined) {
    const [year, month, day] = date.split("-").map(Number);
    dayNumber = Date.UTC(year, month - 1, day) / MS_PER_DAY;
    dayNumberCache.set(date, dayNumber);
  }
  return dayNumber;
}

export function fromDayNumber(dayNumber: number): CalendarDate {
  let date = dateCache.get(dayNumber);
  if (date === undefined) {
    // Pure UTC, so the result can't depend on the computer's time zone.
    date = new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
    dateCache.set(dayNumber, date);
  }
  return date;
}

// Builds "YYYY-MM-DD" from numbers. It doesn't check that the date exists: use
// isCalendarDate for that.
export function makeDate(year: number, month: number, day: number): CalendarDate {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// True only for real dates in the exact "YYYY-MM-DD" format (rejects 2026-02-30).
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromDayNumber(toDayNumber(value)) === value;
}

// Use this wherever a date comes into the app: URLs, forms and server actions.
export const calendarDateSchema = z
  .string()
  .refine(isCalendarDate, "Enter a real date in the format YYYY-MM-DD");

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromDayNumber(toDayNumber(date) + days);
}

// How many days from `from` to `to` (negative if `to` is earlier).
export function diffDays(from: CalendarDate, to: CalendarDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

// Every date from `from` to `to`, both included.
export function eachDate(from: CalendarDate, to: CalendarDate): CalendarDate[] {
  const dates: CalendarDate[] = [];
  for (let day = toDayNumber(from); day <= toDayNumber(to); day++) {
    dates.push(fromDayNumber(day));
  }
  return dates;
}

// 0 = Sunday … 6 = Saturday. 1 January 1970 was a Thursday (4).
export function weekday(date: CalendarDate): number {
  return (((toDayNumber(date) + 4) % 7) + 7) % 7;
}

// Weeks run Sunday to Saturday.
export function startOfWeek(date: CalendarDate): CalendarDate {
  return addDays(date, -weekday(date));
}

export function endOfWeek(date: CalendarDate): CalendarDate {
  return addDays(startOfWeek(date), 6);
}

// The Sunday after `date`, never `date` itself. Working pattern changes apply from here.
export function nextSunday(date: CalendarDate): CalendarDate {
  return addDays(date, 7 - weekday(date));
}

export function startOfMonth(date: CalendarDate): CalendarDate {
  return `${date.slice(0, 8)}01`;
}

export function endOfMonth(date: CalendarDate): CalendarDate {
  return addDays(addMonths(startOfMonth(date), 1), -1);
}

export function startOfYear(date: CalendarDate): CalendarDate {
  return `${date.slice(0, 4)}-01-01`;
}

// Moves by whole months. A day that doesn't exist in the new month is clamped,
// so 31 January + 1 month = 28 (or 29) February.
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const [year, month, day] = date.split("-").map(Number);
  const monthIndex = year * 12 + (month - 1) + months;
  const newYear = Math.floor(monthIndex / 12);
  const newMonth = (monthIndex % 12) + 1;
  return makeDate(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)));
}

function daysInMonth(year: number, month: number): number {
  // From the 1st of this month to the 1st of the next (Date.UTC rolls month 13 into January).
  return (Date.UTC(year, month, 1) - Date.UTC(year, month - 1, 1)) / MS_PER_DAY;
}

// Today's date where the user is (Europe/London for WestCal). The server works this
// out and passes it down, so the server and browser always agree.
export function todayIn(timeZone: string, now = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export type View = "week" | "month";

export type Period = { from: CalendarDate; to: CalendarDate; days: CalendarDate[] };

// The dates shown on screen for a view: Sunday to Saturday, or the whole month.
export function periodRange(view: View, anchor: CalendarDate): Period {
  const from = view === "week" ? startOfWeek(anchor) : startOfMonth(anchor);
  const to = view === "week" ? endOfWeek(anchor) : endOfMonth(anchor);
  return { from, to, days: eachDate(from, to) };
}

// The first day of the previous (step -1) or next (step 1) week or month.
export function shiftPeriod(view: View, anchor: CalendarDate, step: 1 | -1): CalendarDate {
  if (view === "week") {
    return startOfWeek(addDays(anchor, 7 * step));
  }
  return startOfMonth(addMonths(anchor, step));
}

// The year dropdown: five years either side of the current year.
export function yearOptions(today: CalendarDate): number[] {
  const year = Number(today.slice(0, 4));
  return Array.from({ length: 11 }, (_, index) => year - 5 + index);
}

// In week view, picking a month and year jumps to the week containing the 1st (spec §2.1).
export function weekForMonthSelection(month: number, year: number): CalendarDate {
  return startOfWeek(makeDate(year, month, 1));
}

// Where the month and year dropdowns take you (month is 1-12): the week containing the
// 1st in week view, or that month in month view.
export function anchorForMonthSelection(view: View, month: number, year: number): CalendarDate {
  if (view === "week") {
    return weekForMonthSelection(month, year);
  }
  return makeDate(year, month, 1);
}

// Postgres `date` columns arrive from Prisma as a JS Date at UTC midnight. These two,
// and the date picker's pair below, are the ONLY places a JS Date meets a CalendarDate:
// convert at the edges, and use CalendarDate everywhere else.
export function toDbDate(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function fromDbDate(date: Date): CalendarDate {
  return date.toISOString().slice(0, 10);
}

// The date picker (react-day-picker) works with JS Dates at local midnight.
export function toLocalDate(date: CalendarDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function fromLocalDate(day: Date): CalendarDate {
  return makeDate(day.getFullYear(), day.getMonth() + 1, day.getDate());
}
