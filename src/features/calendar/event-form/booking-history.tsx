import type { CalendarData } from "@/server/queries/calendar";

type Audit = CalendarData["bookings"][number]["audit"];

// Who added a booking and who last changed it, and when (spec §5.5). Everyone can see it.
export function BookingHistory({ audit }: { audit: Audit }) {
  return (
    <div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
      <span>
        Created by {audit.createdBy ?? "a deleted user"} · {audit.createdAt}
      </span>
      <span>
        Last changed by {audit.updatedBy ?? "a deleted user"} · {audit.updatedAt}
      </span>
    </div>
  );
}
