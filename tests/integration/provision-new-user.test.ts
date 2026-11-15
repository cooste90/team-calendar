import { expect, it } from "vitest";
import { toDbDate } from "@/domain/dates";
import { db } from "@/server/db";
import { toBooking } from "@/server/mappers";
import { syncSsoProfile } from "@/server/services/auth-sync";

const newcomer = {
  ssoId: "sso-new",
  employeeNumber: "400004",
  firstName: "Sam",
  surname: "Lee",
  email: "sam.lee@example.com",
  formalGroups: [],
};

it("a new user gets a PH copy of every future public holiday they work, and no past ones", async () => {
  const holidays = [
    { date: "2020-12-25", name: "Christmas Day 2020" }, // in the past
    { date: "2030-12-25", name: "Christmas Day" }, // a Wednesday
    { date: "2030-12-28", name: "Substitute day" }, // a Saturday: a day off by default
  ];
  for (const holiday of holidays) {
    await db.publicHoliday.create({ data: { date: toDbDate(holiday.date), name: holiday.name } });
  }
  const christmas = await db.publicHoliday.findFirstOrThrow({ where: { name: "Christmas Day" } });

  const user = await syncSsoProfile(newcomer);

  const bookings = (await db.event.findMany({ where: { userId: user.id } })).map(toBooking);
  expect(bookings).toEqual([
    {
      id: expect.any(String),
      userId: user.id,
      type: "PUBLIC_HOLIDAY",
      startDate: "2030-12-25",
      startHalf: "AM",
      endDate: "2030-12-25",
      endHalf: "PM",
      notes: "Christmas Day",
      publicHolidayId: christmas.id,
      createdById: user.id,
    },
  ]);
});

it("a returning user isn't given public holidays again", async () => {
  await db.publicHoliday.create({ data: { date: toDbDate("2030-12-25"), name: "Christmas Day" } });

  await syncSsoProfile(newcomer);
  await syncSsoProfile(newcomer);

  expect(await db.event.count()).toBe(1);
});
