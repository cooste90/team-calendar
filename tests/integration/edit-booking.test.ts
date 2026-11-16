import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, toDbDate } from "@/domain/dates";
import type { BookingInput } from "@/domain/events";
import type { Actor } from "@/domain/permissions";
import { planPublicHolidayMove } from "@/domain/public-holidays";
import { db } from "@/server/db";
import { toBooking } from "@/server/mappers";
import {
  deleteBooking,
  removeBookingDay,
  trimRemainingDays,
  updateBooking,
} from "@/server/services/booking-edits";
import { createBooking, restoreBooking } from "@/server/services/bookings";
import {
  annualLeave,
  bookingsInDb,
  createPeople,
  exclusionsInDb,
  insertRow,
} from "./helpers/people";

// Today is Wednesday 12 June 2030.
const TODAY = "2030-06-12";

let actors: Record<string, Actor> = {};

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {}); // the audit lines
  actors = await createPeople();
});

function update(actorId: string, id: string, input: BookingInput, options = { replace: false }) {
  return updateBooking(actors[actorId], id, input, options, TODAY);
}

describe("a booking that has started", () => {
  // Priya's annual leave from 2 days ago to 2 days from now, added by Tom.
  let id = "";
  beforeEach(async () => {
    id = await insertRow(annualLeave("priya", addDays(TODAY, -2), addDays(TODAY, 2)));
  });

  it("can't change type", async () => {
    const leave = annualLeave("priya", addDays(TODAY, -2), addDays(TODAY, 2));
    const sickness = { ...leave, type: "SICKNESS" } as const;
    await expect(update("priya", id, sickness)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("can have its end moved later", async () => {
    const longer = annualLeave("priya", addDays(TODAY, -2), addDays(TODAY, 4));
    await update("priya", id, longer);
    expect(await bookingsInDb()).toEqual([
      `priya ANNUAL ${addDays(TODAY, -2)} AM – ${addDays(TODAY, 4)} PM`,
    ]);
  });

  it("“Delete the remaining days” makes it end yesterday", async () => {
    await trimRemainingDays(actors.priya, id, TODAY);
    expect(await bookingsInDb()).toEqual([
      `priya ANNUAL ${addDays(TODAY, -2)} AM – ${addDays(TODAY, -1)} PM`,
    ]);
  });

  it("can't be deleted outright", async () => {
    await expect(deleteBooking(actors.priya, id, TODAY)).rejects.toMatchObject({
      code: "PAST_LOCKED",
    });
  });
});

describe("a past booking", () => {
  it("can't be edited or deleted, even by the admin who added it within the 7 days", async () => {
    const past = annualLeave("priya", addDays(TODAY, -5), addDays(TODAY, -3));
    const { id } = await createBooking(actors.tom, past, { replace: false }, TODAY);

    const moved = annualLeave("priya", addDays(TODAY, -5), addDays(TODAY, -4));
    await expect(update("tom", id, moved)).rejects.toMatchObject({ code: "PAST_LOCKED" });
    await expect(deleteBooking(actors.tom, id, TODAY)).rejects.toMatchObject({
      code: "PAST_LOCKED",
    });
  });
});

describe("editing", () => {
  it("a teammate can edit a teammate's booking; someone in another team can't", async () => {
    const id = await insertRow(annualLeave("priya", "2030-06-17"));
    const moved = annualLeave("priya", "2030-06-18");

    await update("ben", id, moved);
    expect(await bookingsInDb()).toEqual(["priya ANNUAL 2030-06-18 AM – 2030-06-18 PM"]);
    await expect(update("dan", id, moved)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("doesn't clash with itself, but does with others, and Replace works", async () => {
    const id = await insertRow(annualLeave("priya", "2030-06-17", "2030-06-18"));
    await insertRow({ ...annualLeave("priya", "2030-06-20"), type: "WFH" });

    const longer = annualLeave("priya", "2030-06-17", "2030-06-21");
    await expect(update("priya", id, longer)).rejects.toMatchObject({
      code: "CONFLICT",
      conflicts: [{ type: "WFH" }],
    });

    await update("priya", id, longer, { replace: true });
    expect(await bookingsInDb()).toEqual(["priya ANNUAL 2030-06-17 AM – 2030-06-21 PM"]);
  });

  it("records who changed it and keeps who created it", async () => {
    const id = await insertRow(annualLeave("priya", "2030-06-17"));
    const withNotes = { ...annualLeave("priya", "2030-06-17"), notes: "Wedding" };
    await update("ben", id, withNotes);
    expect(await db.event.findUniqueOrThrow({ where: { id } })).toMatchObject({
      notes: "Wedding",
      createdById: "tom",
      updatedById: "ben",
    });
  });
});

describe("“Remove this day”", () => {
  it("removing a middle day leaves two bookings, both still created by the same person", async () => {
    const id = await insertRow(annualLeave("priya", "2030-06-17", "2030-06-21"));
    await removeBookingDay(actors.priya, id, "2030-06-19", TODAY);

    expect(await bookingsInDb()).toEqual([
      "priya ANNUAL 2030-06-17 AM – 2030-06-18 PM",
      "priya ANNUAL 2030-06-20 AM – 2030-06-21 PM",
    ]);
    const rows = await db.event.findMany();
    expect(rows.map((row) => row.createdById)).toEqual(["tom", "tom"]);
  });

  it("removing the first day moves the start", async () => {
    const id = await insertRow(annualLeave("priya", "2030-06-17", "2030-06-21"));
    await removeBookingDay(actors.priya, id, "2030-06-17", TODAY);
    expect(await bookingsInDb()).toEqual(["priya ANNUAL 2030-06-18 AM – 2030-06-21 PM"]);
  });
});

describe("a public holiday copy", () => {
  // Priya's copy of the summer bank holiday, Monday 26 August.
  let holidayId = "";
  let copyId = "";
  beforeEach(async () => {
    const holiday = await db.publicHoliday.create({
      data: { date: toDbDate("2030-08-26"), name: "Summer bank holiday" },
    });
    holidayId = holiday.id;
    copyId = await insertRow({
      ...annualLeave("priya", "2030-08-26"),
      type: "PUBLIC_HOLIDAY",
      notes: "Summer bank holiday",
      publicHolidayId: holiday.id,
    });
  });

  it("moved to another day is detached, and a later move of the holiday leaves it alone", async () => {
    const tuesday = { ...annualLeave("priya", "2030-08-27"), type: "PUBLIC_HOLIDAY" as const };
    await update("priya", copyId, tuesday);

    const copy = await db.event.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.publicHolidayId).toBeNull();
    expect(await exclusionsInDb()).toEqual([{ userId: "priya", publicHolidayId: holidayId }]);

    // An admin moves the holiday itself (T31): the planner has nothing to do for Priya.
    const changes = planPublicHolidayMove(
      { id: holidayId, date: "2030-08-26", name: "Summer bank holiday" },
      "2030-08-26",
      "2030-08-30",
      [
        {
          userId: "priya",
          availability: () => "FULL",
          bookings: [toBooking(copy)],
          exclusions: [holidayId],
        },
      ],
    );
    expect(changes.create).toEqual([]);
    expect(changes.remove).toEqual([]);
  });

  it("with only its notes changed stays linked", async () => {
    const withNotes = {
      ...annualLeave("priya", "2030-08-26"),
      type: "PUBLIC_HOLIDAY" as const,
      notes: "Going to the coast",
    };
    await update("priya", copyId, withNotes);

    const copy = await db.event.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.publicHolidayId).toBe(holidayId);
    expect(await exclusionsInDb()).toEqual([]);
  });

  it("with its day removed is gone, with an exclusion so it isn't created again", async () => {
    await removeBookingDay(actors.priya, copyId, "2030-08-26", TODAY);
    expect(await bookingsInDb()).toEqual([]);
    expect(await exclusionsInDb()).toEqual([{ userId: "priya", publicHolidayId: holidayId }]);
  });

  it("deleted adds an exclusion, and Undo links it again with no exclusion", async () => {
    const deleted = await deleteBooking(actors.priya, copyId, TODAY);
    expect(await bookingsInDb()).toEqual([]);
    expect(await exclusionsInDb()).toEqual([{ userId: "priya", publicHolidayId: holidayId }]);

    const { id } = await restoreBooking(actors.priya, deleted, TODAY);

    const copy = await db.event.findUniqueOrThrow({ where: { id } });
    expect(copy).toMatchObject({ type: "PUBLIC_HOLIDAY", publicHolidayId: holidayId });
    expect(await exclusionsInDb()).toEqual([]);
  });
});

describe("Undo", () => {
  it("brings a deleted booking back", async () => {
    const id = await insertRow({ ...annualLeave("priya", "2030-06-17"), notes: "Dentist" });
    const deleted = await deleteBooking(actors.priya, id, TODAY);
    await restoreBooking(actors.priya, deleted, TODAY);
    expect(await bookingsInDb()).toEqual(["priya ANNUAL 2030-06-17 AM – 2030-06-17 PM"]);
    expect((await db.event.findFirstOrThrow()).notes).toBe("Dentist");
  });

  it("can't bring it back once something else is booked there", async () => {
    const id = await insertRow(annualLeave("priya", "2030-06-17"));
    const deleted = await deleteBooking(actors.priya, id, TODAY);
    await createBooking(
      actors.ben,
      { ...annualLeave("priya", "2030-06-17"), type: "WFH" },
      { replace: false },
      TODAY,
    );

    await expect(restoreBooking(actors.priya, deleted, TODAY)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Couldn't undo — something else is booked there now.",
    });
  });
});
