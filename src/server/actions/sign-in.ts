"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type SsoProfile, ssoProfileSchema } from "@/lib/schemas/sso-profile";
import { auth, SSO_PROVIDER_ID } from "@/server/auth";
import { db } from "@/server/db";
import { devSsoProfiles } from "../../../prisma/seed/dev-sso-profiles";

// Starts the corporate SSO sign-in: Better Auth gives us the identity provider's URL.
export async function signInWithSso() {
  const result = await auth.api.signInSocial({
    body: { provider: SSO_PROVIDER_ID, callbackURL: "/" },
    headers: await headers(),
  });
  if (!result.url) {
    throw new Error("SSO sign-in did not return a redirect URL.");
  }
  // `as Route`: typed routes can't check an outside URL, and the docs say to cast it.
  redirect(result.url as Route);
}

// Dev sign-in as one of the listed fake profiles. A new user joins the profile's BU.
export async function signInAsDevProfile(formData: FormData) {
  const devProfile = devSsoProfiles.find((item) => item.profile.ssoId === formData.get("ssoId"));
  if (!devProfile) {
    throw new Error("Unknown dev profile.");
  }
  const businessUnit = await db.businessUnit.findUnique({
    where: { name: devProfile.businessUnit },
  });
  await devSignIn(devProfile.profile, businessUnit?.id);
}

// Dev sign-in as a profile typed into the form. Groups are comma-separated.
export async function signInAsCustomProfile(formData: FormData) {
  const groups = String(formData.get("formalGroups") ?? "").split(",");
  const profile = ssoProfileSchema.parse({
    ssoId: formData.get("ssoId"),
    employeeNumber: formData.get("employeeNumber"),
    firstName: formData.get("firstName"),
    surname: formData.get("surname"),
    email: formData.get("email"),
    formalGroups: groups.map((group) => group.trim()).filter(Boolean),
  });
  await devSignIn(profile);
}

// The endpoint refuses (404) unless dev sign-in is enabled, so this can't work in production.
async function devSignIn(profile: SsoProfile, requestedBusinessUnitId?: string) {
  await auth.api.devSignIn({
    body: { profile, requestedBusinessUnitId },
    headers: await headers(),
  });
  redirect("/");
}
