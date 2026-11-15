import { describe, expect, it } from "vitest";
import { availabilityLookup, worksSlot } from "@/domain/availability";
import { findConflicts } from "@/domain/conflicts";
import { leaveTypes } from "@/domain/leave-types";
import { fromSlot, rangeOf, slotsOf } from "@/domain/slots";
import { db } from "@/server/db";
import { toBooking, toOverride, toPatternVersion } from "@/server/mappers";
import { devSsoProfiles } from "../../prisma/seed/dev-sso-profiles";
import { seedDatabase } from "../../prisma/seed/seed-database";

const TODAY = "2026-11-14";
const SEED_TIMEOUT = 120_000;

describe("the default seed", () => {
  it(
    "completes and follows the app's rules",
    async () => {
      await seedDatabase({ size: "default", today: TODAY });

      const bookings = (await db.event.findMany()).map(toBooking);
      const users = await db.user.findMany({
        include: { patterns: true, overrides: true, businessUnit: true },
      });

      // No one has overlapping bookings.
      for (const booking of bookings) {
        const own = bookings.filter((other) => other.userId === booking.userId);
        expect(findConflicts(rangeOf(booking), own, booking.id)).toEqual([]);
      }

      // Everyone has a working pattern.
      expect(users.every((user) => user.patterns.length > 0)).toBe(true);

      // No future public holiday falls on a half-day the person doesn't work.
      for (const user of users) {
        const availability = availabilityLookup(
          user.patterns.map(toPatternVersion),
          user.overrides.map(toOverride),
        );
        const futureHolidays = bookings.filter(
          (booking) =>
            booking.userId === user.id &&
            booking.type === "PUBLIC_HOLIDAY" &&
            booking.startDate >= TODAY,
        );
        for (const holiday of futureHolidays) {
          for (const slot of slotsOf(rangeOf(holiday))) {
            const { date, half } = fromSlot(slot);
            expect(worksSlot(availability(date), half)).toBe(true);
          }
        }
      }

      // Every leave type is used.
      const usedTypes = new Set(bookings.map((booking) => booking.type));
      expect([...usedTypes].sort()).toEqual(Object.keys(leaveTypes).sort());

      // The hidden BU is hidden, and every BU has an admin with a dev sign-in profile.
      const units = await db.businessUnit.findMany({ orderBy: { name: "asc" } });
      expect(units.map((unit) => [unit.name, unit.hidden])).toEqual([
        ["Corporate Services", true],
        ["North Finance", false],
        ["West Operations", false],
      ]);
      for (const unit of units) {
        const adminProfile = devSsoProfiles.find(
          (item) =>
            item.businessUnit === unit.name && item.profile.formalGroups.includes("CALENDAR_ADMIN"),
        );
        expect(adminProfile).toBeDefined();
        const adminUser = users.find((user) => user.ssoId === adminProfile?.profile.ssoId);
        expect(adminUser).toMatchObject({ role: "ADMIN", businessUnitId: unit.id });
      }
    },
    SEED_TIMEOUT,
  );

  it(
    "gives the same data every time for the same day",
    async () => {
      const first = await seedDatabase({ size: "default", today: TODAY });
      const firstNames = await firstTenNames();
      const second = await seedDatabase({ size: "default", today: TODAY });

      expect(second).toEqual(first);
      expect(await firstTenNames()).toEqual(firstNames);
    },
    SEED_TIMEOUT,
  );
});

async function firstTenNames() {
  const users = await db.user.findMany({ orderBy: { employeeNumber: "asc" }, take: 10 });
  return users.map((user) => user.name);
}
