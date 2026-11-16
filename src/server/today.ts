// Today's date where the app runs (Europe/London unless APP_TIME_ZONE says otherwise).
// Every time rule (spec §5.4) is judged against this, worked out on the server.
import "server-only";
import { type CalendarDate, todayIn } from "@/domain/dates";
import { env } from "@/lib/env";

export function serverToday(): CalendarDate {
  return todayIn(env.APP_TIME_ZONE);
}
