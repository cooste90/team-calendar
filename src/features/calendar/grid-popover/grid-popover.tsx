"use client";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { formatShort } from "@/domain/format";
import type { GridModel } from "@/domain/grid-model-types";
import { leaveTypes } from "@/domain/leave-types";
import type { CalendarData } from "@/server/queries/calendar";
import { type EventDialogTarget, useCalendarStore } from "../calendar-store";
import { findGridCell, focusLastCell } from "../grid/cell-elements";
import { describeCell } from "../grid/describe-cell";
import { BookingDetails } from "./booking-details";
import { CellMenu } from "./cell-menu";

type Props = { data: CalendarData; model: GridModel };

// The one popover on the grid, pointing at a cell: the cell menu, or a booking's details
// (spec §5.6). The calendar store says which. Esc or a click outside closes it, and focus
// goes back to the cell.
export function GridPopover({ data, model }: Props) {
  const target = useCalendarStore((store) => store.gridPopover);
  const setTarget = useCalendarStore((store) => store.setGridPopover);
  const setEventDialog = useCalendarStore((store) => store.setEventDialog);
  const cell = target && describeCell(model, data, target.personId, target.date);
  // The booking whose details were asked for. If it has gone (deleted in another tab,
  // say), the cell menu shows instead.
  const details = cell?.items.find((item) => item.booking.id === target?.bookingId) ?? null;
  // The cell element itself is the anchor, so the popover follows it as the grid scrolls.
  const anchor = target && findGridCell({ personId: target.personId, column: target.date });

  // The form opens from the cell, so it puts focus back on the cell when it closes.
  function openForm(form: EventDialogTarget) {
    focusLastCell();
    setTarget(null);
    setEventDialog(form);
  }

  let label = "";
  if (cell && details) label = `${leaveTypes[details.booking.type].label}, ${cell.personName}`;
  if (cell && !details) label = `${formatShort(cell.date)}, ${cell.personName}`;

  return (
    <Popover
      open={cell !== null}
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
    >
      <PopoverAnchor virtualRef={{ current: anchor }} />
      {cell && (
        <PopoverContent
          // A new key when "View" swaps the menu for the details, so focus moves into them.
          key={details ? details.booking.id : "menu"}
          aria-label={label}
          align="start"
          className="w-80"
          onCloseAutoFocus={(event) => {
            // Back to the cell, unless focus has already moved on (to the form, another cell).
            event.preventDefault();
            if (document.activeElement === document.body) focusLastCell();
          }}
        >
          {details ? (
            <BookingDetails
              item={details}
              date={cell.date}
              personName={cell.personName}
              onOpenForm={openForm}
            />
          ) : (
            <CellMenu
              cell={cell}
              onView={(bookingId) =>
                setTarget({ personId: cell.personId, date: cell.date, bookingId })
              }
              onOpenForm={openForm}
            />
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
