// Who is signed in. Every page, query and action calls requireUser (or requireRole)
// first; the proxy's cookie check is only a shortcut (architecture §5.4).
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ForbiddenError } from "@/domain/errors";
import type { Actor, Role } from "@/domain/permissions";
import { auth } from "./auth";

// The signed-in user, or null. businessUnitId is null until they choose a BU.
// cache() means one session lookup per request, however many components ask.
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { id, role, businessUnitId, teamId } = session.user;
  return { id, role, businessUnitId: businessUnitId ?? null, teamId: teamId ?? null };
});

export async function requireUser(): Promise<Actor> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  if (!user.businessUnitId) {
    redirect("/welcome");
  }
  return { id: user.id, role: user.role, businessUnitId: user.businessUnitId, teamId: user.teamId };
}

export async function requireRole(...roles: Role[]): Promise<Actor> {
  const actor = await requireUser();
  if (!roles.includes(actor.role)) {
    throw new ForbiddenError("You don't have permission to do that.");
  }
  return actor;
}
