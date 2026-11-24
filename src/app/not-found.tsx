import type { Metadata } from "next";
import Link from "next/link";
import { StatusPage } from "@/components/status-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found · WestCal" };

// Any address the app doesn't have, and the dev-only pages in production.
export default function NotFound() {
  return (
    <StatusPage title="Page not found">
      <p className="text-muted-foreground">
        There's nothing at this address. The link may be wrong or out of date.
      </p>
      <Button asChild size="lg" className="self-start">
        <Link href="/">Go to the calendar</Link>
      </Button>
    </StatusPage>
  );
}
