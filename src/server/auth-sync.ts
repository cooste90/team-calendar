// The one place a sign-in creates or refreshes a user (architecture §5.2). Both the
// SSO sign-in and the dev sign-in call syncSsoProfile, so they behave the same.
import "server-only";
import { randomUUID } from "node:crypto";
import { DEFAULT_PATTERN, DEFAULT_PATTERN_EFFECTIVE_FROM } from "@/domain/availability";
import { toDbDate } from "@/domain/dates";
import { computeRole } from "@/domain/roles";
import type { Prisma } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import type { SsoProfile } from "@/lib/schemas/sso-profile";
import { db } from "./db";
import { toPatternColumns } from "./mappers";

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
// is just one. Otherwise they have no BU yet and pick one on the welcome page (T12).
async function chooseBusinessUnit(tx: Prisma.TransactionClient, requestedId?: string) {
  if (requestedId) {
    const requested = await tx.businessUnit.findUnique({ where: { id: requestedId } });
    if (requested) return requested.id;
  }
  const units = await tx.businessUnit.findMany({ select: { id: true }, take: 2 });
  if (units.length === 1) return units[0].id;
  return null;
}

// Everything a brand-new user starts with. T12 adds their future public holidays.
async function provisionNewUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.workingPattern.create({
    data: {
      userId,
      effectiveFrom: toDbDate(DEFAULT_PATTERN_EFFECTIVE_FROM),
      ...toPatternColumns(DEFAULT_PATTERN),
    },
  });
}
