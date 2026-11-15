"use client";

import { useQueryStates } from "nuqs";
import { SegmentedControl } from "@/components/segmented-control";
import { type CalendarDate, shiftPeriod, type View } from "@/domain/dates";
import { calendarSearchParams } from "@/lib/search-params";
import { setViewPreference } from "@/server/actions/set-view-preference";
import { BusinessUnitSwitcher } from "./business-unit-switcher";
import { useNavigationTransition } from "./navigation-transition";
import { PeriodNav } from "./period-nav";
import { useCalendarShortcuts } from "./use-calendar-shortcuts";

type Props = {
  businessUnits: { slug: string; name: string; hidden: boolean }[];
  ownBusinessUnitSlug: string;
  defaultView: View; // from the view cookie
  today: CalendarDate;
};

const VIEW_OPTIONS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

// The BU switcher, view toggle and period navigation. Each one changes the URL; with
// shallow: false the server renders the page again with the new data (architecture §6.1).
export function CalendarControls({
  businessUnits,
  ownBusinessUnitSlug,
  defaultView,
  today,
}: Props) {
  const { startTransition } = useNavigationTransition();
  const [params, setParams] = useQueryStates(calendarSearchParams, {
    shallow: false,
    startTransition,
  });
  const view = params.view ?? defaultView;
  const anchor = params.date ?? today;

  function goTo(date: CalendarDate | null) {
    setParams({ date });
  }

  // The view is also remembered in a cookie, so the next visit opens in it (spec §2.2).
  function changeView(newView: View) {
    startTransition(async () => {
      await setViewPreference(newView);
      await setParams({ view: newView });
    });
  }

  useCalendarShortcuts({
    today: () => goTo(null),
    week: () => changeView("week"),
    month: () => changeView("month"),
    previous: () => goTo(shiftPeriod(view, anchor, -1)),
    next: () => goTo(shiftPeriod(view, anchor, 1)),
  });

  return (
    <>
      <BusinessUnitSwitcher
        businessUnits={businessUnits}
        value={params.bu ?? ownBusinessUnitSlug}
        // Filters belong to one BU, so switching BU clears them.
        onChange={(slug) => setParams({ bu: slug, teams: null, people: null })}
      />
      <div className="flex-1" />
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="View"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={(value) => {
            if (value === "week" || value === "month") changeView(value);
          }}
        />
        <PeriodNav view={view} anchor={anchor} today={today} onNavigate={goTo} />
      </div>
    </>
  );
}
