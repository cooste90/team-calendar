import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavigationTransitionProvider } from "../header/navigation-transition";

// What the app's layouts wrap the grid in, for component tests: tooltips, the URL state
// (onUrlUpdate reports each URL change) and the navigation transition.
export function GridTestProviders({
  children,
  onUrlUpdate,
}: {
  children: ReactNode;
  onUrlUpdate?: OnUrlUpdateFunction;
}) {
  return (
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
      <NavigationTransitionProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </NavigationTransitionProvider>
    </NuqsTestingAdapter>
  );
}
