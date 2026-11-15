import { LiveRegion } from "@/components/live-region";
import { RefreshOnFocus } from "@/components/refresh-on-focus";
import { Toaster } from "@/components/ui/sonner";
import { todayIn } from "@/domain/dates";
import { readSavedView } from "@/features/calendar/calendar-view";
import { AppHeader } from "@/features/calendar/header/app-header";
import {
  NavigationProgress,
  NavigationTransitionProvider,
  PendingArea,
} from "@/features/calendar/header/navigation-transition";
import { env } from "@/lib/env";
import { getBusinessUnitBySlug, getVisibleBusinessUnits } from "@/server/queries/business-units";
import { requireUser } from "@/server/session";

// The signed-in part of the app: skip link, header and main area. Pages still call
// requireUser themselves, because a layout doesn't re-render on every navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const actor = await requireUser();
  const businessUnits = await getVisibleBusinessUnits(actor);
  const ownBusinessUnit = await getBusinessUnitBySlug(actor, null);

  return (
    <NavigationTransitionProvider>
      <a
        href="#main"
        className="sr-only rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to calendar
      </a>
      <AppHeader
        businessUnits={businessUnits}
        ownBusinessUnitSlug={ownBusinessUnit.slug}
        defaultView={await readSavedView()}
        today={todayIn(env.APP_TIME_ZONE)}
      />
      <NavigationProgress />
      <main id="main" className="flex flex-1 flex-col">
        <PendingArea>{children}</PendingArea>
      </main>
      <RefreshOnFocus />
      <Toaster />
      <LiveRegion />
    </NavigationTransitionProvider>
  );
}
