// Counting working days in a booking (spec §5.2): a full working day counts 1, the
// working half of a morning-only or afternoon-only day counts 0.5, days off count 0.
import { type AvailabilityLookup, worksSlot } from "./availability";
import { formatDayHeader } from "./format";
import { datesOf, fromSlot, type Slot, type SlotRange, slotsOf, toSlot } from "./slots";

function isWorkingSlot(slot: Slot, lookup: AvailabilityLookup): boolean {
  const { date, half } = fromSlot(slot);
  return worksSlot(lookup(date), half);
}

export function workingSlots(range: SlotRange, lookup: AvailabilityLookup): Slot[] {
  return slotsOf(range).filter((slot) => isWorkingSlot(slot, lookup));
}

// The slots inside a booking the person doesn't work: hatched inside the bar on the grid.
export function nonWorkingSlots(range: SlotRange, lookup: AvailabilityLookup): Slot[] {
  return slotsOf(range).filter((slot) => !isWorkingSlot(slot, lookup));
}

export function countWorkingDays(range: SlotRange, lookup: AvailabilityLookup): number {
  return workingSlots(range, lookup).length / 2;
}

// A hint under the booking form's day count explaining what wasn't counted, e.g.
// "Sat 14 and Sun 15 are not working days, so they are not counted." or
// "Wed 11 is a morning-only day." Empty when every booked half-day was counted.
export function describeExcludedDays(range: SlotRange, lookup: AvailabilityLookup): string {
  const daysOff: string[] = [];
  const mornings: string[] = [];
  const afternoons: string[] = [];

  for (const date of datesOf(range)) {
    const bookedSlots = [toSlot(date, "AM"), toSlot(date, "PM")].filter(
      (slot) => slot >= range.start && slot <= range.end,
    );
    if (bookedSlots.every((slot) => isWorkingSlot(slot, lookup))) continue;

    const workDay = lookup(date);
    if (workDay === "AM") mornings.push(formatDayHeader(date));
    else if (workDay === "PM") afternoons.push(formatDayHeader(date));
    else daysOff.push(formatDayHeader(date));
  }

  return [
    sentence(
      daysOff,
      "is not a working day, so it is not counted.",
      "are not working days, so they are not counted.",
    ),
    sentence(mornings, "is a morning-only day.", "are morning-only days."),
    sentence(afternoons, "is an afternoon-only day.", "are afternoon-only days."),
  ]
    .filter(Boolean)
    .join(" ");
}

// sentence(["Sat 14", "Sun 15"], "is …", "are …") → "Sat 14 and Sun 15 are …"
function sentence(days: string[], ifOne: string, ifMany: string): string {
  if (days.length === 0) return "";
  if (days.length === 1) return `${days[0]} ${ifOne}`;
  return `${days.slice(0, -1).join(", ")} and ${days.at(-1)} ${ifMany}`;
}
