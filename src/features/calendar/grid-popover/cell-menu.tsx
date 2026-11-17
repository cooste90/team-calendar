import { CalendarCogIcon, PlusIcon } from "lucide-react";
import { LabelledLeaveChip } from "@/components/leave-chip";
import { Button } from "@/components/ui/button";
import { formatShort } from "@/domain/format";
import { leaveTypes } from "@/domain/leave-types";
import type { HalfDay } from "@/domain/slots";
import type { EventDialogTarget } from "../calendar-store";
import type { CellSummary } from "../grid/describe-cell";

type Props = {
  cell: CellSummary;
  onView: (bookingId: string) => void;
  onOpenForm: (form: EventDialogTarget) => void;
};

const ADD_LABEL: Record<HalfDay, string> = { AM: "Add to morning", PM: "Add to afternoon" };

// The cell menu (accessibility §3): each booking that day with View, and Edit when
// allowed, then adding to a free half or setting the day's availability. Someone who
// can't change this person's bookings only sees View.
export function CellMenu({ cell, onView, onOpenForm }: Props) {
  const { date, personId, items } = cell;
  const hasMore = cell.freeHalves.length > 0 || cell.canSetAvailability;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold">
        {formatShort(date)} · {cell.personName}
      </h2>
      {items.length === 0 && <p className="text-muted-foreground">Nothing booked.</p>}
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map(({ booking, summary, actions }) => {
            const label = leaveTypes[booking.type].label;
            return (
              <li key={booking.id} className="flex flex-col gap-2 rounded-xl bg-surface-2 p-2.5">
                <LabelledLeaveChip type={booking.type} />
                <span className="text-muted-foreground text-xs">{summary}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`View ${label}`}
                    onClick={() => onView(booking.id)}
                  >
                    View
                  </Button>
                  {actions.edit && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Edit ${label}`}
                      onClick={() => onOpenForm({ mode: "edit", bookingId: booking.id })}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {hasMore && (
        <div className="flex flex-col items-start gap-1">
          {cell.freeHalves.map((half) => (
            <Button
              key={half}
              size="sm"
              variant="ghost"
              onClick={() =>
                onOpenForm({ mode: "create", subjectId: personId, date, portion: half })
              }
            >
              <PlusIcon aria-hidden="true" />
              {ADD_LABEL[half]}
            </Button>
          ))}
          {cell.canSetAvailability && (
            // The booking form has the day swap options for the clicked date.
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenForm({ mode: "create", subjectId: personId, date })}
            >
              <CalendarCogIcon aria-hidden="true" />
              Set availability for this day
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
