"use client";

import { useCalendarStore } from "@/features/calendar/calendar-store";

// Screen readers read out whatever appears here, without moving focus (e.g. "Booking
// saved"). Call useCalendarStore's announce(message) to say something.
export function LiveRegion() {
  const announcement = useCalendarStore((state) => state.announcement);
  return (
    <div aria-live="polite" className="sr-only">
      {announcement}
    </div>
  );
}
