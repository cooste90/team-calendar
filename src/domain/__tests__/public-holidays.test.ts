import { describe, expect, it } from "vitest";
import {
  availabilityLookup,
  DEFAULT_PATTERN_EFFECTIVE_FROM,
  type WeeklyPattern,
} from "../availability";
import { type Booking, emptyChanges } from "../events";
import {
  type PersonSnapshot,
  type PublicHoliday,
  phSlotsFor,
  planPublicHolidayCreate,
  planPublicHolidayDelete,
  planPublicHolidayMove,
  planReconcileForPerson,
  planUserDeletesPhCopy,
  planUserEditsPhCopy,
  planUserUpdatesPhCopy,
} from "../public-holidays";
import { type HalfDay, rangeOf, toSlot } from "../slots";

// November 2026: Mon 16, Tue 17, Wed 18, Thu 19, Fri 20, Sat 21, Sun 22.
// Patterns are [Sun, Mon, Tue, Wed, Thu, Fri, Sat].
const FULL_TIME: WeeklyPattern = ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "OFF"];
const WEDNESDAY_MORNINGS: WeeklyPattern = ["OFF", "FULL", "FULL", "AM", "FULL", "FULL", "OFF"];
const OFF_WEDNESDAYS: WeeklyPattern = ["OFF", "FULL", "FULL", "OFF", "FULL", "FULL", "OFF"];

const holiday: PublicHoliday = { id: "ph1", date: "2026-11-18", name: "Founders' Day" };

function makeBooking(
  id: string,
  type: Booking["type"],
  startDate: string,
  startHalf: HalfDay,
  endDate: string,
  endHalf: HalfDay,
  publicHolidayId: string | null = null,
): Booking {
  return { id, userId: "priya", type, startDate, startHalf, endDate, endHalf, publicHolidayId };
}

function person(
  pattern: WeeklyPattern,
  bookings: Booking[] = [],
  exclusions: string[] = [],
): PersonSnapshot {
  return {
    userId: "priya",
    availability: availabilityLookup(
      [{ effectiveFrom: DEFAULT_PATTERN_EFFECTIVE_FROM, pattern }],
      [],
    ),
    bookings,
    exclusions,
  };
}

// The PH booking the planners should create for Priya.
function phBooking(date: string, startHalf: HalfDay, endHalf: HalfDay, holidayToUse = holiday) {
  return {
    userId: "priya",
    type: "PUBLIC_HOLIDAY",
    startDate: date,
    startHalf,
    endDate: date,
    endHalf,
    notes: holidayToUse.name,
    publicHolidayId: holidayToUse.id,
  };
}

describe("phSlotsFor", () => {
  it.each([
    ["FULL", ["AM", "PM"]],
    ["AM", ["AM"]],
    ["PM", ["PM"]],
    ["OFF", []],
  ] as const)("a %s day gets a PH on %o", (workDay, halves) => {
    expect(phSlotsFor(workDay, "2026-11-18")).toEqual(
      halves.map((half) => toSlot("2026-11-18", half)),
    );
  });
});

describe("planPublicHolidayCreate", () => {
  it("a full-time worker with annual leave that day: the AL is deleted and a full PH is created", () => {
    const leave = makeBooking("al", "ANNUAL", "2026-11-18", "AM", "2026-11-18", "PM");
    expect(planPublicHolidayCreate(holiday, [person(FULL_TIME, [leave])])).toEqual({
      ...emptyChanges(),
      remove: ["al"],
      create: [phBooking("2026-11-18", "AM", "PM")],
    });
  });

  it("a morning-only worker gets a half-day PH in the morning", () => {
    expect(planPublicHolidayCreate(holiday, [person(WEDNESDAY_MORNINGS)]).create).toEqual([
      phBooking("2026-11-18", "AM", "AM"),
    ]);
  });

  it("someone whose day off it is gets nothing", () => {
    expect(planPublicHolidayCreate(holiday, [person(OFF_WEDNESDAYS)])).toEqual(emptyChanges());
  });

  it("parental leave that day is kept, and no PH is created", () => {
    const parental = makeBooking("pl", "PARENTAL", "2026-11-02", "AM", "2026-12-31", "PM");
    expect(planPublicHolidayCreate(holiday, [person(FULL_TIME, [parental])])).toEqual(
      emptyChanges(),
    );
  });

  it("parental leave in the morning and AL in the afternoon: the AL is deleted and the PH is afternoon only", () => {
    const parental = makeBooking("pl", "PARENTAL", "2026-11-18", "AM", "2026-11-18", "AM");
    const leave = makeBooking("al", "ANNUAL", "2026-11-18", "PM", "2026-11-18", "PM");
    expect(planPublicHolidayCreate(holiday, [person(FULL_TIME, [parental, leave])])).toEqual({
      ...emptyChanges(),
      remove: ["al"],
      create: [phBooking("2026-11-18", "PM", "PM")],
    });
  });

  it("a Mon–Fri AL block with the PH on Wednesday is split into Mon–Tue and Thu–Fri", () => {
    const block = {
      ...makeBooking("al", "ANNUAL", "2026-11-16", "AM", "2026-11-20", "PM"),
      createdById: "admin",
    };
    const changes = planPublicHolidayCreate(holiday, [person(FULL_TIME, [block])]);
    expect(changes.update).toEqual([
      { id: "al", range: rangeOf({ ...block, endDate: "2026-11-17" }) },
    ]);
    expect(changes.create).toEqual([
      {
        ...block,
        id: undefined,
        startDate: "2026-11-19",
        publicHolidayId: null,
        createdById: "admin",
      },
      phBooking("2026-11-18", "AM", "PM"),
    ]);
  });

  it("a block where the PH falls on its last working day is shortened (the weekend left over is dropped)", () => {
    const friday: PublicHoliday = { ...holiday, date: "2026-11-20" };
    const block = makeBooking("al", "ANNUAL", "2026-11-16", "AM", "2026-11-22", "PM"); // Mon to Sun
    const changes = planPublicHolidayCreate(friday, [person(FULL_TIME, [block])]);
    expect(changes.update).toEqual([
      { id: "al", range: rangeOf({ ...block, endDate: "2026-11-19" }) },
    ]);
    expect(changes.create).toEqual([phBooking("2026-11-20", "AM", "PM", friday)]);
  });

  it("skips people who already have a copy or have detached from this holiday", () => {
    const copy = makeBooking(
      "copy",
      "PUBLIC_HOLIDAY",
      "2026-11-18",
      "AM",
      "2026-11-18",
      "PM",
      "ph1",
    );
    expect(planPublicHolidayCreate(holiday, [person(FULL_TIME, [copy])])).toEqual(emptyChanges());
    expect(planPublicHolidayCreate(holiday, [person(FULL_TIME, [], ["ph1"])])).toEqual(
      emptyChanges(),
    );
  });

  it("lists people in userId order, so the result is always the same", () => {
    const zoe = { ...person(FULL_TIME), userId: "zoe" };
    const adam = { ...person(FULL_TIME), userId: "adam" };
    const userIds = planPublicHolidayCreate(holiday, [zoe, adam]).create.map(
      (booking) => booking.userId,
    );
    expect(userIds).toEqual(["adam", "zoe"]);
  });
});

describe("planPublicHolidayMove (Monday 16 to Tuesday 17)", () => {
  const monday: PublicHoliday = { ...holiday, date: "2026-11-16" };
  const tuesday: PublicHoliday = { ...holiday, date: "2026-11-17" };
  const mondayCopy = makeBooking(
    "copy",
    "PUBLIC_HOLIDAY",
    "2026-11-16",
    "AM",
    "2026-11-16",
    "PM",
    "ph1",
  );

  it("untouched copies move to the new date and overwrite Tuesday's leave", () => {
    const tuesdayLeave = makeBooking("al", "ANNUAL", "2026-11-17", "AM", "2026-11-17", "PM");
    const changes = planPublicHolidayMove(monday, "2026-11-16", "2026-11-17", [
      person(FULL_TIME, [mondayCopy, tuesdayLeave]),
    ]);
    expect(changes).toEqual({
      ...emptyChanges(),
      remove: ["copy", "al"],
      create: [phBooking("2026-11-17", "AM", "PM", tuesday)],
    });
  });

  it("someone who had no copy because Monday was their day off gets it on Tuesday", () => {
    const offMondays: WeeklyPattern = ["OFF", "OFF", "FULL", "FULL", "FULL", "FULL", "OFF"];
    expect(
      planPublicHolidayMove(monday, "2026-11-16", "2026-11-17", [person(offMondays)]).create,
    ).toEqual([phBooking("2026-11-17", "AM", "PM", tuesday)]);
  });

  it("someone who worked Monday but had no copy (parental leave) is left alone", () => {
    const parental = makeBooking("pl", "PARENTAL", "2026-11-16", "AM", "2026-11-16", "PM");
    expect(
      planPublicHolidayMove(monday, "2026-11-16", "2026-11-17", [person(FULL_TIME, [parental])]),
    ).toEqual(emptyChanges());
  });

  it("someone who moved their copy (has an exclusion) is skipped", () => {
    const offMondays: WeeklyPattern = ["OFF", "OFF", "FULL", "FULL", "FULL", "FULL", "OFF"];
    expect(
      planPublicHolidayMove(monday, "2026-11-16", "2026-11-17", [person(offMondays, [], ["ph1"])]),
    ).toEqual(emptyChanges());
  });
});

describe("planPublicHolidayDelete", () => {
  it("removes untouched copies and leaves detached ones", () => {
    const untouched = {
      ...person(FULL_TIME, [
        makeBooking("copy", "PUBLIC_HOLIDAY", "2026-11-18", "AM", "2026-11-18", "PM", "ph1"),
      ]),
      userId: "adam",
    };
    const detached = person(
      FULL_TIME,
      [makeBooking("moved", "PUBLIC_HOLIDAY", "2026-11-19", "AM", "2026-11-19", "PM")],
      ["ph1"],
    );
    expect(planPublicHolidayDelete(holiday, [detached, untouched])).toEqual({
      ...emptyChanges(),
      remove: ["copy"],
    });
  });
});

describe("planReconcileForPerson", () => {
  const fullCopy = makeBooking(
    "copy",
    "PUBLIC_HOLIDAY",
    "2026-11-18",
    "AM",
    "2026-11-18",
    "PM",
    "ph1",
  );
  const morningCopy = makeBooking(
    "copy",
    "PUBLIC_HOLIDAY",
    "2026-11-18",
    "AM",
    "2026-11-18",
    "AM",
    "ph1",
  );

  it("the pattern now makes the PH date a day off: the copy is deleted", () => {
    expect(
      planReconcileForPerson(person(OFF_WEDNESDAYS, [fullCopy]), [holiday], "2026-11-15"),
    ).toEqual({
      ...emptyChanges(),
      remove: ["copy"],
    });
  });

  it("the date is now a full day instead of a morning: the copy grows and the afternoon booking is carved", () => {
    const afternoonWfh = makeBooking("wfh", "WFH", "2026-11-18", "PM", "2026-11-18", "PM");
    expect(
      planReconcileForPerson(
        person(FULL_TIME, [morningCopy, afternoonWfh]),
        [holiday],
        "2026-11-15",
      ),
    ).toEqual({
      ...emptyChanges(),
      remove: ["copy", "wfh"],
      create: [phBooking("2026-11-18", "AM", "PM")],
    });
  });

  it("a copy that still matches is left alone", () => {
    expect(planReconcileForPerson(person(FULL_TIME, [fullCopy]), [holiday], "2026-11-15")).toEqual(
      emptyChanges(),
    );
  });

  it("a holiday that now falls on a working day is created, unless the person detached from it", () => {
    expect(planReconcileForPerson(person(FULL_TIME), [holiday], "2026-11-15").create).toEqual([
      phBooking("2026-11-18", "AM", "PM"),
    ]);
    expect(planReconcileForPerson(person(FULL_TIME, [], ["ph1"]), [holiday], "2026-11-15")).toEqual(
      emptyChanges(),
    );
  });

  it("ignores holidays before the date the change applies from", () => {
    expect(planReconcileForPerson(person(FULL_TIME), [holiday], "2026-11-22")).toEqual(
      emptyChanges(),
    );
  });

  it("two holidays inside one long booking split it into three pieces", () => {
    const christmas: PublicHoliday = { id: "xmas", date: "2026-12-25", name: "Christmas Day" };
    const boxingDay: PublicHoliday = {
      id: "boxing",
      date: "2026-12-28",
      name: "Boxing Day (substitute)",
    };
    const block = makeBooking("al", "ANNUAL", "2026-12-21", "AM", "2027-01-01", "PM"); // Mon 21 Dec to Fri 1 Jan
    const changes = planReconcileForPerson(
      person(FULL_TIME, [block]),
      [boxingDay, christmas],
      "2026-12-01",
    );
    expect(changes.update).toEqual([
      { id: "al", range: rangeOf({ ...block, endDate: "2026-12-24" }) },
    ]);
    // Sat 26 and Sun 27 are left with no working days, so that piece is dropped.
    expect(changes.create).toMatchObject([
      { type: "ANNUAL", startDate: "2026-12-29", endDate: "2027-01-01" },
      { type: "PUBLIC_HOLIDAY", startDate: "2026-12-25", publicHolidayId: "xmas" },
      { type: "PUBLIC_HOLIDAY", startDate: "2026-12-28", publicHolidayId: "boxing" },
    ]);
  });
});

describe("a person changing their own copy", () => {
  const copy = makeBooking("copy", "PUBLIC_HOLIDAY", "2026-11-18", "AM", "2026-11-18", "PM", "ph1");
  const exclusion = [{ userId: "priya", publicHolidayId: "ph1" }];

  it("editing or moving it unlinks it and adds an exclusion", () => {
    expect(planUserEditsPhCopy(copy)).toEqual({
      ...emptyChanges(),
      unlink: ["copy"],
      addExclusions: exclusion,
    });
  });

  it("deleting it removes it and adds an exclusion", () => {
    expect(planUserDeletesPhCopy(copy)).toEqual({
      ...emptyChanges(),
      remove: ["copy"],
      addExclusions: exclusion,
    });
  });

  it.each([
    ["only the notes", { notes: "Going to the coast" }, false],
    ["the type", { type: "ANNUAL" }, true],
    ["the date", { startDate: "2026-11-19", endDate: "2026-11-19" }, true],
    ["a half", { endHalf: "AM" }, true],
  ] as const)("saving it from the form with %s changed detaches it: %s", (_what, change, detaches) => {
    const changes = planUserUpdatesPhCopy(copy, { ...copy, ...change });
    expect(changes).toEqual(detaches ? planUserEditsPhCopy(copy) : emptyChanges());
  });

  it("a PH booking that isn't linked to a holiday is just an ordinary booking", () => {
    const handMade = { ...copy, publicHolidayId: null };
    expect(planUserEditsPhCopy(handMade)).toEqual(emptyChanges());
    expect(planUserDeletesPhCopy(handMade)).toEqual({ ...emptyChanges(), remove: ["copy"] });
  });
});
