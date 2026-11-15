import type { Metadata } from "next";
import { formatDocumentTitlePeriod, formatPeriodTitle } from "@/domain/format";
import { resolveCalendarView } from "@/features/calendar/calendar-view";
import { CalendarGrid } from "@/features/calendar/grid/calendar-grid";
import { getBusinessUnitBySlug } from "@/server/queries/business-units";
import { getCalendarData } from "@/server/queries/calendar";
import { requireUser } from "@/server/session";

// e.g. "Week of 8 Nov 2026 · West Operations · WestCal" (accessibility §1).
export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const actor = await requireUser();
  const { params, view, period } = await resolveCalendarView(searchParams);
  const businessUnit = await getBusinessUnitBySlug(actor, params.bu);
  return {
    title: `${formatDocumentTitlePeriod(view, period.from)} · ${businessUnit.name} · WestCal`,
  };
}

// The calendar. The data is loaded here on the server, so the first paint already
// shows the grid (architecture §6.1).
export default async function CalendarPage({ searchParams }: PageProps<"/">) {
  const actor = await requireUser();
  const { params, view, period } = await resolveCalendarView(searchParams);
  const businessUnit = await getBusinessUnitBySlug(actor, params.bu);
  const data = await getCalendarData(actor, businessUnit, period.from, period.to);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-5 pt-[1.125rem] pb-3">
        <h1 className="font-[650] text-[1.3125rem] tracking-[-0.015em]">
          {formatPeriodTitle(view, period)}
        </h1>
        {/* T21 replaces "all teams · all people" with a summary of the filters. */}
        <p className="text-muted-foreground text-sm">
          {businessUnit.name} · all teams · all people
        </p>
      </div>
      <CalendarGrid
        data={data}
        view={view}
        period={period}
        filters={{ teamIds: params.teams, personIds: params.people }}
      />
    </>
  );
}
