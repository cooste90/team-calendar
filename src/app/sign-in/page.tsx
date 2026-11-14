import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { devSignInEnabled, ssoConfigured } from "@/lib/env";
import { signInWithSso } from "@/server/actions/sign-in";

export const metadata: Metadata = { title: "Sign in · WestCal" };

// Minimal for now. T12 adds the brand design and the business unit choice.
export default async function SignInPage() {
  // Render on each request, not at build time: whether SSO is set up comes from the
  // server's environment, which can differ from the machine that built the app.
  await connection();

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-dialog border bg-surface p-6">
        <h1 className="font-semibold text-2xl">Sign in to WestCal</h1>
        <form action={signInWithSso}>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!ssoConfigured}
            aria-describedby={ssoConfigured ? undefined : "sso-note"}
          >
            Sign in with SSO
          </Button>
        </form>
        {!ssoConfigured && (
          <p id="sso-note" className="text-muted-foreground text-sm">
            SSO isn't set up on this server yet, so this button is turned off.
          </p>
        )}
        {devSignInEnabled && (
          <Link href="/dev-sign-in" className="text-primary text-sm underline underline-offset-4">
            Developer sign-in
          </Link>
        )}
      </div>
    </main>
  );
}
