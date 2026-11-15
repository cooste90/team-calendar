import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { SignOutButton } from "@/components/sign-out-button";
import type { CalendarDate, View } from "@/domain/dates";
import { CalendarControls } from "./calendar-controls";

type Props = {
  businessUnits: { slug: string; name: string; hidden: boolean }[];
  ownBusinessUnitSlug: string;
  defaultView: View;
  today: CalendarDate;
};

// The header bar (spec §2.1), left to right. It wraps onto more lines on narrow screens.
export function AppHeader(props: Props) {
  return (
    <header className="relative z-30 flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b bg-surface px-5 py-2.5">
      {/* The logo goes back to today's period in your own BU, with no filters. */}
      <Link href="/" prefetch={false} className="mr-1 rounded-md">
        <Wordmark />
      </Link>
      <CalendarControls {...props} />
      <div className="flex-1" />
      <div className="flex flex-wrap items-center gap-2">
        {/* Still to come, left to right: Teams and People filters (T21), Key (T20),
            Export PDF (T33) and the user menu (T26), which will hold Sign out. */}
        <SignOutButton />
      </div>
    </header>
  );
}
