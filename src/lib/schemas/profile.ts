// What the profile's Details form accepts (spec §7). The form checks with it before
// sending, and the server action checks again.
import { z } from "zod";

const PREFERRED_NAME_MAX_LENGTH = 40;

// Optional. Letters in any alphabet (with accents), spaces, hyphens and apostrophes.
// An empty value clears it, so the SSO first name shows again.
export const preferredNameSchema = z
  .string()
  .trim()
  .max(
    PREFERRED_NAME_MAX_LENGTH,
    `Preferred first name can be up to ${PREFERRED_NAME_MAX_LENGTH} characters.`,
  )
  .regex(
    /^[\p{L}\p{M}' ’-]*$/u,
    "Preferred first name can only use letters, spaces, hyphens and apostrophes.",
  )
  .transform((name) => (name === "" ? null : name));
