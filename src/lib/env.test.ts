import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts checks process.env when it's first imported, so each test sets the
// variables and then imports a fresh copy of the module.
async function loadEnv(vars: Record<string, string | undefined>) {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://westcal:westcal@localhost:5432/westcal");
  vi.stubEnv("BETTER_AUTH_SECRET", "a-secret-that-is-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  for (const [name, value] of Object.entries(vars)) {
    vi.stubEnv(name, value);
  }
  return await import("./env");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("env", () => {
  it("reads super admin employee numbers as a trimmed list", async () => {
    const { env } = await loadEnv({ SUPER_ADMIN_EMPLOYEE_NUMBERS: "100001, 100002,," });
    expect(env.SUPER_ADMIN_EMPLOYEE_NUMBERS).toEqual(["100001", "100002"]);
  });

  it("uses the documented defaults when optional variables are missing", async () => {
    const { env } = await loadEnv({ DEV_SIGN_IN_ENABLED: undefined, APP_TIME_ZONE: undefined });
    expect(env.DEV_SIGN_IN_ENABLED).toBe(false);
    expect(env.APP_TIME_ZONE).toBe("Europe/London");
    expect(env.ADMIN_GROUP_NAME).toBe("CALENDAR_ADMIN");
  });

  it("throws a readable error naming each missing required variable", async () => {
    await expect(loadEnv({ DATABASE_URL: undefined })).rejects.toThrow(/DATABASE_URL/);
  });

  it("rejects an auth secret shorter than 32 characters", async () => {
    await expect(loadEnv({ BETTER_AUTH_SECRET: "too-short" })).rejects.toThrow(/32 characters/);
  });
});

describe("dev sign-in guard", () => {
  it.each([
    { flag: "true", nodeEnv: "development", enabled: true },
    { flag: "false", nodeEnv: "development", enabled: false },
    { flag: "true", nodeEnv: "production", enabled: false },
  ])("DEV_SIGN_IN_ENABLED=$flag with NODE_ENV=$nodeEnv: enabled is $enabled", async ({
    flag,
    nodeEnv,
    enabled,
  }) => {
    const { devSignInEnabled } = await loadEnv({ DEV_SIGN_IN_ENABLED: flag, NODE_ENV: nodeEnv });
    expect(devSignInEnabled).toBe(enabled);
  });
});
