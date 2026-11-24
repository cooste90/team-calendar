// The shapes that go into and come out of buildGridModel (grid-model.ts).

import type { AvailabilityLookup, WorkDay } from "./availability";
import type { CalendarDate, Period, View } from "./dates";
import type { PersonName } from "./display-name";
import type { Booking } from "./events";
import type { Filters } from "./filter-options";
import type { LeaveType } from "./leave-types";
import type { PublicHoliday } from "./public-holidays";
import type { Portion } from "./slots";

export type GridTeam = { id: string; name: string; sortOrder: number };
export type GridPerson = PersonName & {
  id: string;
  teamId: string | null;
  availability: AvailabilityLookup;
};
export type GridViewer = {
  id: string;
  teamId: string | null;
  canSeeUnassigned: boolean;
  canEdit: (person: GridPerson) => boolean;
};

export type GridInput = {
  view: View;
  period: Period;
  today: CalendarDate;
  viewer: GridViewer;
  teams: GridTeam[];
  people: GridPerson[];
  bookings: Booking[];
  publicHolidays: PublicHoliday[];
  collapsedTeamIds: string[];
  filters: Filters;
};

export type GridColumn = {
  date: CalendarDate;
  gridColumn: string;
  isToday: boolean;
  header: {
    weekdayShort: string;
    dayNumber: number;
    accessibleLabel: string;
    publicHolidayName: string | null;
  };
};
export type BookingSummary = { bookingId: string; type: LeaveType; portion: Portion };
export type GridCell = {
  date: CalendarDate;
  gridColumn: string;
  availability: WorkDay;
  isToday: boolean;
  bookings: BookingSummary[];
  accessibleLabel: string;
};
export type GridBar = {
  bookingId: string;
  type: LeaveType;
  code: string;
  gridColumn: string;
  label: string; // "AL", or "AL · 4 days" for a booking longer than a day
  clippedStart: boolean; // starts before the visible period
  clippedEnd: boolean; // ends after the visible period
  isHalf: boolean;
  isNarrow: boolean; // half-day bars in month view are too thin to click (see architecture §9)
  title: string;
  slotCount: number; // how many half-days the bar shows
  // The half-days inside the bar the person doesn't work, hatched under the label:
  // 0 is the bar's first visible half-day. Empty for a booking of a day or less.
  offSlots: number[];
};
export type GridRow = {
  personId: string;
  displayName: string;
  isViewer: boolean;
  canEdit: boolean;
  cells: GridCell[];
  bars: GridBar[];
};
export type GridGroup = {
  id: string;
  name: string;
  isViewerTeam: boolean;
  isUnassigned: boolean;
  memberCount: number;
  collapsed: boolean;
  rows: GridRow[];
};
export type GridModel = { columns: GridColumn[]; groups: GridGroup[] };
