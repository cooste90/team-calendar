import { describe, expect, it } from "vitest";
import type { SsoProfile } from "@/lib/schemas/sso-profile";
import { syncSsoProfile } from "@/server/auth-sync";
import { db } from "@/server/db";
import { toPatternVersion } from "@/server/mappers";

const priya: SsoProfile = {
  ssoId: "sso-priya",
  employeeNumber: "200003",
  firstName: "Priya",
  surname: "Shah",
  email: "priya.shah@example.com",
  formalGroups: [],
};

describe("syncSsoProfile", () => {
  it("creates the user on the first sign-in and refreshes name and email on the next", async () => {
    const created = await syncSsoProfile(priya);
    const updated = await syncSsoProfile({
      ...priya,
      surname: "Patel",
      email: "priya.patel@example.com",
    });

    expect(updated.id).toBe(created.id);
    expect(updated).toMatchObject({
      name: "Priya Patel",
      surname: "Patel",
      email: "priya.patel@example.com",
    });
    expect(await db.user.count()).toBe(1);
  });

  it("promotes to ADMIN when the admin group is added and demotes when it's removed", async () => {
    expect((await syncSsoProfile(priya)).role).toBe("USER");
    expect((await syncSsoProfile({ ...priya, formalGroups: ["CALENDAR_ADMIN"] })).role).toBe(
      "ADMIN",
    );
    expect((await syncSsoProfile(priya)).role).toBe("USER");
  });

  it("makes a SUPER_ADMIN from the employee number allowlist", async () => {
    const user = await syncSsoProfile({ ...priya, employeeNumber: "100001" });
    expect(user.role).toBe("SUPER_ADMIN");
  });

  it("gives a new user the default working pattern", async () => {
    const user = await syncSsoProfile(priya);
    const patterns = await db.workingPattern.findMany({ where: { userId: user.id } });

    expect(patterns.map(toPatternVersion)).toEqual([
      {
        effectiveFrom: "2000-01-02",
        pattern: ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "OFF"],
      },
    ]);
  });
});

describe("a new user's business unit", () => {
  it("is the only BU when there is just one", async () => {
    const finance = await db.businessUnit.create({ data: { name: "Finance", slug: "finance" } });
    expect((await syncSsoProfile(priya)).businessUnitId).toBe(finance.id);
  });

  it("is left empty when there are several and none was requested", async () => {
    await db.businessUnit.create({ data: { name: "Finance", slug: "finance" } });
    await db.businessUnit.create({ data: { name: "Operations", slug: "operations" } });
    expect((await syncSsoProfile(priya)).businessUnitId).toBeNull();
  });

  it("is the requested BU when it exists", async () => {
    await db.businessUnit.create({ data: { name: "Finance", slug: "finance" } });
    const operations = await db.businessUnit.create({
      data: { name: "Operations", slug: "operations" },
    });
    const user = await syncSsoProfile(priya, { requestedBusinessUnitId: operations.id });
    expect(user.businessUnitId).toBe(operations.id);
  });

  it("isn't changed by a request once the user exists", async () => {
    const finance = await db.businessUnit.create({ data: { name: "Finance", slug: "finance" } });
    await syncSsoProfile(priya);
    const operations = await db.businessUnit.create({
      data: { name: "Operations", slug: "operations" },
    });

    const user = await syncSsoProfile(priya, { requestedBusinessUnitId: operations.id });
    expect(user.businessUnitId).toBe(finance.id);
  });
});
