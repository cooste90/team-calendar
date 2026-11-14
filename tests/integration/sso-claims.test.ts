import { expect, it } from "vitest";
import { mapSsoClaims } from "@/server/sso-claims";

it("turns the identity provider's claims into an SSO profile", () => {
  const claims = {
    id: "abc-123",
    employeeNumber: "200003",
    firstName: "Priya",
    surname: "Shah",
    email: "priya.shah@example.com",
    formalGroups: ["CALENDAR_ADMIN"],
    locale: "en-GB", // extra claims are ignored
  };

  expect(mapSsoClaims(claims)).toEqual({
    ssoId: "abc-123",
    employeeNumber: "200003",
    firstName: "Priya",
    surname: "Shah",
    email: "priya.shah@example.com",
    formalGroups: ["CALENDAR_ADMIN"],
  });
});

it("treats missing groups as no groups", () => {
  const claims = { id: "a", employeeNumber: "1", firstName: "A", surname: "B", email: "a@b.test" };
  expect(mapSsoClaims(claims).formalGroups).toEqual([]);
});

it("names every missing claim in the error", () => {
  expect(() => mapSsoClaims({ id: "a", email: "a@b.test" })).toThrow(
    /employeeNumber[\s\S]*firstName[\s\S]*surname/,
  );
});
