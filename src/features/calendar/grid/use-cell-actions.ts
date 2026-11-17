"use client";

import type { MouseEvent } from "react";
import type { GridModel } from "@/domain/grid-model-types";
import type { CellPosition } from "@/domain/grid-navigation";
import type { CalendarData } from "@/server/queries/calendar";
import { requestDelete } from "../booking-actions";
import { useCalendarStore } from "../calendar-store";
import { focusGridCell, positionOf } from "./cell-elements";
import { describeCell } from "./describe-cell";

// What a click, Enter / Space or Delete does on a grid cell, and what a click on a bar
// does (spec §5.5, §5.6, accessibility §3).
export function useCellActions(model: GridModel, data: CalendarData) {
  const setEventDialog = useCalendarStore((store) => store.setEventDialog);
  const setGridPopover = useCalendarStore((store) => store.setGridPopover);

  // An empty day the viewer can book on opens "Add event". Anything else opens the cell
  // menu: the bookings that day, and what else can be done.
  function activateCell(position: CellPosition) {
    const cell = describeCell(model, data, position.personId, position.column);
    if (!cell) return;
    if (cell.items.length === 0 && cell.canAdd) {
      setEventDialog({ mode: "create", subjectId: cell.personId, date: cell.date });
    } else {
      setGridPopover({ personId: cell.personId, date: cell.date, bookingId: null });
    }
  }

  // Delete works when the day has exactly one booking that can be deleted.
  function deleteFromCell(position: CellPosition) {
    const cell = describeCell(model, data, position.personId, position.column);
    if (!cell) return;
    const deletable = cell.items.filter((item) => item.actions.delete);
    if (deletable.length === 1) requestDelete(deletable[0].booking);
  }

  // A click on a cell works like Enter. A click on a bar opens that booking's details,
  // for the day under the pointer.
  function onClick(event: MouseEvent) {
    if (!(event.target instanceof Element)) return;
    const bar = event.target.closest<HTMLElement>("[data-booking]");
    if (!bar) {
      const position = positionOf(event.target.closest('[role="gridcell"]'));
      if (position) activateCell(position);
      return;
    }
    // The bar lies over the day cells, so the cell under the pointer is the day clicked.
    const under = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element) => element.getAttribute("role") === "gridcell");
    const position = positionOf(under ?? null);
    if (!position) return;
    // Popups put focus back on the focused cell when they close.
    focusGridCell(position);
    setGridPopover({
      personId: position.personId,
      date: position.column,
      bookingId: bar.dataset.booking ?? null,
    });
  }

  return { activateCell, deleteFromCell, onClick };
}
