"use client";

import { useQueryStates } from "nuqs";
import { useEffect } from "react";
import { toast } from "sonner";
import { calendarSearchParams } from "@/lib/search-params";

// The page renders this instead of the profile dialog when the URL names a profile the
// viewer can't see, or one that doesn't exist. It says so and takes the param out of the
// URL. Nothing about the person was sent to the browser.
export function ProfileNotAllowed() {
  const [, setParams] = useQueryStates(calendarSearchParams);

  useEffect(() => {
    // The id stops a second toast when React runs this twice in development.
    toast.error("You can't view that profile", { id: "profile-not-allowed" });
    setParams({ profile: null, person: null, tab: null }, { history: "replace" });
  }, [setParams]);

  return null;
}
