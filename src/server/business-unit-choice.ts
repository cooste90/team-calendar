// The business unit a first-time user picks on the sign-in page (spec §1.3). It's kept
// in a short-lived cookie while they go to SSO and back, and only used if the account
// is new. The value is signed with BETTER_AUTH_SECRET, so it can't be forged.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE_NAME = "westcal-requested-bu";
const TEN_MINUTES_IN_SECONDS = 10 * 60;

function signatureOf(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(payload).digest("base64url");
}

// The cookie value: "<businessUnitId>.<expiry time in ms>.<signature>".
export function signBusinessUnitChoice(businessUnitId: string, now = Date.now()) {
  const payload = `${businessUnitId}.${now + TEN_MINUTES_IN_SECONDS * 1000}`;
  return `${payload}.${signatureOf(payload)}`;
}

// The business unit id, or undefined if the value is missing, tampered with or expired.
export function readBusinessUnitChoice(value: string | undefined, now = Date.now()) {
  const [businessUnitId, expiresAt, signature] = value?.split(".") ?? [];
  if (!businessUnitId || !expiresAt || !signature) return undefined;

  const expected = Buffer.from(signatureOf(`${businessUnitId}.${expiresAt}`));
  const given = Buffer.from(signature);
  // timingSafeEqual stops an attacker guessing the signature one character at a time.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
  if (Number(expiresAt) < now) return undefined;
  return businessUnitId;
}

export async function rememberBusinessUnitChoice(businessUnitId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signBusinessUnitChoice(businessUnitId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.BETTER_AUTH_URL.startsWith("https://"),
    maxAge: TEN_MINUTES_IN_SECONDS,
    path: "/",
  });
}

// Reads the choice and clears the cookie, so it's used at most once.
export async function takeBusinessUnitChoice() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (value) {
    cookieStore.delete(COOKIE_NAME);
  }
  return readBusinessUnitChoice(value);
}
