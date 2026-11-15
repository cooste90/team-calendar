"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type SsoProfile, ssoProfileSchema } from "@/lib/schemas/sso-profile";
import { auth, SSO_PROVIDER_ID } from "@/server/auth";
import { rememberBusinessUnitChoice, takeBusinessUnitChoice } from "@/server/business-unit-choice";
import { findBusinessUnitIdByName } from "@/server/queries/business-units";
import { devSsoProfiles } from "../../../prisma/seed/dev-sso-profiles";

// The sign-in page's "Sign in with SSO" button. Better Auth gives us the identity
// provider's URL; the BU choice waits in a cookie until the user comes back.
export async function signInWithSso(formData: FormData) {
  await rememberChoiceFrom(formData);
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

// The sign-in page's "Developer sign-in" button: same BU choice, then the dev page.
export async function goToDevSignIn(formData: FormData) {
  await rememberChoiceFrom(formData);
  redirect("/dev-sign-in");
}

async function rememberChoiceFrom(formData: FormData) {
  const businessUnitId = formData.get("businessUnitId");
  if (typeof businessUnitId === "string" && businessUnitId !== "") {
    await rememberBusinessUnitChoice(businessUnitId);
  }
}

// Dev sign-in as one of the listed fake profiles. Unless a BU was chosen on the sign-in
// page, a new user joins the profile's BU.
export async function signInAsDevProfile(formData: FormData) {
  const devProfile = devSsoProfiles.find((item) => item.profile.ssoId === formData.get("ssoId"));
  if (!devProfile) {
    throw new Error("Unknown dev profile.");
  }
  let businessUnitId: string | undefined;
  if (devProfile.businessUnit) {
    businessUnitId = await findBusinessUnitIdByName(devProfile.businessUnit);
  }
  await devSignIn(devProfile.profile, businessUnitId);
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
async function devSignIn(profile: SsoProfile, profileBusinessUnitId?: string) {
  const chosenOnSignInPage = await takeBusinessUnitChoice();
  await auth.api.devSignIn({
    body: { profile, requestedBusinessUnitId: chosenOnSignInPage ?? profileBusinessUnitId },
    headers: await headers(),
  });
  redirect("/");
}
