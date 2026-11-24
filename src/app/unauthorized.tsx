import type { Metadata } from "next";
import { StatusPage } from "@/components/status-page";
import { SignInAgainButton } from "./sign-in-again-button";

export const metadata: Metadata = { title: "Your session has ended · WestCal" };

// requireUser calls unauthorized() when the session has gone, whether on a page load or
// while saving something (architecture §5.4). Sessions last 12 hours and never extend.
export default function Unauthorized() {
  return (
    <StatusPage title="Your session has ended">
      <p className="text-muted-foreground">
        For security you're signed out after 12 hours. Sign in again to carry on where you left off.
      </p>
      <SignInAgainButton />
    </StatusPage>
  );
}
