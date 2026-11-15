"use client";

import { cn } from "cn";
import {
  createContext,
  type ReactNode,
  type TransitionStartFunction,
  use,
  useTransition,
} from "react";

// The header's controls change the URL inside this one transition (architecture §6.1).
// While the server loads the new period, a thin bar shows under the header and the page
// is dimmed, so it's clear something is happening.
type NavigationTransition = { isPending: boolean; startTransition: TransitionStartFunction };

const NavigationTransitionContext = createContext<NavigationTransition | null>(null);

export function NavigationTransitionProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <NavigationTransitionContext value={{ isPending, startTransition }}>
      {children}
    </NavigationTransitionContext>
  );
}

export function useNavigationTransition() {
  const transition = use(NavigationTransitionContext);
  if (!transition) {
    throw new Error("useNavigationTransition needs a NavigationTransitionProvider around it.");
  }
  return transition;
}

export function NavigationProgress() {
  const { isPending } = useNavigationTransition();
  return (
    <div
      aria-hidden="true"
      className={cn("h-0.5", isPending && "animate-pulse bg-primary-solid")}
    />
  );
}

export function PendingArea({ children }: { children: ReactNode }) {
  const { isPending } = useNavigationTransition();
  return (
    <div
      aria-busy={isPending}
      className={cn("flex flex-1 flex-col transition-opacity", isPending && "opacity-60")}
    >
      {children}
    </div>
  );
}
