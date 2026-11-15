// The calendar's URL state (architecture §6.3), defined once. The page reads it with
// calendarSearchParamsCache; client components use the same parsers with useQueryStates.
// Imported from "nuqs/server" so this file works on the server and in the browser.
import {
  createParser,
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { isCalendarDate } from "@/domain/dates";

// A "YYYY-MM-DD" date. Anything else is ignored, as if the param weren't there.
const parseAsCalendarDate = createParser({
  parse: (value) => (isCalendarDate(value) ? value : null),
  serialize: (value: string) => value,
});

// view, date and bu have no default here: the page fills them in from the view cookie,
// today, and the person's own BU.
export const calendarSearchParams = {
  view: parseAsStringLiteral(["week", "month"] as const),
  date: parseAsCalendarDate,
  bu: parseAsString,
  teams: parseAsArrayOf(parseAsString).withDefault([]),
  people: parseAsArrayOf(parseAsString).withDefault([]),
  profile: parseAsStringLiteral(["me"] as const),
  person: parseAsString,
  admin: parseAsStringLiteral(["teams", "users", "holidays", "units"] as const),
  tab: parseAsStringLiteral(["details", "pattern", "history", "upcoming"] as const).withDefault(
    "details",
  ),
};

export const calendarSearchParamsCache = createSearchParamsCache(calendarSearchParams);

// The cookie that remembers week or month view (set by setViewPreference).
export const VIEW_COOKIE = "westcal-view";
