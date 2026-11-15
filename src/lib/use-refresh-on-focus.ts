"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Shows other people's changes when you come back to the tab (spec §2.5): the server
// components load fresh data. There's no polling.
export function useRefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);
}
