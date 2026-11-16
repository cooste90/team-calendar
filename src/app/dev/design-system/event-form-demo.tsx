"use client";

import { Button } from "@/components/ui/button";
import { DEFAULT_PATTERN, DEFAULT_PATTERN_EFFECTIVE_FROM } from "@/domain/availability";
import { addDays, todayIn } from "@/domain/dates";
import { useCalendarStore } from "@/features/calendar/calendar-store";
import { EventFormDialog } from "@/features/calendar/event-form/event-form-dialog";
import type { CalendarData } from "@/server/queries/calendar";

// The booking form with made-up data, so it can be checked by eye and by the e2e tests
// before the grid opens it (T25). Saving here fails: these people aren't in the database.
const today = todayIn("Europe/London");
const patterns = [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern: DEFAULT_PATTERN }];

const demoData: CalendarData = {
  businessUnitId: "demo",
  range: { from: today, to: today },
  today,
  teams: [{ id: "design", name: "Service Design", sortOrder: 1 }],
  people: [
    {
      id: "priya",
      firstName: "Priya",
      preferredName: null,
      surname: "Shah",
      teamId: "design",
      patterns,
      overrides: [],
    },
  ],
  bookings: [
    {
      id: "ongoing",
      userId: "priya",
      type: "ANNUAL",
      startDate: addDays(today, -2),
      startHalf: "AM",
      endDate: addDays(today, 3),
      endHalf: "PM",
      notes: "Back Wednesday morning.",
      publicHolidayId: null,
      audit: {
        createdBy: "Priya Shah",
        createdAt: "3 Nov 2026, 09:14",
        updatedBy: "Tom Okafor",
        updatedAt: "10 Nov 2026, 16:02",
      },
    },
  ],
  publicHolidays: [],
  viewer: {
    id: "priya",
    role: "USER",
    businessUnitId: "demo",
    teamId: "design",
    canSeeUnassigned: false,
  },
  collapsedTeamIds: [],
};

export function EventFormDemo() {
  const setEventDialog = useCalendarStore((store) => store.setEventDialog);
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={() => setEventDialog({ mode: "create", subjectId: "priya", date: today })}
      >
        Add event (today)
      </Button>
      <Button
        variant="outline"
        onClick={() => setEventDialog({ mode: "edit", bookingId: "ongoing" })}
      >
        Edit event (started)
      </Button>
      <EventFormDialog data={demoData} />
    </div>
  );
}
