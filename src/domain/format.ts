// en-GB date text for the UI (design system §8), e.g. "Thu 12 Nov".
// The names are written out here rather than using Intl, so the output is exactly
// the same on every computer and Node version.
import { type CalendarDate, type View, weekday } from "./dates";
import { fromSlot, isSingleDay, portionOf, type SlotRange } from "./slots";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
// Also used for the month dropdown in the header.
export const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parts(date: CalendarDate) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, monthIndex: month - 1, day };
}

// "Thu"
export function formatWeekdayShort(date: CalendarDate): string {
  return SHORT_DAYS[weekday(date)];
}

// "Thu 12"
export function formatDayHeader(date: CalendarDate): string {
  return `${formatWeekdayShort(date)} ${parts(date).day}`;
}

// "Thu 12 Nov"
export function formatShort(date: CalendarDate): string {
  return `${formatDayHeader(date)} ${SHORT_MONTHS[parts(date).monthIndex]}`;
}

// "Thursday 12 November 2026"
export function formatLong(date: CalendarDate): string {
  return `${formatWeekdayDayMonth(date)} ${parts(date).year}`;
}

// "Thursday 12 November": for screen-reader labels on the grid.
export function formatWeekdayDayMonth(date: CalendarDate): string {
  const { monthIndex, day } = parts(date);
  return `${LONG_DAYS[weekday(date)]} ${day} ${LONG_MONTHS[monthIndex]}`;
}

// "Monday 9 to Wednesday 11 November", "Friday 30 October to Tuesday 3 November",
// or just "Thursday 12 November" for a single date.
export function formatLongRange(from: CalendarDate, to: CalendarDate): string {
  if (from === to) return formatWeekdayDayMonth(from);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const fromText = sameMonth
    ? `${LONG_DAYS[weekday(from)]} ${parts(from).day}`
    : formatWeekdayDayMonth(from);
  return `${fromText} to ${formatWeekdayDayMonth(to)}`;
}

// Added after a single date to say which part of the day: "Thu 12 Nov, morning".
export const PORTION_SUFFIX = { FULL: "", AM: ", morning", PM: ", afternoon" };

// "1 day", "0.5 days", "3.5 days"
export function formatCount(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

// "1 person", "6 people", "0 people"
export function formatPeople(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}

// The live summary under the dates in the booking form, e.g. "Thu 10 – Tue 15 · 4 days".
// `count` is the number of working days, worked out elsewhere.
export function formatRangeSummary(range: SlotRange, count: number): string {
  const start = fromSlot(range.start);
  const end = fromSlot(range.end);

  if (isSingleDay(range)) {
    const portionText = PORTION_SUFFIX[portionOf(range)];
    return `${formatShort(start.date)}${portionText} · ${formatCount(count)}`;
  }

  // Within one month the month name is left off both ends: "Thu 10 – Tue 15".
  const sameMonth = start.date.slice(0, 7) === end.date.slice(0, 7);
  const format = sameMonth ? formatDayHeader : formatShort;
  // A half first day starts in the afternoon (PM); a half last day ends in the morning (AM).
  const startText = format(start.date) + (start.half === "PM" ? " PM" : "");
  const endText = format(end.date) + (end.half === "AM" ? " AM" : "");
  return `${startText} – ${endText} · ${formatCount(count)}`;
}

// The page title for the period on screen:
// "8 – 14 November 2026", "29 November – 5 December 2026",
// "27 December 2026 – 2 January 2027", or "November 2026" for month view.
export function formatPeriodTitle(
  view: View,
  range: { from: CalendarDate; to: CalendarDate },
): string {
  const from = parts(range.from);
  const to = parts(range.to);
  const toText = `${to.day} ${LONG_MONTHS[to.monthIndex]} ${to.year}`;

  if (view === "month") {
    return `${LONG_MONTHS[from.monthIndex]} ${from.year}`;
  }
  if (from.year !== to.year) {
    return `${from.day} ${LONG_MONTHS[from.monthIndex]} ${from.year} – ${toText}`;
  }
  if (from.monthIndex !== to.monthIndex) {
    return `${from.day} ${LONG_MONTHS[from.monthIndex]} – ${toText}`;
  }
  return `${from.day} – ${toText}`;
}

// The period part of the browser tab title (accessibility §1):
// "Week of 8 Nov 2026" or "November 2026".
export function formatDocumentTitlePeriod(view: View, from: CalendarDate): string {
  const { year, monthIndex, day } = parts(from);
  if (view === "month") {
    return `${LONG_MONTHS[monthIndex]} ${year}`;
  }
  return `Week of ${day} ${SHORT_MONTHS[monthIndex]} ${year}`;
}
