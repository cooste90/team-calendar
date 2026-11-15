import { LiveRegion } from "@/components/live-region";
import { RefreshOnFocus } from "@/components/refresh-on-focus";
import { Toaster } from "@/components/ui/sonner";
import { CALENDAR_FOCUS_ID } from "@/features/calendar/grid/grid-cell";
import { NavigationTransitionProvider } from "@/features/calendar/header/navigation-transition";
import { requireUser } from "@/server/session";

// The signed-in part of the app: the skip link, toasts and screen-reader messages. The
// page renders the header itself, because the filters in it need the page's data (T21).
// Pages still call requireUser themselves, because a layout doesn't re-render on every
// navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();

  return (
    <NavigationTransitionProvider>
      <a
        href={`#${CALENDAR_FOCUS_ID}`}
        className="sr-only rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to calendar
      </a>
      {children}
      <RefreshOnFocus />
      <Toaster />
      <LiveRegion />
    </NavigationTransitionProvider>
  );
}
