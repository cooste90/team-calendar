import { db } from "@/server/db";

// A user row with only the required fields filled in. The id is reused for the
// unique fields, so tests can make as many people as they need.
export function createUser(
  id: string,
  place: { businessUnitId?: string; teamId?: string | null } = {},
) {
  return db.user.create({
    data: {
      id,
      ssoId: `sso-${id}`,
      employeeNumber: `emp-${id}`,
      email: `${id}@example.test`,
      name: `Test ${id}`,
      firstName: "Test",
      surname: id,
      businessUnitId: place.businessUnitId,
      teamId: place.teamId ?? null,
    },
  });
}
