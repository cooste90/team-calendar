// Half-day slots (architecture §3.1). Every date has two slots, AM then PM:
//   slot = dayNumber * 2 + (AM ? 0 : 1)
// A booking covers an inclusive range of slots, so half days and overlaps become
// simple number comparisons.
import { type CalendarDate, eachDate, fromDayNumber, toDayNumber } from "./dates";

export type HalfDay = "AM" | "PM";
export type Slot = number;
export type SlotRange = { start: Slot; end: Slot }; // both ends included
export type Portion = "FULL" | "AM" | "PM";

export function toSlot(date: CalendarDate, half: HalfDay): Slot {
  return toDayNumber(date) * 2 + (half === "AM" ? 0 : 1);
}

export function fromSlot(slot: Slot): { date: CalendarDate; half: HalfDay } {
  return {
    date: fromDayNumber(Math.floor(slot / 2)),
    half: slot % 2 === 0 ? "AM" : "PM",
  };
}

// A booking's dates and halves as a slot range. A full first day starts AM;
// a full last day ends PM.
export function rangeOf(booking: {
  startDate: CalendarDate;
  startHalf: HalfDay;
  endDate: CalendarDate;
  endHalf: HalfDay;
}): SlotRange {
  return {
    start: toSlot(booking.startDate, booking.startHalf),
    end: toSlot(booking.endDate, booking.endHalf),
  };
}

export function overlaps(a: SlotRange, b: SlotRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

// The part both ranges share, or null if they don't overlap.
export function intersect(a: SlotRange, b: SlotRange): SlotRange | null {
  if (!overlaps(a, b)) return null;
  return { start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) };
}

// What's left of `a` after cutting `b` out of it: nothing, one piece or two pieces.
// This is how "Replace" trims or splits a clashing booking.
export function subtract(a: SlotRange, b: SlotRange): SlotRange[] {
  if (!overlaps(a, b)) return [a];
  const pieces: SlotRange[] = [];
  if (a.start < b.start) pieces.push({ start: a.start, end: b.start - 1 });
  if (b.end < a.end) pieces.push({ start: b.end + 1, end: a.end });
  return pieces;
}

export function slotsOf(range: SlotRange): Slot[] {
  const slots: Slot[] = [];
  for (let slot = range.start; slot <= range.end; slot++) {
    slots.push(slot);
  }
  return slots;
}

// Every date the range touches, even if only for half a day.
export function datesOf(range: SlotRange): CalendarDate[] {
  return eachDate(fromSlot(range.start).date, fromSlot(range.end).date);
}

export function isSingleDay(range: SlotRange): boolean {
  return Math.floor(range.start / 2) === Math.floor(range.end / 2);
}

// For a single-day range: the whole day, the morning or the afternoon.
export function portionOf(range: SlotRange): Portion {
  if (!isSingleDay(range)) {
    throw new Error("portionOf only works on a single-day range");
  }
  if (range.start === range.end) {
    return fromSlot(range.start).half;
  }
  return "FULL";
}
