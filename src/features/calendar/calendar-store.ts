import { create } from "zustand";
import type { CellPosition } from "@/domain/grid-navigation";

// The calendar's one client-side store (architecture §1) for UI state that several
// components share. Data from the server never goes in here. Later tasks add the open
// booking dialog and the last-created booking.
type CalendarStore = {
  // The latest message for screen readers, read out by <LiveRegion />.
  announcement: string;
  announce: (message: string) => void;
  // The grid cell that last had keyboard focus. The grid keeps it up to date; T25 uses
  // it to put focus back after a dialog closes.
  focusedCell: CellPosition | null;
  setFocusedCell: (cell: CellPosition) => void;
  // The keyboard shortcuts dialog, opened with "?" in the grid or from the Key (T20).
  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;
};

export const useCalendarStore = create<CalendarStore>((set) => ({
  announcement: "",
  announce: (message) => set({ announcement: message }),
  focusedCell: null,
  setFocusedCell: (cell) => set({ focusedCell: cell }),
  shortcutsHelpOpen: false,
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
}));
