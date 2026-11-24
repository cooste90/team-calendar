"use client"; // Error pages must be client components.

import Link from "next/link";
import { StatusPage } from "@/components/status-page";
import { Button } from "@/components/ui/button";

type Props = { error: unknown; retry: () => void };

// Shown when a page fails to load (a server action's errors show in its own toast or
// form instead). In production Next hides the real message, so the page shows the
// error's digest: support can find the matching server log line with it.
export default function ErrorPage({ error, retry }: Props) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <StatusPage title="Something went wrong">
      <p className="text-muted-foreground">
        The calendar couldn't load. This is usually brief, so please try again.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={retry}>
          Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Go to the calendar</Link>
        </Button>
      </div>
      {digest && (
        <p className="text-muted-foreground text-sm">
          Reference for support: <span className="font-mono">{digest}</span>
        </p>
      )}
    </StatusPage>
  );
}
