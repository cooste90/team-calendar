// The one place a sign-in creates or refreshes a user (architecture §5.2). Both the
// SSO sign-in and the dev sign-in call syncSsoProfile, so they behave the same.
import "server-only";
import { randomUUID } from "node:crypto";
import { computeRole } from "@/domain/roles";
import type { Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import type { SsoProfile } from "@/lib/schemas/sso-profile";
import { db } from "../db";
import { provisionNewUser } from "./provision-new-user";

type SyncOptions = { requestedBusinessUnitId?: string };

// SSO is the source of truth for these fields, so they're refreshed at every sign-in.
// The role too: leaving the admin group removes admin rights at the next sign-in.
export async function syncSsoProfile(profile: SsoProfile, options: SyncOptions = {}) {
  const details = {
    employeeNumber: profile.employeeNumber,
    email: profile.email,
    firstName: profile.firstName,
    surname: profile.surname,
    name: `${profile.firstName} ${profile.surname}`,
    role: computeRole(profile, env),
    lastSignInAt: new Date(),
  };

  const existing = await db.user.findUnique({ where: { ssoId: profile.ssoId } });
  if (existing) {
    return db.user.update({ where: { id: existing.id }, data: details });
  }

  return db.$transaction(async (tx) => {
    const businessUnitId = await chooseBusinessUnit(tx, options.requestedBusinessUnitId);
    const user = await tx.user.create({
      data: { id: randomUUID(), ssoId: profile.ssoId, businessUnitId, ...details },
    });
    await provisionNewUser(tx, user.id);
    return user;
  });
}

// A new user joins the BU they asked for if it exists, otherwise the only BU if there
// is just one. Otherwise they have no BU yet and pick one on the welcome page.
async function chooseBusinessUnit(tx: Prisma.TransactionClient, requestedId?: string) {
  if (requestedId) {
    const requested = await tx.businessUnit.findUnique({ where: { id: requestedId } });
    if (requested) return requested.id;
  }
  const units = await tx.businessUnit.findMany({ select: { id: true }, take: 2 });
  if (units.length === 1) return units[0].id;
  return null;
}

// The welcome page: a user without a BU picks their first one. Only a super admin can
// move someone who already has a BU (spec §1.3), so this never changes an existing one.
// They start Unassigned (no team). An unknown BU id is ignored.
export async function joinFirstBusinessUnit(userId: string, businessUnitId: string) {
  const unit = await db.businessUnit.findUnique({ where: { id: businessUnitId } });
  if (!unit) return;
  await db.user.updateMany({
    where: { id: userId, businessUnitId: null },
    data: { businessUnitId },
  });
}
