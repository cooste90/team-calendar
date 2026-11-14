// Turns the identity provider's claims into an SsoProfile. When WestCal is connected
// to the corporate SSO, this is the one function to change (see docs/PORTING-SSO.md).
import "server-only";
import { z } from "zod";
import type { SsoProfile } from "@/lib/schemas/sso-profile";

// Placeholder claim names, agreed with the product owner until the real IdP is known.
const claimsSchema = z.object({
  id: z.string().min(1),
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  surname: z.string().min(1),
  email: z.email(),
  formalGroups: z.array(z.string()).default([]),
});

export function mapSsoClaims(claims: unknown): SsoProfile {
  const result = claimsSchema.safeParse(claims);
  if (!result.success) {
    throw new Error(`The SSO claims are missing or invalid:\n${z.prettifyError(result.error)}`);
  }
  const { id, ...rest } = result.data;
  return { ssoId: id, ...rest };
}
