import { z } from "zod";

// What WestCal needs to know about a person from SSO (spec §1.1). Real SSO claims are
// turned into this by mapSsoClaims; the dev sign-in sends it directly.
export const ssoProfileSchema = z.object({
  ssoId: z.string().trim().min(1),
  employeeNumber: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  surname: z.string().trim().min(1),
  email: z.email(),
  formalGroups: z.array(z.string()),
});

export type SsoProfile = z.infer<typeof ssoProfileSchema>;
