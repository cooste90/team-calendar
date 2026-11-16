"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { displayName } from "@/domain/display-name";
import { canEditProfileOf } from "@/domain/permissions";
import { UNASSIGNED_GROUP_NAME } from "@/domain/teams";
import type { CalendarData } from "@/server/queries/calendar";
import { type EventDialogTarget, useCalendarStore } from "../calendar-store";
import { EventForm } from "./event-form";

// The add / edit booking dialog (spec §5.5). The calendar store says what it's open for;
// everything else comes from the data the grid already has. On narrow screens and at
// high zoom it fills the screen, with the buttons kept in view.
export function EventFormDialog({ data }: { data: CalendarData }) {
  const target = useCalendarStore((store) => store.eventDialog);
  const setTarget = useCalendarStore((store) => store.setEventDialog);
  const opened = target && findWhatToShow(target, data);

  return (
    <Dialog
      open={opened !== null}
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
    >
      {opened && (
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-[37.5rem]">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="font-[650] text-[1.1875rem] tracking-[-0.015em]">
              {opened.booking ? "Edit event" : "Add event"}
            </DialogTitle>
            <DialogDescription>
              For {opened.subject.name} · {opened.teamName}
            </DialogDescription>
          </DialogHeader>
          <EventForm
            subject={opened.subject}
            booking={opened.booking}
            date={opened.date}
            viewer={data.viewer}
            today={data.today}
            canEditProfile={opened.canEditProfile}
            onDone={() => setTarget(null)}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

// The person, booking and date the dialog is for. Null if they're not in the data (say,
// the booking was deleted elsewhere and the page has refreshed), which closes it.
function findWhatToShow(target: EventDialogTarget, data: CalendarData) {
  let booking = null;
  let subjectId = "";
  if (target.mode === "edit") {
    booking = data.bookings.find((item) => item.id === target.bookingId);
    if (!booking) return null;
    subjectId = booking.userId;
  } else {
    subjectId = target.subjectId;
  }
  const person = data.people.find((item) => item.id === subjectId);
  if (!person) return null;

  const team = data.teams.find((item) => item.id === person.teamId);
  return {
    subject: { ...person, name: displayName(person) },
    booking,
    date: target.mode === "create" ? target.date : null,
    teamName: team?.name ?? UNASSIGNED_GROUP_NAME,
    canEditProfile: canEditProfileOf(data.viewer, {
      ...person,
      businessUnitId: data.businessUnitId,
    }),
  };
}
