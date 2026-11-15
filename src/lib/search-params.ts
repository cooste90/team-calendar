// The calendar's URL state (architecture §6.3), defined once. The page reads it with
// loadCalendarSearchParams; client components use the same parsers with useQueryStates.
// Imported from "nuqs/server" so this file works on the server and in the browser.
import {
  createLoader,
  createParser,
  createSerializer,
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

export const loadCalendarSearchParams = createLoader(calendarSearchParams);

// Builds a link from the current params with some changed, keeping the rest, e.g.
// serializeCalendarParams(searchParams, { person: id }) gives "?view=week&person=…".
export const serializeCalendarParams = createSerializer(calendarSearchParams);

// The cookie that remembers week or month view (set by setViewPreference).
export const VIEW_COOKIE = "westcal-view";

// Set when an unassigned person closes the "add you to a team" banner (set by
// dismissUnassignedBanner).
export const UNASSIGNED_BANNER_COOKIE = "westcal-unassigned-banner-dismissed";
