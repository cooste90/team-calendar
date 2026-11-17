import { create } from "zustand";
import type { CalendarDate } from "@/domain/dates";
import type { CellPosition } from "@/domain/grid-navigation";
import type { Portion } from "@/domain/slots";

// What the booking form is open for: a new booking for a person on a date (the whole
// day unless "Add to morning / afternoon" chose a half), or an existing booking.
export type EventDialogTarget =
  | { mode: "create"; subjectId: string; date: CalendarDate; portion?: Portion }
  | { mode: "edit"; bookingId: string };

// The popover on a grid cell: the cell menu (bookingId null) or one booking's details.
export type GridPopoverTarget = { personId: string; date: CalendarDate; bookingId: string | null };

// The calendar's one client-side store (architecture §1) for UI state that several
// components share. Data from the server never goes in here, only ids.
type CalendarStore = {
  // The latest message for screen readers, read out by <LiveRegion />.
  announcement: string;
  announce: (message: string) => void;
  // The grid cell that last had keyboard focus. The grid keeps it up to date; popups put
  // focus back on it when they close.
  focusedCell: CellPosition | null;
  setFocusedCell: (cell: CellPosition) => void;
  // The keyboard shortcuts dialog, opened with "?" in the grid or from the Key (T20).
  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;
  // The booking form (T24), or null when it's closed.
  eventDialog: EventDialogTarget | null;
  setEventDialog: (target: EventDialogTarget | null) => void;
  // The cell menu or booking details (T25), or null when closed.
  gridPopover: GridPopoverTarget | null;
  setGridPopover: (target: GridPopoverTarget | null) => void;
  // A booking over several days waiting for "Delete …?" to be confirmed, or null.
  deleteConfirmId: string | null;
  setDeleteConfirmId: (bookingId: string | null) => void;
  // The booking just added, so its bar grows into place once (design system §6).
  lastCreatedId: string | null;
  setLastCreatedId: (bookingId: string | null) => void;
};

export const useCalendarStore = create<CalendarStore>((set) => ({
  announcement: "",
  announce: (message) => set({ announcement: message }),
  focusedCell: null,
  setFocusedCell: (cell) => set({ focusedCell: cell }),
  shortcutsHelpOpen: false,
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
  eventDialog: null,
  setEventDialog: (target) => set({ eventDialog: target }),
  gridPopover: null,
  setGridPopover: (target) => set({ gridPopover: target }),
  deleteConfirmId: null,
  setDeleteConfirmId: (bookingId) => set({ deleteConfirmId: bookingId }),
  lastCreatedId: null,
  setLastCreatedId: (bookingId) => set({ lastCreatedId: bookingId }),
}));
