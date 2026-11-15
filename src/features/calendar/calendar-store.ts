import { create } from "zustand";

// The calendar's one client-side store (architecture §1) for UI state that several
// components share. Data from the server never goes in here. Later tasks add the
// focused cell, the open booking dialog and the last-created booking.
type CalendarStore = {
  // The latest message for screen readers, read out by <LiveRegion />.
  announcement: string;
  announce: (message: string) => void;
};

export const useCalendarStore = create<CalendarStore>((set) => ({
  announcement: "",
  announce: (message) => set({ announcement: message }),
}));
