"use client";

import { useQueryStates } from "nuqs";
import { calendarSearchParams } from "@/lib/search-params";
import { useNavigationTransition } from "./header/navigation-transition";

// The calendar's URL params for client components. A change re-renders the page on the
// server with the new data (shallow: false), inside the shared navigation transition, so
// the progress bar shows while it loads (architecture §6.1).
export function useCalendarParams() {
  const { startTransition } = useNavigationTransition();
  return useQueryStates(calendarSearchParams, { shallow: false, startTransition });
}

// The team and person filters. The page already has everyone in the BU, so a filter
// change only updates the URL and redraws the grid here, without asking the server
// again. That keeps it instant even with 300 people (T21).
const filterParams = { teams: calendarSearchParams.teams, people: calendarSearchParams.people };

export function useCalendarFilters() {
  return useQueryStates(filterParams);
}
