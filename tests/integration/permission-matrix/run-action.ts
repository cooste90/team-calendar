import { NextRequest } from "next/server";
import { addDays } from "@/domain/dates";
import { cancelPendingPatternAction } from "@/server/actions/cancel-pending-pattern";
import { createBookingAction } from "@/server/actions/create-booking";
import { createBusinessUnitAction } from "@/server/actions/create-business-unit";
import { createTeamAction } from "@/server/actions/create-team";
import { deleteBookingAction } from "@/server/actions/delete-booking";
import { deleteBusinessUnitAction } from "@/server/actions/delete-business-unit";
import { deleteTeamAction } from "@/server/actions/delete-team";
import { deleteUserAction } from "@/server/actions/delete-user";
import { dismissUnassignedBanner } from "@/server/actions/dismiss-unassigned-banner";
import { moveTeamAction } from "@/server/actions/move-team";
import { moveUserToBusinessUnitAction } from "@/server/actions/move-user-to-business-unit";
import { moveUserToTeamAction } from "@/server/actions/move-user-to-team";
import { previewPublicHolidayChangeAction } from "@/server/actions/preview-public-holiday-change";
import { removeBookingDayAction } from "@/server/actions/remove-booking-day";
import { renameBusinessUnitAction } from "@/server/actions/rename-business-unit";
import { renameTeamAction } from "@/server/actions/rename-team";
import { restoreBookingAction } from "@/server/actions/restore-booking";
import { savePublicHolidayChangeAction } from "@/server/actions/save-public-holiday-change";
import { setAvailabilityOverrideAction } from "@/server/actions/set-availability-override";
import { setBusinessUnitHiddenAction } from "@/server/actions/set-business-unit-hidden";
import { setTeamCollapsed } from "@/server/actions/set-team-collapsed";
import { setViewPreference } from "@/server/actions/set-view-preference";
import { trimBookingAction } from "@/server/actions/trim-booking";
import { updateBookingAction } from "@/server/actions/update-booking";
import { updatePreferredNameAction } from "@/server/actions/update-preferred-name";
import { updateWorkingPatternAction } from "@/server/actions/update-working-pattern";
import { serverToday } from "@/server/today";
import { GET as exportAttendance } from "../../../src/app/api/export/attendance/route";
import { GET as health } from "../../../src/app/api/health/route";
import { annualLeave, insertRow } from "../helpers/people";
import type { World } from "./world";

// One way to call each server action and route, as the signed-in person (actorId), on a
// target: a person ("self", "ben" …), a business unit ("west" …) or "-" when there's none.
// It returns what the action or route answered.
type Call = { world: World; actorId: string; target: string };
type Answer = { ok: boolean; error?: { code: string } } | Response;
type Run = (call: Call) => Promise<Answer>;

// A week far ahead, so the time rules never get in the way.
const START = "2030-06-17";
const MIDDLE = "2030-06-18";
const END = "2030-06-19";
const WEEKDAYS_ONLY = ["OFF", "FULL", "FULL", "FULL", "FULL", "FULL", "OFF"] as const;

// The person a target means: the actor themselves for "self", otherwise the named person.
function personOf({ actorId, target }: Call) {
  return target === "self" ? actorId : target;
}

// Another team in the person's business unit, to move them to.
function otherTeam(world: World, userId: string) {
  const { people, businessUnits, teams } = world;
  const person = people[userId];
  if (person.businessUnitId === businessUnits.north) return teams.audit;
  if (person.businessUnitId === businessUnits.corporate) return teams.archive;
  if (person.teamId === teams.legal) return teams.ops;
  return teams.legal;
}

// A team in the target business unit.
function teamIn(world: World, unit: string) {
  if (unit === "north") return world.teams.payroll;
  if (unit === "corporate") return world.teams.records;
  return world.teams.ops;
}

// A business unit other than the person's, to move them to.
function anotherUnit(world: World, userId: string) {
  const { people, businessUnits } = world;
  if (people[userId].businessUnitId === businessUnits.west) return businessUnits.north;
  return businessUnits.west;
}

export const RUN: Record<string, Run> = {
  // Bookings (spec §5.3–5.6).
  createBookingAction: (call) =>
    createBookingAction({ booking: annualLeave(personOf(call), START, END), replace: false }),
  updateBookingAction: async (call) => {
    const booking = annualLeave(personOf(call), START, END);
    const id = await insertRow(booking);
    return updateBookingAction({ id, booking: { ...booking, notes: "Dentist" }, replace: false });
  },
  deleteBookingAction: async (call) => {
    const id = await insertRow(annualLeave(personOf(call), START, END));
    return deleteBookingAction({ id });
  },
  removeBookingDayAction: async (call) => {
    const id = await insertRow(annualLeave(personOf(call), START, END));
    return removeBookingDayAction({ id, date: MIDDLE });
  },
  trimBookingAction: async (call) => {
    // A booking that has started: yesterday to two days from now.
    const today = serverToday();
    const started = annualLeave(personOf(call), addDays(today, -1), addDays(today, 2));
    return trimBookingAction({ id: await insertRow(started) });
  },
  restoreBookingAction: (call) =>
    restoreBookingAction({
      booking: annualLeave(personOf(call), START, END),
      publicHolidayId: null,
    }),

  // Profiles and working days (spec §4, §7).
  setAvailabilityOverrideAction: (call) =>
    setAvailabilityOverrideAction({ userId: personOf(call), date: START, value: "OFF" }),
  updatePreferredNameAction: (call) =>
    updatePreferredNameAction({ userId: personOf(call), preferredName: "Sam" }),
  updateWorkingPatternAction: (call) =>
    updateWorkingPatternAction({ userId: personOf(call), pattern: [...WEEKDAYS_ONLY] }),
  cancelPendingPatternAction: (call) => cancelPendingPatternAction({ userId: personOf(call) }),

  // People in the admin dialog (spec §1.3, §9).
  deleteUserAction: (call) => deleteUserAction({ userId: personOf(call) }),
  moveUserToTeamAction: (call) => {
    const userId = personOf(call);
    return moveUserToTeamAction({ userId, teamId: otherTeam(call.world, userId) });
  },
  moveUserToBusinessUnitAction: (call) => {
    const userId = personOf(call);
    return moveUserToBusinessUnitAction({
      userId,
      businessUnitId: anotherUnit(call.world, userId),
    });
  },

  // Teams (spec §1.4, §9). The target is a business unit.
  createTeamAction: ({ world, target }) =>
    createTeamAction({ businessUnitId: world.businessUnits[target], name: "Quality" }),
  renameTeamAction: ({ world, target }) =>
    renameTeamAction({ teamId: teamIn(world, target), name: "Renamed" }),
  moveTeamAction: ({ world, target }) =>
    moveTeamAction({ teamId: teamIn(world, target), direction: "down" }),
  deleteTeamAction: ({ world, target }) => deleteTeamAction({ teamId: teamIn(world, target) }),

  // Business units (spec §1.3).
  createBusinessUnitAction: () => createBusinessUnitAction({ name: "South" }),
  renameBusinessUnitAction: ({ world, target }) =>
    renameBusinessUnitAction({ id: world.businessUnits[target], name: "Renamed unit" }),
  setBusinessUnitHiddenAction: ({ world, target }) =>
    setBusinessUnitHiddenAction({ id: world.businessUnits[target], hidden: true }),
  // Only an empty business unit can be deleted.
  deleteBusinessUnitAction: ({ world }) =>
    deleteBusinessUnitAction({ id: world.businessUnits.empty }),

  // Public holidays (spec §6.1).
  previewPublicHolidayChangeAction: () =>
    previewPublicHolidayChangeAction({ kind: "create", name: "Founders' Day", date: START }),
  savePublicHolidayChangeAction: () =>
    savePublicHolidayChangeAction({ kind: "create", name: "Founders' Day", date: START }),

  // The signed-in person's own settings.
  setViewPreference: () => setViewPreference("month"),
  dismissUnassignedBanner: () => dismissUnassignedBanner(undefined),
  setTeamCollapsed: ({ world }) => setTeamCollapsed({ groupId: world.teams.ops, collapsed: true }),

  // Routes (spec §10). The print link names the business unit by its slug ("west").
  "GET /api/export/attendance": ({ target }) =>
    exportAttendance(
      new NextRequest(`http://localhost/api/export/attendance?bu=${target}&range=this-week`),
    ),
  "GET /api/health": () => health(),
};
