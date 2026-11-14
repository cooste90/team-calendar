import { beforeEach, expect, it } from "vitest";
import type { SsoProfile } from "@/lib/schemas/sso-profile";
import { syncSsoProfile } from "@/server/auth-sync";
import { readBusinessUnitChoice, signBusinessUnitChoice } from "@/server/business-unit-choice";
import { db } from "@/server/db";

const newcomer: SsoProfile = {
  ssoId: "sso-new",
  employeeNumber: "400004",
  firstName: "Sam",
  surname: "Lee",
  email: "sam.lee@example.com",
  formalGroups: [],
};

const ELEVEN_MINUTES = 11 * 60 * 1000;
let financeId = "";
let operationsId = "";

// Two BUs, so nobody is placed automatically.
beforeEach(async () => {
  financeId = (await db.businessUnit.create({ data: { name: "Finance", slug: "finance" } })).id;
  operationsId = (
    await db.businessUnit.create({ data: { name: "Operations", slug: "operations" } })
  ).id;
});

it("a new user with a valid choice cookie joins that BU", async () => {
  const requested = readBusinessUnitChoice(signBusinessUnitChoice(operationsId));
  const user = await syncSsoProfile(newcomer, { requestedBusinessUnitId: requested });
  expect(user.businessUnitId).toBe(operationsId);
});

it.each([
  { problem: "missing", value: undefined },
  { problem: "not signed", value: "some-bu-id" },
  {
    problem: "swapped-BU (changed after signing)",
    value: signBusinessUnitChoice("other").replace("other", "x"),
  },
  { problem: "tampered signature", value: `${signBusinessUnitChoice("bu").slice(0, -2)}xx` },
  { problem: "expired", value: signBusinessUnitChoice("bu", Date.now() - ELEVEN_MINUTES) },
])("a $problem choice cookie is ignored", ({ value }) => {
  expect(readBusinessUnitChoice(value)).toBeUndefined();
});

it("a returning user's BU doesn't change, even with a valid choice cookie", async () => {
  await syncSsoProfile(newcomer, { requestedBusinessUnitId: financeId });

  const requested = readBusinessUnitChoice(signBusinessUnitChoice(operationsId));
  const user = await syncSsoProfile(newcomer, { requestedBusinessUnitId: requested });
  expect(user.businessUnitId).toBe(financeId);
});
