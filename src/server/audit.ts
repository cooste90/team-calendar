// The audit trail: one JSON line in the server log for every change to someone's
// bookings (T22, T23), and for every admin change to a public holiday (T31). Notes stay
// out, because they can be personal.
import "server-only";
import type { BookingInput } from "@/domain/events";
import type { HolidayImpact } from "@/domain/public-holidays";

type BookingEvent =
  | "booking.created"
  | "booking.updated"
  | "booking.deleted"
  | "booking.restored"
  | "booking.day-removed"
  | "booking.trimmed";

export function logBookingChange(
  event: BookingEvent,
  actorId: string,
  booking: BookingInput,
  extra: Record<string, string | number> = {},
) {
  // biome-ignore lint/suspicious/noConsole: the audit trail goes to the server log.
  console.info(
    JSON.stringify({
      event,
      actorId,
      subjectId: booking.userId,
      type: booking.type,
      start: `${booking.startDate} ${booking.startHalf}`,
      end: `${booking.endDate} ${booking.endHalf}`,
      ...extra,
    }),
  );
}

// One line per holiday change, with how many people it touched and how long it took
// (T31's target: a new holiday for 1,000 people in under 2 seconds).
export function logPublicHolidayChange(
  kind: "create" | "update" | "delete",
  actorId: string,
  impact: HolidayImpact,
  milliseconds: number,
) {
  // biome-ignore lint/suspicious/noConsole: the audit trail goes to the server log.
  console.info(
    JSON.stringify({ event: `public-holiday.${kind}`, actorId, ...impact, milliseconds }),
  );
}
