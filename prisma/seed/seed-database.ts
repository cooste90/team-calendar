// Fills the database with realistic demo data. The same size and the same "today"
// always give the same people and bookings (faker uses a fixed seed).
import { fakerEN_GB as faker } from "@faker-js/faker";
import type { CalendarDate } from "@/domain/dates";
import { db } from "@/server/db";
import { createBookings } from "./bookings";
import { createBusinessUnits, type SeedSize } from "./business-units";
import { createPeople } from "./people";
import { createPublicHolidays, detachSomeCopies } from "./public-holidays";

const FAKER_SEED = 20261114;

export async function seedDatabase({ size, today }: { size: SeedSize; today: CalendarDate }) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The seed deletes all data, so it never runs in production.");
  }
  faker.seed(FAKER_SEED);

  await deleteAllData();
  const units = await createBusinessUnits(size);
  const people = await createPeople(units, today);
  await createBookings(people, today);
  const superAdmin = people.find((person) => person.role === "SUPER_ADMIN") ?? people[0];
  await createPublicHolidays(people, superAdmin.id);
  await detachSomeCopies(people);

  return { businessUnits: units.length, people: people.length, bookings: await db.event.count() };
}

// Children before parents, so no foreign key stops a delete.
async function deleteAllData() {
  await db.event.deleteMany();
  await db.publicHolidayExclusion.deleteMany();
  await db.availabilityOverride.deleteMany();
  await db.workingPattern.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.verification.deleteMany();
  await db.publicHoliday.deleteMany();
  await db.user.deleteMany();
  await db.team.deleteMany();
  await db.businessUnit.deleteMany();
}
