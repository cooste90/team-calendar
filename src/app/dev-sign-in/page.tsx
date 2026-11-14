import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { computeRole } from "@/domain/roles";
import { devSignInEnabled, env } from "@/lib/env";
import { signInAsDevProfile } from "@/server/actions/sign-in";
import { devSsoProfiles } from "../../../prisma/seed/dev-sso-profiles";
import { CustomProfileForm } from "./custom-profile-form";

export const metadata: Metadata = { title: "Developer sign-in · WestCal" };

// Sign in as a fake SSO profile (architecture §5.3). Hidden unless dev sign-in is enabled.
export default function DevSignInPage() {
  if (!devSignInEnabled) {
    notFound();
  }
  const businessUnits = [...new Set(devSsoProfiles.map((item) => item.businessUnit))];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <p
        role="note"
        className="rounded-md border border-warning-border bg-warning-bg p-3 font-medium text-warning-fg"
      >
        Development only. This page doesn't exist in production.
      </p>
      <h1 className="font-semibold text-2xl">Developer sign-in</h1>

      {businessUnits.map((businessUnit) => (
        <section key={businessUnit} className="flex flex-col gap-2">
          <h2 className="font-semibold text-lg">{businessUnit}</h2>
          <ul className="flex flex-col gap-2">
            {devSsoProfiles
              .filter((item) => item.businessUnit === businessUnit)
              .map(({ profile, team }) => (
                <li key={profile.ssoId}>
                  <form action={signInAsDevProfile} className="flex items-center gap-3">
                    <input type="hidden" name="ssoId" value={profile.ssoId} />
                    <Button type="submit" variant="outline">
                      Sign in as {profile.firstName} {profile.surname}
                    </Button>
                    <Badge variant="secondary">{computeRole(profile, env)}</Badge>
                    <span className="text-muted-foreground text-sm">{team ?? "Unassigned"}</span>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <CustomProfileForm />
    </main>
  );
}
