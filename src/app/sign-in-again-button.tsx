"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signInPageUrl } from "@/lib/callback-url";

// Signs in again and comes back to this exact page (with its dialog, BU and dates).
export function SignInAgainButton() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const here = query ? `${pathname}?${query}` : pathname;

  return (
    <Button asChild size="lg" className="self-start">
      {/* `as Route`: typed routes can't check a link built at runtime. */}
      <Link href={signInPageUrl("/sign-in", here) as Route}>Sign in again</Link>
    </Button>
  );
}
