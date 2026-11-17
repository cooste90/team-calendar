"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";
import { availabilityLookup, type WorkDay } from "@/domain/availability";
import type { CalendarDate } from "@/domain/dates";
import type { ConflictDetail } from "@/domain/errors";
import type { BookingInput } from "@/domain/events";
import type { Actor } from "@/domain/permissions";
import type { Portion } from "@/domain/slots";
import { allowedEdits, earliestCreatableDate } from "@/domain/time-rules";
import type { CalendarBooking, CalendarPerson } from "@/server/queries/calendar";
import { useCalendarStore } from "../calendar-store";
import { BookingHistory } from "./booking-history";
import { ConflictAlert } from "./conflict-alert";
import { DateRangeFields } from "./date-range-fields";
import { ErrorSummary } from "./error-summary";
import { FormFooter } from "./form-footer";
import {
  existingBookingValues,
  type FormErrors,
  newBookingValues,
  toBookingInput,
  validateForm,
} from "./form-values";
import { NotesField } from "./notes-field";
import { OverrideFields } from "./override-fields";
import { savedMessage, saveForm } from "./save-form";
import { TypePicker } from "./type-picker";

type Props = {
  subject: CalendarPerson & { name: string };
  booking: CalendarBooking | null; // null for a new booking
  date: CalendarDate | null; // the clicked date, for a new booking
  portion: Portion; // the part of that day a new booking starts as
  viewer: Actor;
  today: CalendarDate;
  canEditProfile: boolean; // can set day swaps for this person (spec §4.2)
  onDone: () => void;
};

const LOCKED_REASON = {
  all: null,
  "end-and-notes": "Started in the past — only the end date and notes can change.",
  none: "This booking is in the past and can't be changed.",
};

// The add / edit booking form (spec §5.5): its values live in one object, checked with
// the shared schema, then sent to the server, which checks everything again.
export function EventForm({
  subject,
  booking,
  date,
  portion,
  viewer,
  today,
  canEditProfile,
  onDone,
}: Props) {
  const [values, setValues] = useState(() =>
    booking ? existingBookingValues(booking) : newBookingValues(date ?? today, portion),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startInputRef = useRef<HTMLInputElement>(null);

  // What can be changed, and from when (spec §5.4).
  const edits = booking ? allowedEdits(booking, today) : "all";
  const startLocked = edits !== "all";
  const minDate = booking ? today : earliestCreatableDate(viewer.role, today);
  const lockedReason = LOCKED_REASON[edits];

  // A day swap for the clicked date, for people who can change this person's working
  // days. The count and hatching include it before it's saved.
  const swapDate = canEditProfile ? date : null;
  const savedSwap = subject.overrides.find((override) => override.date === swapDate)?.value ?? null;
  const [swap, setSwap] = useState<WorkDay | null>(savedSwap);
  const swapChanged = swapDate !== null && swap !== savedSwap;
  const otherSwaps = subject.overrides.filter((override) => override.date !== swapDate);
  const plannedSwaps =
    swapDate && swap ? [...otherSwaps, { date: swapDate, value: swap }] : otherSwaps;
  const lookup = availabilityLookup(subject.patterns, plannedSwaps);
  const patternDays = availabilityLookup(subject.patterns, []);

  function send(bookingInput: BookingInput | null, replace: boolean) {
    startTransition(async () => {
      const outcome = await saveForm({
        userId: subject.id,
        booking: bookingInput,
        bookingId: booking?.id ?? null,
        replace,
        swap: swapDate && swapChanged ? { date: swapDate, value: swap } : null,
      });
      setConflicts(outcome.conflicts);
      setProblem(outcome.problem);
      if (!outcome.saved) return;
      const store = useCalendarStore.getState();
      store.announce(savedMessage(bookingInput, booking !== null, subject.name, lookup));
      store.setLastCreatedId(outcome.createdId);
      onDone();
    });
  }

  function save(replace: boolean) {
    const found = validateForm(values, subject.id, startLocked ? null : minDate);
    setErrors(found);
    if (Object.keys(found).length === 0) send(toBookingInput(values, subject.id), replace);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pt-3 pb-5">
        {lockedReason && (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-[0.8125rem]">{lockedReason}</p>
        )}
        <ErrorSummary errors={errors} problem={problem} />
        <TypePicker
          value={values.type}
          onChange={(type) => setValues({ ...values, type })}
          disabled={startLocked}
        />
        <DateRangeFields
          values={values}
          onChange={(changed) => {
            setValues(changed);
            setConflicts([]); // they were for the old dates
          }}
          minDate={minDate}
          lookup={lookup}
          startLocked={startLocked}
          disabled={edits === "none"}
          errors={errors}
          startInputRef={startInputRef}
        />
        {conflicts.length > 0 && (
          <ConflictAlert
            conflicts={conflicts}
            onReplace={() => save(true)}
            onChangeDates={() => startInputRef.current?.focus()}
            pending={pending}
          />
        )}
        {swapDate && (
          <OverrideFields
            date={swapDate}
            patternDay={patternDays(swapDate)}
            value={swap}
            onChange={setSwap}
            personName={subject.id === viewer.id ? null : subject.name}
            disabled={pending}
          />
        )}
        <NotesField
          value={values.notes}
          onChange={(notes) => setValues({ ...values, notes })}
          disabled={edits === "none"}
          error={errors.notes}
        />
        {booking && <BookingHistory audit={booking.audit} />}
      </div>
      <FormFooter
        booking={booking}
        edits={edits}
        pending={pending}
        swapChanged={swapChanged}
        onSaveSwapOnly={() => send(null, false)}
      />
    </form>
  );
}
