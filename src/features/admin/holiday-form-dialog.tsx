"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CalendarDate } from "@/domain/dates";
import { formatHolidayImpact, formatPeople } from "@/domain/format";
import { isPastHoliday, type PublicHoliday } from "@/domain/public-holidays";
import { DatePickerField } from "@/features/calendar/event-form/date-picker-field";
import { type HolidayChange, holidayNameSchema } from "@/lib/schemas/public-holiday";
import { previewPublicHolidayChangeAction } from "@/server/actions/preview-public-holiday-change";
import { savePublicHolidayChangeAction } from "@/server/actions/save-public-holiday-change";

type Props = {
  holiday: PublicHoliday | null; // the one being edited; null for a new one
  today: CalendarDate;
  onClose: () => void;
  onSaved: (message: string) => void;
};

// What the confirm step shows and then saves: exactly the change that was previewed.
type Review = { change: HolidayChange; name: string; text: string };

// Add or edit a public holiday (spec §6.1), in two steps: the name and date, then a
// confirm step saying what it will do to everyone's bookings.
export function HolidayFormDialog({ holiday, today, onClose, onSaved }: Props) {
  const [name, setName] = useState(holiday?.name ?? "");
  const [date, setDate] = useState<CalendarDate | null>(holiday?.date ?? null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [pending, startTransition] = useTransition();
  const nameId = useId();

  // Step 1 → 2: check the form, then ask the server what the change would do.
  function handleContinue(event: FormEvent) {
    event.preventDefault();
    const checked = holidayNameSchema.safeParse(name);
    if (!checked.success) {
      setError(checked.error.issues[0].message);
      return;
    }
    if (!date) {
      setError("Enter a date like 25/12/2026.");
      return;
    }
    if (isPastHoliday(date, today)) {
      setError("Choose today or a later date.");
      return;
    }
    if (holiday && checked.data === holiday.name && date === holiday.date) {
      onClose(); // nothing changed
      return;
    }

    let change: HolidayChange = { kind: "create", name: checked.data, date };
    let kind: "create" | "move" | "rename" = "create";
    if (holiday) {
      change = { kind: "update", id: holiday.id, name: checked.data, date };
      kind = date === holiday.date ? "rename" : "move";
    }
    startTransition(async () => {
      const result = await previewPublicHolidayChangeAction(change);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setReview({ change, name: checked.data, text: formatHolidayImpact(kind, result.data) });
    });
  }

  function handleConfirm(confirmed: Review) {
    startTransition(async () => {
      const result = await savePublicHolidayChangeAction(confirmed.change);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (holiday) {
        onSaved(`${confirmed.name} saved.`);
      } else {
        onSaved(`${confirmed.name} added for ${formatPeople(result.data.people)}.`);
      }
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{holiday ? `Edit ${holiday.name}` : "Add public holiday"}</DialogTitle>
          <DialogDescription>
            {review ? review.text : "Public holidays apply to every business unit."}
          </DialogDescription>
        </DialogHeader>

        {review ? (
          <>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReview(null)} disabled={pending}>
                Back
              </Button>
              <Button onClick={() => handleConfirm(review)} disabled={pending}>
                {holiday ? "Save changes" : "Add holiday"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleContinue} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor={nameId} className="font-semibold text-[0.8125rem]">
                Name
              </label>
              <Input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                className="h-10"
              />
            </div>
            <DatePickerField
              label="Date"
              value={date}
              onChange={setDate}
              min={today}
              isDayOff={() => false}
              disabled={pending}
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? "Checking…" : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
