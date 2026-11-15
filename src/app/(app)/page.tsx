import { cookies } from "next/headers";
import { SignOutButton } from "@/components/sign-out-button";
import { periodRange, todayIn } from "@/domain/dates";
import { env } from "@/lib/env";
import { calendarSearchParamsCache, VIEW_COOKIE } from "@/lib/search-params";
import { getBusinessUnitBySlug } from "@/server/queries/business-units";
import { getCalendarData } from "@/server/queries/calendar";
import { requireUser } from "@/server/session";

// The calendar. Until the grid arrives (T16) it shows raw counts, so the data loading
// can be checked.
export default async function CalendarPage({ searchParams }: PageProps<"/">) {
  const actor = await requireUser();
  const params = await calendarSearchParamsCache.parse(searchParams);

  const savedView = (await cookies()).get(VIEW_COOKIE)?.value;
  const view = params.view ?? (savedView === "month" ? "month" : "week");
  const period = periodRange(view, params.date ?? todayIn(env.APP_TIME_ZONE));
  const businessUnit = await getBusinessUnitBySlug(actor, params.bu);
  const data = await getCalendarData(actor, businessUnit, period.from, period.to);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="font-semibold text-3xl">WestCal</h1>
      <p>
        {businessUnit.name}, {period.from} to {period.to}
      </p>
      <p>
        {data.people.length} people, {data.bookings.length} bookings
      </p>
      <SignOutButton />
    </main>
  );
}
