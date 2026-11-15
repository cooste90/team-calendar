"use client";

import { type FocusEvent, type KeyboardEvent, useEffect, useRef } from "react";
import { type Period, shiftPeriod, type View } from "@/domain/dates";
import { type CellPosition, type GridLayout, nextCell } from "@/domain/grid-navigation";
import { useCalendarStore } from "../calendar-store";
import { useCalendarParams } from "../use-calendar-params";

type Options = {
  layout: GridLayout;
  tabStop: CellPosition | null;
  view: View;
  period: Period;
};

// Keyboard use of the grid (accessibility §3). Cells carry data-person and data-column,
// so one onKeyDown and one onFocus on the grid handle every cell. Where focus goes next
// is worked out in src/domain/grid-navigation.ts.
export function useGridKeyboard({ layout, tabStop, view, period }: Options) {
  const gridRef = useRef<HTMLDivElement>(null);
  const setFocusedCell = useCalendarStore((store) => store.setFocusedCell);
  const setShortcutsHelpOpen = useCalendarStore((store) => store.setShortcutsHelpOpen);
  const [, setParams] = useCalendarParams();
  // The grid element that last had focus.
  const lastFocused = useRef<HTMLElement | null>(null);

  function focusCell(cell: CellPosition) {
    const selector = `[data-person="${cell.personId}"][data-column="${cell.column}"]`;
    const element = gridRef.current?.querySelector<HTMLElement>(selector);
    if (!element) return;
    element.focus({ preventScroll: true });
    // scroll-padding on the scroll box keeps the cell clear of the sticky header and
    // name column (WCAG 2.4.11).
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  // A new period, a filter or fresh data can remove the focused cell, which drops focus
  // onto <body>. After each render, put it back on the tab stop instead: for a new
  // period that's the same person and weekday. Runs after every render, but only acts
  // when the last focused element has just gone.
  useEffect(() => {
    const element = lastFocused.current;
    if (!element || element.isConnected) return;
    lastFocused.current = null;
    if (tabStop && document.activeElement === document.body) focusCell(tabStop);
  });

  // Clicks and keys both end up here, so the store always knows the focused cell.
  function onFocus(event: FocusEvent<HTMLElement>) {
    const position = positionOf(event.target);
    if (!position) return;
    lastFocused.current = event.target;
    setFocusedCell(position);
  }

  function onKeyDown(event: KeyboardEvent) {
    const current = positionOf(event.target);
    if (!current) return; // e.g. a team's collapse button
    const key = event.ctrlKey ? `Ctrl${event.key}` : event.key;
    switch (key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
      case "Home":
      case "End":
      case "CtrlHome":
      case "CtrlEnd":
        focusCell(nextCell(layout, current, key));
        break;
      case "PageUp":
        setParams({ date: shiftPeriod(view, period.from, -1) });
        break;
      case "PageDown":
        setParams({ date: shiftPeriod(view, period.from, 1) });
        break;
      case "?":
        setShortcutsHelpOpen(true);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return { gridRef, onFocus, onKeyDown };
}

// Which cell an element is, from its data attributes. Null for anything else.
function positionOf(target: EventTarget): CellPosition | null {
  if (!(target instanceof HTMLElement)) return null;
  const { person, column } = target.dataset;
  if (!person || !column) return null;
  return { personId: person, column };
}
