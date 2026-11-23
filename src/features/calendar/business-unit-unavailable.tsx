"use client";

import { useQueryStates } from "nuqs";
import { useEffect } from "react";
import { toast } from "sonner";
import { calendarSearchParams } from "@/lib/search-params";

// The page renders this when the URL names a BU the viewer can't see (hidden from them,
// deleted or mistyped), and shows their own BU instead (spec §1.3). It says so and takes
// the BU, and the filters that belonged to it, out of the URL.
export function BusinessUnitUnavailable() {
  const [, setParams] = useQueryStates(calendarSearchParams);

  useEffect(() => {
    // The id stops a second toast when React runs this twice in development.
    toast.error("This business unit is no longer available", { id: "business-unit-unavailable" });
    setParams({ bu: null, teams: null, people: null }, { history: "replace" });
  }, [setParams]);

  return null;
}
