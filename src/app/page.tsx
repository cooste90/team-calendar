import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/server/session";

// The calendar will live here (T15 onwards). For now it proves you're signed in.
export default async function Home() {
  await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="font-semibold text-3xl">WestCal</h1>
      <SignOutButton />
    </main>
  );
}
