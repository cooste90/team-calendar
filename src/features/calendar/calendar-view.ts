// Which view and period the calendar page shows: from the URL, else the saved view
// (cookie) and today (spec §2.2). Shared by the page and its browser tab title.
import "server-only";
import { cookies } from "next/headers";
import { periodRange, todayIn, type View } from "@/domain/dates";
import { env } from "@/lib/env";
import { loadCalendarSearchParams, VIEW_COOKIE } from "@/lib/search-params";

export async function readSavedView(): Promise<View> {
  const saved = (await cookies()).get(VIEW_COOKIE)?.value;
  return saved === "month" ? "month" : "week";
}

export async function resolveCalendarView(searchParams: PageProps<"/">["searchParams"]) {
  const params = await loadCalendarSearchParams(searchParams);
  const view = params.view ?? (await readSavedView());
  const period = periodRange(view, params.date ?? todayIn(env.APP_TIME_ZONE));
  return { params, view, period };
}
