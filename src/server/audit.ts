// The audit trail: one JSON line in the server log for every change to someone's
// bookings (T22, T23). Notes stay out, because they can be personal.
import "server-only";
import type { BookingInput } from "@/domain/events";

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
