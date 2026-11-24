import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/permissions";
import { createBookingAction } from "@/server/actions/create-booking";
import { moveTeamAction } from "@/server/actions/move-team";
import { renameTeamAction } from "@/server/actions/rename-team";
import { savePublicHolidayChangeAction } from "@/server/actions/save-public-holiday-change";
import { setTeamCollapsed } from "@/server/actions/set-team-collapsed";
import { updatePreferredNameAction } from "@/server/actions/update-preferred-name";
import { updateWorkingPatternAction } from "@/server/actions/update-working-pattern";
import { GET as exportAttendance } from "../../src/app/api/export/attendance/route";
import { annualLeave } from "./helpers/people";

// Whatever a browser sends, an action answers with VALIDATION, never a crash (T36). The
// person is a super admin, so permissions are never the reason for a refusal. Every input
// here is refused before anything touches the database.
const grace = vi.hoisted(
  (): Actor => ({ id: "grace", role: "SUPER_ADMIN", businessUnitId: "north", teamId: null }),
);
vi.mock("@/server/session", () => ({ requireUser: async () => grace }));
vi.mock("next/cache", () => ({ refresh: () => {} }));

const HUGE = "x".repeat(100_000);
const booking = annualLeave("grace", "2030-06-17");

// [what's sent, the action, the input]. The inputs are whatever a hand-made request could
// contain, so they don't match the actions' types.
type Action = (input: never) => Promise<{ ok: boolean; error?: { code: string } }>;
// biome-ignore format: one line per input reads as a list
const inputs: [string, Action, unknown][] = [
  ["a booking for a huge user id", createBookingAction, { booking: { ...booking, userId: HUGE }, replace: false }],
  ["a booking with huge notes", createBookingAction, { booking: { ...booking, notes: HUGE }, replace: false }],
  ["a booking on 31 February", createBookingAction, { booking: { ...booking, startDate: "2030-02-31" }, replace: false }],
  ["a booking with a made-up type", createBookingAction, { booking: { ...booking, type: "HOLIDAY" }, replace: false }],
  ["a booking that isn't an object", createBookingAction, "delete everything"],
  ["nothing at all", createBookingAction, undefined],
  ["a huge team name", renameTeamAction, { teamId: "ops", name: HUGE }],
  ["a team id that's a number", renameTeamAction, { teamId: 42, name: "Ops" }],
  ["a direction that isn't up or down", moveTeamAction, { teamId: "ops", direction: "sideways" }],
  ["a huge group id", setTeamCollapsed, { groupId: HUGE, collapsed: true }],
  ["an eight-day week", updateWorkingPatternAction, { userId: "grace", pattern: Array(8).fill("FULL") }],
  ["a huge preferred name", updatePreferredNameAction, { userId: "grace", preferredName: HUGE }],
  ["a public holiday change of an unknown kind", savePublicHolidayChangeAction, { kind: "rename-everything" }],
  ["an array instead of an object", savePublicHolidayChangeAction, [1, 2, 3]],
];

describe("oversized and malformed input", () => {
  it.each(inputs)("%s is refused as VALIDATION", async (_name, action, input) => {
    const result = await action(input as never);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("VALIDATION");
  });

  it("a huge business unit in the print link is a 400, not a crash", async () => {
    const url = `http://localhost/api/export/attendance?bu=${HUGE}&range=this-week`;
    const response = await exportAttendance(new NextRequest(url));
    expect(response.status).toBe(400);
  });
});
