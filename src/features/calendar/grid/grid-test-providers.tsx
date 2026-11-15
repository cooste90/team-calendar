import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavigationTransitionProvider } from "../header/navigation-transition";

// What the app's layouts wrap the grid in, for component tests: tooltips, the URL state
// (searchParams is the starting URL, onUrlUpdate reports each change) and the navigation
// transition.
export function GridTestProviders({
  children,
  searchParams,
  onUrlUpdate,
}: {
  children: ReactNode;
  searchParams?: Record<string, string>;
  onUrlUpdate?: OnUrlUpdateFunction;
}) {
  return (
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <NavigationTransitionProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </NavigationTransitionProvider>
    </NuqsTestingAdapter>
  );
}
