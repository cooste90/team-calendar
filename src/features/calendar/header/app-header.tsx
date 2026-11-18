import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import type { CalendarDate, View } from "@/domain/dates";
import type { FilterOption } from "@/domain/filter-options";
import type { UserMenuDetails } from "@/server/queries/user-menu";
import { CalendarFilters } from "../filters/calendar-filters";
import { KeyPopover } from "../key/key-popover";
import { CalendarControls } from "./calendar-controls";
import { MoreMenu } from "./more-menu";
import { UserMenu } from "./user-menu";

type Props = {
  user: UserMenuDetails;
  businessUnits: { slug: string; name: string; hidden: boolean }[];
  ownBusinessUnitSlug: string;
  defaultView: View;
  today: CalendarDate;
  teamOptions: FilterOption[];
  personOptions: FilterOption[];
};

// The header bar (spec §2.1), left to right. It wraps onto more lines on narrow screens.
// It's also a CSS container: below 720px of header width (45rem), the filters and the
// Key move into the More menu.
export function AppHeader({ user, teamOptions, personOptions, ...controls }: Props) {
  return (
    <header className="@container relative z-30 flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b bg-surface px-5 py-2.5">
      {/* The logo goes back to today's period in your own BU, with no filters. */}
      <Link href="/" prefetch={false} className="mr-1 rounded-md">
        <Wordmark />
      </Link>
      <CalendarControls {...controls} />
      <div className="flex-1" />
      <div className="flex flex-wrap items-center gap-2">
        {/* Still to come: Export PDF (T33) after the Key. */}
        <div className="@min-[45rem]:flex hidden gap-2">
          <CalendarFilters teamOptions={teamOptions} personOptions={personOptions} />
          <KeyPopover />
        </div>
        <div className="@min-[45rem]:hidden">
          <MoreMenu teamOptions={teamOptions} personOptions={personOptions} />
        </div>
        {/* Always in the header, never moved into More. */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
