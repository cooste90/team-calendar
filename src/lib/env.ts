import { z } from "zod";

// Server environment variables, checked once when the app starts so a missing or
// wrong value fails loudly instead of causing odd bugs later. See .env.example.
const envSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_TEST: z.url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  ADMIN_GROUP_NAME: z.string().default("CALENDAR_ADMIN"),
  // A comma-separated list in the env file, e.g. "100001,100002".
  SUPER_ADMIN_EMPLOYEE_NUMBERS: z
    .string()
    .default("")
    .transform((list) =>
      list
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  DEV_SIGN_IN_ENABLED: z.stringbool().default(false),
  // Optional until the app is connected to corporate SSO (see docs/PORTING-SSO.md).
  SSO_DISCOVERY_URL: z.url().optional(),
  SSO_CLIENT_ID: z.string().optional(),
  SSO_CLIENT_SECRET: z.string().optional(),
  SSO_SCOPES: z.string().default("openid profile email"),
  APP_TIME_ZONE: z.string().default("Europe/London"),
  // Set to "query" to print every SQL query Prisma runs.
  PRISMA_LOG: z.enum(["query"]).optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid environment variables. Compare your .env file with .env.example.\n${z.prettifyError(result.error)}`,
  );
}

export const env = result.data;

// The fake sign-in is never available in a production build, even if the flag is set.
export const devSignInEnabled = env.DEV_SIGN_IN_ENABLED && process.env.NODE_ENV !== "production";

// SSO is switched on by setting all three variables (see docs/PORTING-SSO.md).
export const ssoConfigured = Boolean(
  env.SSO_DISCOVERY_URL && env.SSO_CLIENT_ID && env.SSO_CLIENT_SECRET,
);
