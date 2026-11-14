import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Welcome · WestCal" };

// Where requireUser sends someone who has no business unit yet.
// A placeholder until T12 adds the "Choose your business unit" form.
export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <h1 className="font-semibold text-2xl">Welcome to WestCal</h1>
      <p>You're not in a business unit yet. Ask an admin to add you.</p>
      <SignOutButton />
    </main>
  );
}
