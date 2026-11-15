import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { serializeCalendarParams } from "@/lib/search-params";

// Shown when a business unit has no teams yet. Admins get a link to create one.
export function NoTeamsMessage({ canManage }: { canManage: boolean }) {
  const searchParams = useSearchParams();
  const adminTeamsHref = `/${serializeCalendarParams(searchParams, { admin: "teams" })}` as Route;

  return (
    <div className="mx-5 mb-3 rounded-2xl border bg-surface px-6 py-8 text-center">
      <p className="font-semibold">This business unit doesn't have any teams yet.</p>
      {canManage ? (
        <p className="mt-1 text-muted-foreground text-sm">
          Create the first one in{" "}
          <Link href={adminTeamsHref} scroll={false} className="text-primary underline">
            Admin › Teams
          </Link>
          .
        </p>
      ) : (
        <p className="mt-1 text-muted-foreground text-sm">An admin will set them up soon.</p>
      )}
    </div>
  );
}
