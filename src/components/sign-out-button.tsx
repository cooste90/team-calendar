import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/sign-out";

// A plain form, so signing out works even before JavaScript has loaded.
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline">
        Sign out
      </Button>
    </form>
  );
}
