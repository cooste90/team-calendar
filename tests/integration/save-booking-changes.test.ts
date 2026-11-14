import { expect, it } from "vitest";
import { toDbDate } from "@/domain/dates";
import { toSlot } from "@/domain/slots";
import { db } from "@/server/db";
import { toBooking } from "@/server/mappers";
import { saveBookingChanges } from "@/server/services/save-booking-changes";
import { createUser } from "./helpers/create-user";

const oneDay = (date: string) =>
  ({ startDate: toDbDate(date), startHalf: "AM", endDate: toDbDate(date), endHalf: "PM" }) as const;

it("saves every kind of change in one go: remove, create, update, exclude and unlink", async () => {
  await createUser("anna");
  await createUser("admin");
  const holiday = await db.publicHoliday.create({
    data: { date: toDbDate("2030-12-25"), name: "Christmas Day" },
  });
  const toRemove = await db.event.create({
    data: { userId: "anna", type: "WFH", ...oneDay("2030-12-02") },
  });
  const toShorten = await db.event.create({
    data: {
      userId: "anna",
      type: "ANNUAL",
      startDate: toDbDate("2030-12-09"),
      startHalf: "AM",
      endDate: toDbDate("2030-12-13"),
      endHalf: "PM",
    },
  });
  const toUnlink = await db.event.create({
    data: {
      userId: "anna",
      type: "PUBLIC_HOLIDAY",
      publicHolidayId: holiday.id,
      ...oneDay("2030-12-25"),
    },
  });

  await db.$transaction((tx) =>
    saveBookingChanges(
      tx,
      {
        remove: [toRemove.id],
        create: [
          {
            userId: "anna",
            type: "SICKNESS",
            startDate: "2030-12-16",
            startHalf: "PM",
            endDate: "2030-12-16",
            endHalf: "PM",
            publicHolidayId: null,
          },
          {
            userId: "anna",
            type: "ANNUAL",
            startDate: "2030-12-13",
            startHalf: "AM",
            endDate: "2030-12-13",
            endHalf: "PM",
            publicHolidayId: null,
            createdById: "anna",
          },
        ],
        update: [
          {
            id: toShorten.id,
            range: { start: toSlot("2030-12-09", "AM"), end: toSlot("2030-12-11", "PM") },
          },
        ],
        addExclusions: [{ userId: "anna", publicHolidayId: holiday.id }],
        unlink: [toUnlink.id],
      },
      "admin",
    ),
  );

  const rows = await db.event.findMany({ orderBy: { startDate: "asc" } });
  expect(rows.map(toBooking)).toMatchObject([
    { id: toShorten.id, startDate: "2030-12-09", endDate: "2030-12-11" },
    { type: "ANNUAL", startDate: "2030-12-13", createdById: "anna" }, // a split piece keeps its creator
    { type: "SICKNESS", startDate: "2030-12-16", startHalf: "PM", createdById: "admin" },
    { id: toUnlink.id, publicHolidayId: null },
  ]);
  expect(rows[0].updatedById).toBe("admin");
  expect(await db.publicHolidayExclusion.count({ where: { userId: "anna" } })).toBe(1);
});
