// Development only: sign in as any fake SSO profile (architecture §5.3). It runs the
// same syncSsoProfile as real SSO, then creates a normal Better Auth session.
import "server-only";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { devSignInEnabled } from "@/lib/env";
import { ssoProfileSchema } from "@/lib/schemas/sso-profile";
import { syncSsoProfile } from "./services/auth-sync";

const bodySchema = z.object({
  profile: ssoProfileSchema,
  requestedBusinessUnitId: idSchema.optional(),
});

export function devSignInPlugin() {
  return {
    id: "dev-sign-in",
    endpoints: {
      devSignIn: createAuthEndpoint(
        "/dev-sign-in",
        { method: "POST", body: bodySchema },
        async (ctx) => {
          // auth.ts only adds this plugin when dev sign-in is on; this is a second guard.
          if (!devSignInEnabled) {
            throw new APIError("NOT_FOUND");
          }
          const user = await syncSsoProfile(ctx.body.profile, {
            requestedBusinessUnitId: ctx.body.requestedBusinessUnitId,
          });
          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ userId: user.id });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
