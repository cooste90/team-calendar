// The Better Auth instance (architecture §5). People sign in with corporate SSO, or
// with the dev sign-in locally. There are no passwords.
import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { devSignInEnabled, env, ssoConfigured } from "@/lib/env";
import { takeBusinessUnitChoice } from "./business-unit-choice";
import { db } from "./db";
import { devSignInPlugin } from "./dev-sign-in-plugin";
import { syncSsoProfile } from "./services/auth-sync";
import { mapSsoClaims } from "./sso-claims";

export const SSO_PROVIDER_ID = "sso";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  // syncSsoProfile creates the user before Better Auth looks for them, so Better Auth
  // links the SSO account to that user instead of trying to create one itself.
  account: { accountLinking: { trustedProviders: [SSO_PROVIDER_ID] } },
  user: {
    // WestCal columns that the session should include. Only the server sets them.
    additionalFields: {
      role: { type: ["USER", "ADMIN", "SUPER_ADMIN"], input: false },
      businessUnitId: { type: "string", required: false, input: false },
      teamId: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 12 * 60 * 60, // 12 hours, in seconds
    // Never extend a session: everyone signs in again within a working day, and that
    // is when their role is recomputed (spec §1.2).
    disableSessionRefresh: true,
  },
  plugins: [
    ...(ssoConfigured ? [ssoPlugin()] : []),
    // Not there at all in production, so its endpoint is a plain 404 (T36).
    ...(devSignInEnabled ? [devSignInPlugin()] : []),
    nextCookies(), // must be the last plugin
  ],
});

function ssoPlugin() {
  return genericOAuth({
    config: [
      {
        providerId: SSO_PROVIDER_ID,
        discoveryUrl: env.SSO_DISCOVERY_URL,
        clientId: env.SSO_CLIENT_ID ?? "",
        clientSecret: env.SSO_CLIENT_SECRET,
        scopes: env.SSO_SCOPES.split(" "),
        pkce: true,
        // Runs on every SSO sign-in, before the session is created: refresh the user
        // (and their role) from the claims, then tell Better Auth who they are.
        mapProfileToUser: async (claims) => {
          const user = await syncSsoProfile(mapSsoClaims(claims), {
            requestedBusinessUnitId: await takeBusinessUnitChoice(),
          });
          return { name: user.name, email: user.email, emailVerified: true };
        },
      },
    ],
  });
}
