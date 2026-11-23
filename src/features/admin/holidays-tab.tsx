"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/dates";
import { formatLong } from "@/domain/format";
import { isPastHoliday, type PublicHoliday } from "@/domain/public-holidays";
import { DeleteHolidayDialog } from "./delete-holiday-dialog";
import { HolidayFormDialog } from "./holiday-form-dialog";

type Props = {
  holidays: PublicHoliday[]; // by date
  today: CalendarDate;
  onAnnounce: (message: string) => void;
};

// The admin dialog's Public holidays tab (spec §6.1): one list for every BU. Upcoming
// holidays can be edited and deleted; past ones are history, folded away by year.
export function HolidaysTab({ holidays, today, onAnnounce }: Props) {
  // The open dialog: null for none, "new" for Add, or the holiday being edited.
  const [editing, setEditing] = useState<PublicHoliday | "new" | null>(null);
  const [deleting, setDeleting] = useState<PublicHoliday | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const focusAddOnClose = useRef(false);
  const id = useId();
  const upcoming = holidays.filter((holiday) => !isPastHoliday(holiday.date, today));
  const past = holidays.filter((holiday) => isPastHoliday(holiday.date, today));
  // Newest year first: ["2026", "2025"]. The list is by date, so the years come oldest first.
  const years = [...new Set(past.map((holiday) => holiday.date.slice(0, 4)))].reverse();

  // A toast for everyone, and the dialog's own announcement for screen readers.
  function done(message: string) {
    toast.success(message);
    onAnnounce(message);
    setEditing(null);
    setDeleting(null);
  }

  function deleted(message: string) {
    focusAddOnClose.current = true;
    done(message);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Public holidays apply to every business unit.
        </p>
        <Button ref={addButton} onClick={() => setEditing("new")} className="h-9">
          <PlusIcon aria-hidden="true" />
          Add public holiday
        </Button>
      </div>

      <section aria-labelledby={`${id}-upcoming`} className="flex flex-col gap-2">
        <h3 id={`${id}-upcoming`} className="font-semibold text-[0.8125rem]">
          Upcoming
        </h3>
        {upcoming.length === 0 && (
          <p className="text-muted-foreground">No upcoming public holidays.</p>
        )}
        {upcoming.length > 0 && (
          <ul className="rounded-xl border px-3.5">
            {upcoming.map((holiday) => (
              <li
                key={holiday.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 basis-40 flex-col">
                  <span className="font-medium">{holiday.name}</span>
                  <span className="text-muted-foreground text-xs">{formatLong(holiday.date)}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${holiday.name}`}
                    onClick={() => setEditing(holiday)}
                  >
                    <PencilIcon aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${holiday.name}`}
                    onClick={() => setDeleting(holiday)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer rounded-md font-semibold text-[0.8125rem]">
            Past public holidays ({past.length})
          </summary>
          <p className="mt-1 text-muted-foreground text-xs">Past holidays can't be changed.</p>
          {years.map((year) => (
            <section key={year} aria-labelledby={`${id}-${year}`} className="mt-3">
              <h4 id={`${id}-${year}`} className="font-semibold text-muted-foreground text-xs">
                {year}
              </h4>
              <ul className="mt-1 rounded-xl border px-3.5">
                {past
                  .filter((holiday) => holiday.date.startsWith(year))
                  .map((holiday) => (
                    <li key={holiday.id} className="flex flex-col border-b py-2 last:border-b-0">
                      <span>{holiday.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatLong(holiday.date)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </details>
      )}

      {/* Each dialog is only there while it's open, so it starts fresh every time. */}
      {editing && (
        <HolidayFormDialog
          holiday={editing === "new" ? null : editing}
          today={today}
          onClose={() => setEditing(null)}
          onSaved={done}
        />
      )}
      {deleting && (
        <DeleteHolidayDialog
          holiday={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={deleted}
          onCloseAutoFocus={(event) => {
            // The deleted holiday's row has gone, so focus goes to Add public holiday.
            // After Cancel, Radix puts it back on the Delete button as usual.
            if (!focusAddOnClose.current) return;
            focusAddOnClose.current = false;
            event.preventDefault();
            addButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
