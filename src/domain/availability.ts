// Who works when (spec §4): weekly working patterns that change over time, plus
// one-off overrides for single dates ("I'm working this Saturday").
import { type CalendarDate, nextSunday, weekday } from "./dates";
import type { HalfDay } from "./slots";

export type WorkDay = "FULL" | "AM" | "PM" | "OFF";

// Seven entries, one per weekday, starting with Sunday (index 0).
export type WeeklyPattern = WorkDay[];

// A pattern and the Sunday it starts on. A person's history is a list of these.
export type PatternVersion = { effectiveFrom: CalendarDate; pattern: WeeklyPattern };

export type Override = { date: CalendarDate; value: WorkDay };

// Answers "what does this person work on this date?"
export type AvailabilityLookup = (date: CalendarDate) => WorkDay;

// Mon–Fri full days, weekends off. Used when someone has no pattern of their own.
export const DEFAULT_PATTERN: WeeklyPattern = [
  "OFF",
  "FULL",
  "FULL",
  "FULL",
  "FULL",
  "FULL",
  "OFF",
];
export const DEFAULT_PATTERN_EFFECTIVE_FROM: CalendarDate = "2000-01-02"; // a Sunday

function newestFirst(versions: PatternVersion[]): PatternVersion[] {
  return [...versions].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
}

// The pattern in force on a date: the newest version that started on or before it.
function patternOn(date: CalendarDate, sortedNewestFirst: PatternVersion[]): WeeklyPattern {
  return (
    sortedNewestFirst.find((version) => version.effectiveFrom <= date)?.pattern ?? DEFAULT_PATTERN
  );
}

// Builds a fast lookup for one person (spec §4.3): an override for the date wins,
// otherwise the weekly pattern in force on that date. The history is sorted once
// here, so the grid can call the lookup for every person and day cheaply.
export function availabilityLookup(
  versions: PatternVersion[],
  overrides: Override[],
): AvailabilityLookup {
  const sorted = newestFirst(versions);
  const overrideByDate = new Map(overrides.map((override) => [override.date, override.value]));

  return (date) => overrideByDate.get(date) ?? patternOn(date, sorted)[weekday(date)];
}

// Does someone with this kind of day work this half of it?
export function worksSlot(workDay: WorkDay, half: HalfDay): boolean {
  if (workDay === "FULL") return true;
  if (workDay === "OFF") return false;
  return workDay === half;
}

// Pattern changes start from the next Sunday, so past day counts never change.
// Returns the version to save (replacing any pending one for that Sunday), or null
// if the pattern from that Sunday would already be the same.
export function planPatternChange(
  versions: PatternVersion[],
  newPattern: WeeklyPattern,
  today: CalendarDate,
): PatternVersion | null {
  const effectiveFrom = nextSunday(today);
  const current = patternOn(effectiveFrom, newestFirst(versions));
  if (current.join() === newPattern.join()) return null;
  return { effectiveFrom, pattern: newPattern };
}
