// Who is signed in. Every page, query and action calls requireUser first, and checks
// permissions with src/domain/permissions.ts; the proxy's cookie check is only a
// shortcut (architecture §5.4).
import "server-only";
import { headers } from "next/headers";
import { redirect, unauthorized } from "next/navigation";
import { cache } from "react";
import type { Actor } from "@/domain/permissions";
import { auth } from "./auth";

// The signed-in user, or null. businessUnitId is null until they choose a BU.
// cache() means one session lookup per request, however many components ask.
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { id, role, businessUnitId, teamId } = session.user;
  return { id, role, businessUnitId: businessUnitId ?? null, teamId: teamId ?? null };
});

// cache() also means every caller in a request gets the same Actor object, so queries
// cached by their arguments (getBusinessUnitBySlug, getProfile) are found again.
// No session (it has ended, or the person was deleted) shows "Your session has ended"
// in place of the page, or of a server action's result (app/unauthorized.tsx). Opening a
// page with no session cookie at all goes to /sign-in instead (the proxy does that).
export const requireUser = cache(async (): Promise<Actor> => {
  const user = await getCurrentUser();
  if (!user) {
    unauthorized();
  }
  if (!user.businessUnitId) {
    redirect("/welcome");
  }
  return { id: user.id, role: user.role, businessUnitId: user.businessUnitId, teamId: user.teamId };
});
