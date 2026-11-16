// en-GB date text for the UI (design system §8), e.g. "Thu 12 Nov".
// The names are written out here rather than using Intl, so the output is exactly
// the same on every computer and Node version.
import { type CalendarDate, isCalendarDate, makeDate, type View, weekday } from "./dates";
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

// "Thu 12 Nov 2026": what the booking form's date inputs show.
export function formatDateInput(date: CalendarDate): string {
  return `${formatShort(date)} ${parts(date).year}`;
}

// The other way round, for typing into the booking form's date inputs (accessibility
// §4). Accepts "12/11/2026", "12 Nov 2026", "Thu 12 Nov 2026", "12 November 2026" and
// "2026-11-12". Returns null for anything else, or for a date that doesn't exist.
export function parseDateText(text: string): CalendarDate | null {
  const cleaned = text.trim().toLowerCase();
  if (isCalendarDate(cleaned)) return cleaned;

  const slashes = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned);
  if (slashes) return dateFrom(slashes[3], Number(slashes[2]), slashes[1]);

  // An optional weekday first ("Thu"), which is ignored.
  const words = /^(?:[a-z]+,?\s+)?(\d{1,2})\s+([a-z]+)\s+(\d{4})$/.exec(cleaned);
  if (words) {
    const month = words[2];
    const monthIndex = LONG_MONTHS.findIndex(
      (name) => month.length >= 3 && name.toLowerCase().startsWith(month),
    );
    if (monthIndex === -1) return null;
    return dateFrom(words[3], monthIndex + 1, words[1]);
  }
  return null;
}

function dateFrom(year: string, month: number, day: string): CalendarDate | null {
  const date = makeDate(Number(year), month, Number(day));
  return isCalendarDate(date) ? date : null;
}

// One formatter per time zone, made once: making one is slow, and the calendar formats
// two timestamps for every booking it loads.
const timestampFormatters = new Map<string, Intl.DateTimeFormat>();

// "3 Nov 2026, 09:14" in the app's time zone: when a booking was created or changed.
export function formatTimestamp(instant: Date, timeZone: string): string {
  let formatter = timestampFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    timestampFormatters.set(timeZone, formatter);
  }
  const formatted = formatter.formatToParts(instant);
  const value = Object.fromEntries(formatted.map((part) => [part.type, part.value]));
  const day = Number(value.day);
  const month = SHORT_MONTHS[Number(value.month) - 1];
  return `${day} ${month} ${value.year}, ${value.hour}:${value.minute}`;
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

// A filter button's name for screen readers: "Teams", or "Teams, 2 selected"
// (accessibility §2).
export function formatFilterName(label: string, count: number): string {
  return count > 0 ? `${label}, ${count} selected` : label;
}

// The line under the period title while filters are on, e.g.
// "Filtered: Service Design, Finance Operations · 2 people".
export function formatFilterSummary(teamNames: string[], peopleCount: number): string {
  const parts: string[] = [];
  if (teamNames.length > 0) parts.push(teamNames.join(", "));
  if (peopleCount > 0) parts.push(formatPeople(peopleCount));
  return `Filtered: ${parts.join(" · ")}`;
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

  // formatPeriodAnnouncement swaps the " – " below for " to ", so keep it the only dash.
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

// What screen readers hear when the period changes (accessibility §3):
// "Week of 8 to 14 November 2026" or "November 2026".
export function formatPeriodAnnouncement(
  view: View,
  range: { from: CalendarDate; to: CalendarDate },
): string {
  const title = formatPeriodTitle(view, range);
  if (view === "month") return title;
  return `Week of ${title.replace(" – ", " to ")}`;
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
