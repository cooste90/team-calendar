import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { safeCallbackUrl } from "@/lib/callback-url";
import { devSignInEnabled, ssoConfigured } from "@/lib/env";
import { goToDevSignIn, signInWithSso } from "@/server/actions/sign-in";
import { listBusinessUnits } from "@/server/queries/business-units";

export const metadata: Metadata = { title: "Sign in · WestCal" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  // Render on each request, not at build time: whether SSO is set up comes from the
  // server's environment, which can differ from the machine that built the app.
  await connection();
  const businessUnits = await listBusinessUnits();
  // Where to go afterwards, e.g. the page whose session ended.
  const callbackUrl = safeCallbackUrl((await searchParams).callbackURL);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo size={56} />
        <p className="font-bold text-2xl tracking-[-0.02em]">WestCal</p>
        <p className="text-muted-foreground">See who's in, at a glance.</p>
      </div>

      <form className="flex w-full max-w-sm flex-col gap-4 rounded-dialog border bg-surface p-6 shadow-popover">
        <h1 className="font-semibold text-xl">Sign in to WestCal</h1>
        <input type="hidden" name="callbackURL" value={callbackUrl} />

        {/* Only asked when there's a choice to make. Returning users can ignore it. */}
        {businessUnits.length > 1 && (
          <Field>
            <FieldLabel htmlFor="businessUnitId">
              First time here? Which business unit do you belong to?
            </FieldLabel>
            <select
              id="businessUnitId"
              name="businessUnitId"
              aria-describedby="businessUnitId-help"
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 dark:bg-input/30"
            >
              <option value="">Choose your business unit</option>
              {businessUnits.map((businessUnit) => (
                <option key={businessUnit.id} value={businessUnit.id}>
                  {businessUnit.name}
                </option>
              ))}
            </select>
            <FieldDescription id="businessUnitId-help">
              Only used the first time you sign in.
            </FieldDescription>
          </Field>
        )}

        <Button
          type="submit"
          size="lg"
          formAction={signInWithSso}
          disabled={!ssoConfigured}
          aria-describedby={ssoConfigured ? undefined : "sso-note"}
        >
          Sign in with SSO
        </Button>
        {!ssoConfigured && (
          <p id="sso-note" className="text-muted-foreground text-sm">
            SSO isn't set up on this server yet, so this button is turned off.
          </p>
        )}
        {devSignInEnabled && (
          <Button type="submit" variant="link" formAction={goToDevSignIn}>
            Developer sign-in
          </Button>
        )}
      </form>
      <Link href="/accessibility" className="text-muted-foreground text-sm underline">
        Accessibility statement
      </Link>
    </main>
  );
}
