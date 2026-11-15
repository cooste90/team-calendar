import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { joinBusinessUnit } from "@/server/actions/join-business-unit";
import { listBusinessUnits } from "@/server/queries/business-units";
import { joinFirstBusinessUnit } from "@/server/services/auth-sync";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Choose your business unit · WestCal" };

// Where requireUser sends a first-time user who has no business unit yet (spec §1.3).
export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  if (user.businessUnitId) {
    redirect("/");
  }

  const businessUnits = await listBusinessUnits();
  // Nothing to choose: put them in the only BU and carry on.
  if (businessUnits.length === 1) {
    await joinFirstBusinessUnit(user.id, businessUnits[0].id);
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-dialog border bg-surface p-6 shadow-popover">
        <h1 className="font-semibold text-xl">Choose your business unit</h1>
        {businessUnits.length === 0 ? (
          <p>There are no business units yet. Ask a super admin to create one.</p>
        ) : (
          <form action={joinBusinessUnit} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2">Which business unit do you belong to?</legend>
              {/* No default: a wrong pick can only be undone by a super admin. */}
              {businessUnits.map((businessUnit) => (
                <label key={businessUnit.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="businessUnitId"
                    value={businessUnit.id}
                    required
                    className="size-4 accent-primary-solid"
                  />
                  {businessUnit.name}
                </label>
              ))}
            </fieldset>
            <Button type="submit" size="lg">
              Continue
            </Button>
          </form>
        )}
        <SignOutButton />
      </div>
    </main>
  );
}
