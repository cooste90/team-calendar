import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Actor } from "@/domain/permissions";
import { RUN } from "./permission-matrix/run-action";
import { createWorld } from "./permission-matrix/world";

// Every server action and route, run by every kind of person against every kind of
// target, with the result the spec says it should have (T36). The actions are the real
// ones; only the session is faked. Read each rule like a table: one line per person,
// one column per target.

// Who is signed in. In the app, requireUser shows "Your session has ended" when nobody
// is (tested in the browser); here it throws, so the case can say UNAUTHENTICATED.
const session = vi.hoisted(() => ({ actor: null as Actor | null }));
vi.mock("@/server/session", () => ({
  requireUser: async () => {
    if (!session.actor) throw new Error("UNAUTHENTICATED");
    return session.actor;
  },
}));
// Outside a request there's no page to refresh and no cookies to set.
vi.mock("next/cache", () => ({ refresh: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: () => {} }) }));

const OK = "ok";
const NO = "FORBIDDEN";
const OUT = "UNAUTHENTICATED";
const DENIED = "403"; // a route's answer

// The people who act (world.ts): Priya, a user in West's Ops team; Newbie, an unassigned
// user in West; Tom, West's admin; Nadia, North's admin; Grace, a super admin; and
// nobody (signed out).
type ActorKey = "priya" | "newbie" | "tom" | "nadia" | "grace" | "nobody";

// Targets that are people: the actor themselves, Ben (Priya's teammate in West Ops),
// Dan (West Legal), Newbie (West, Unassigned), Nina (North) and Hal (Corporate, hidden).
const people = (
  self: string,
  ben: string,
  dan: string,
  newbie: string,
  nina: string,
  hal: string,
) => ({ self, ben, dan, newbie, nina, hal });
// Targets that are business units: West, North and Corporate (hidden).
const units = (west: string, north: string, corporate: string) => ({ west, north, corporate });
// Actions with no target at all.
const none = (outcome: string) => ({ "-": outcome });

// For each person, the outcome for each target.
type Rule = Record<ActorKey, Record<string, string>>;

// The tables below are lined up by hand, so each column can be read down against the
// spec; "biome-ignore format" keeps the formatter from squashing them.

// Spec §5.3: who can change whose bookings.
// biome-ignore format: a lined-up table
const BOOKINGS: Rule = {
  // Columns: self, Ben, Dan, Newbie, Nina, Hal
  priya:  people(OK,  OK,  NO,  NO,  NO,  NO),
  newbie: people(NO,  NO,  NO,  NO,  NO,  NO),
  tom:    people(OK,  OK,  OK,  OK,  NO,  NO),
  nadia:  people(OK,  NO,  NO,  NO,  OK,  NO),
  grace:  people(OK,  OK,  OK,  OK,  OK,  OK),
  nobody: people(OUT, OUT, OUT, OUT, OUT, OUT),
};

// Spec §1.4, §4, §7: a profile and working days: the person, or an admin of their BU.
// (Day swaps follow this rule too, decided in T23.)
// biome-ignore format: a lined-up table
const PROFILES: Rule = {
  // Columns: self, Ben, Dan, Newbie, Nina, Hal
  priya:  people(OK,  NO,  NO,  NO,  NO,  NO),
  newbie: people(OK,  NO,  NO,  OK,  NO,  NO),
  tom:    people(OK,  OK,  OK,  OK,  NO,  NO),
  nadia:  people(OK,  NO,  NO,  NO,  OK,  NO),
  grace:  people(OK,  OK,  OK,  OK,  OK,  OK),
  nobody: people(OUT, OUT, OUT, OUT, OUT, OUT),
};

// Spec §9: deleting someone: an admin of their BU, but never yourself.
// biome-ignore format: a lined-up table
const DELETE_PERSON: Rule = {
  // Columns: self, Ben, Dan, Newbie, Nina, Hal
  priya:  people(NO,  NO,  NO,  NO,  NO,  NO),
  newbie: people(NO,  NO,  NO,  NO,  NO,  NO),
  tom:    people(NO,  OK,  OK,  OK,  NO,  NO),
  nadia:  people(NO,  NO,  NO,  NO,  OK,  NO),
  grace:  people(NO,  OK,  OK,  OK,  OK,  OK),
  nobody: people(OUT, OUT, OUT, OUT, OUT, OUT),
};

// Spec §9: moving someone to another team: an admin of their BU.
// biome-ignore format: a lined-up table
const MOVE_TO_TEAM: Rule = {
  // Columns: self, Ben, Dan, Newbie, Nina, Hal
  priya:  people(NO,  NO,  NO,  NO,  NO,  NO),
  newbie: people(NO,  NO,  NO,  NO,  NO,  NO),
  tom:    people(OK,  OK,  OK,  OK,  NO,  NO),
  nadia:  people(OK,  NO,  NO,  NO,  OK,  NO),
  grace:  people(OK,  OK,  OK,  OK,  OK,  OK),
  nobody: people(OUT, OUT, OUT, OUT, OUT, OUT),
};

// Spec §1.3: moving someone to another BU: super admins only.
// biome-ignore format: a lined-up table
const MOVE_TO_UNIT: Rule = {
  // Columns: self, Ben, Dan, Newbie, Nina, Hal
  priya:  people(NO,  NO,  NO,  NO,  NO,  NO),
  newbie: people(NO,  NO,  NO,  NO,  NO,  NO),
  tom:    people(NO,  NO,  NO,  NO,  NO,  NO),
  nadia:  people(NO,  NO,  NO,  NO,  NO,  NO),
  grace:  people(OK,  OK,  OK,  OK,  OK,  OK),
  nobody: people(OUT, OUT, OUT, OUT, OUT, OUT),
};

// Spec §1.2, §9: a BU's teams: its admins, and super admins.
// biome-ignore format: a lined-up table
const TEAMS: Rule = {
  // Columns: West, North, Corporate
  priya:  units(NO,  NO,  NO),
  newbie: units(NO,  NO,  NO),
  tom:    units(OK,  NO,  NO),
  nadia:  units(NO,  OK,  NO),
  grace:  units(OK,  OK,  OK),
  nobody: units(OUT, OUT, OUT),
};

// Spec §1.3: renaming and hiding BUs: super admins only.
// biome-ignore format: a lined-up table
const BUSINESS_UNITS: Rule = {
  // Columns: West, North, Corporate
  priya:  units(NO,  NO,  NO),
  newbie: units(NO,  NO,  NO),
  tom:    units(NO,  NO,  NO),
  nadia:  units(NO,  NO,  NO),
  grace:  units(OK,  OK,  OK),
  nobody: units(OUT, OUT, OUT),
};

// Spec §10: printing a BU's attendance sheet: its admins, and super admins.
// biome-ignore format: a lined-up table
const PRINTING: Rule = {
  // Columns: West, North, Corporate
  priya:  units(DENIED, DENIED, DENIED),
  newbie: units(DENIED, DENIED, DENIED),
  tom:    units(OK,     DENIED, DENIED),
  nadia:  units(DENIED, OK,     DENIED),
  grace:  units(OK,     OK,     OK),
  nobody: units(OUT,    OUT,    OUT),
};

// Spec §1.3: creating a BU, and deleting an empty one: super admins only.
const SUPER_ADMINS: Rule = {
  priya: none(NO),
  newbie: none(NO),
  tom: none(NO),
  nadia: none(NO),
  grace: none(OK),
  nobody: none(OUT),
};

// Spec §6.1: public holidays are shared, so any admin.
const ADMINS: Rule = {
  priya: none(NO),
  newbie: none(NO),
  tom: none(OK),
  nadia: none(OK),
  grace: none(OK),
  nobody: none(OUT),
};

// Your own settings (view, banner, collapsed teams): anyone signed in.
const SIGNED_IN: Rule = {
  priya: none(OK),
  newbie: none(OK),
  tom: none(OK),
  nadia: none(OK),
  grace: none(OK),
  nobody: none(OUT),
};

// The health check: anyone, signed in or not.
const ANYONE: Rule = {
  priya: none(OK),
  newbie: none(OK),
  tom: none(OK),
  nadia: none(OK),
  grace: none(OK),
  nobody: none(OK),
};

const MATRIX: { action: string; rule: Rule }[] = [
  { action: "createBookingAction", rule: BOOKINGS },
  { action: "updateBookingAction", rule: BOOKINGS },
  { action: "deleteBookingAction", rule: BOOKINGS },
  { action: "removeBookingDayAction", rule: BOOKINGS },
  { action: "trimBookingAction", rule: BOOKINGS },
  { action: "restoreBookingAction", rule: BOOKINGS },
  { action: "setAvailabilityOverrideAction", rule: PROFILES },
  { action: "updatePreferredNameAction", rule: PROFILES },
  { action: "updateWorkingPatternAction", rule: PROFILES },
  { action: "cancelPendingPatternAction", rule: PROFILES },
  { action: "deleteUserAction", rule: DELETE_PERSON },
  { action: "moveUserToTeamAction", rule: MOVE_TO_TEAM },
  { action: "moveUserToBusinessUnitAction", rule: MOVE_TO_UNIT },
  { action: "createTeamAction", rule: TEAMS },
  { action: "renameTeamAction", rule: TEAMS },
  { action: "moveTeamAction", rule: TEAMS },
  { action: "deleteTeamAction", rule: TEAMS },
  { action: "renameBusinessUnitAction", rule: BUSINESS_UNITS },
  { action: "setBusinessUnitHiddenAction", rule: BUSINESS_UNITS },
  { action: "createBusinessUnitAction", rule: SUPER_ADMINS },
  { action: "deleteBusinessUnitAction", rule: SUPER_ADMINS },
  { action: "previewPublicHolidayChangeAction", rule: ADMINS },
  { action: "savePublicHolidayChangeAction", rule: ADMINS },
  { action: "setViewPreference", rule: SIGNED_IN },
  { action: "dismissUnassignedBanner", rule: SIGNED_IN },
  { action: "setTeamCollapsed", rule: SIGNED_IN },
  { action: "GET /api/export/attendance", rule: PRINTING },
  { action: "GET /api/health", rule: ANYONE },
];

// Sign-in itself: used before there's a session, so there's nothing to check here. The
// browser tests cover them (auth, onboarding and route-states specs), and the production
// check proves dev sign-in is gone.
const SIGN_IN_ACTIONS = [
  "signInWithSso",
  "goToDevSignIn",
  "signInAsDevProfile",
  "signInAsCustomProfile",
  "signOut",
  "joinBusinessUnit",
];
const SIGN_IN_ROUTES = ["/api/auth/[...all]"]; // Better Auth's own endpoints

// One case per action, person and target.
const cases: { action: string; actor: string; target: string; expected: string }[] = [];
for (const { action, rule } of MATRIX) {
  for (const [actor, outcomes] of Object.entries(rule)) {
    for (const [target, expected] of Object.entries(outcomes)) {
      cases.push({ action, actor, target, expected });
    }
  }
}

// What came back: "ok", an error code, a route's HTTP status, or UNAUTHENTICATED.
async function outcomeOf(answer: ReturnType<(typeof RUN)[string]>) {
  try {
    const value = await answer;
    if (value instanceof Response) return value.ok ? OK : String(value.status);
    return value.ok ? OK : value.error?.code;
  } catch (error) {
    // requireUser runs before the action's own error handling, so this one is thrown.
    if (error instanceof Error && error.message === OUT) return OUT;
    throw error;
  }
}

describe("the permission matrix", () => {
  it.each(cases)("$action by $actor on $target: $expected", async ({
    action,
    actor,
    target,
    expected,
  }) => {
    const world = await createWorld();
    session.actor = actor === "nobody" ? null : world.people[actor];
    // Signed out, "self" has to mean someone, so it's Priya.
    const actorId = actor === "nobody" ? "priya" : actor;
    expect(await outcomeOf(RUN[action]({ world, actorId, target }))).toBe(expected);
  });
});

describe("the matrix covers everything", () => {
  it("lists every server action", () => {
    const folder = path.resolve("src/server/actions");
    const exported = readdirSync(folder).flatMap((file) => {
      const source = readFileSync(path.join(folder, file), "utf8");
      return [...source.matchAll(/export (?:const|async function|function) (\w+)/g)].map(
        (match) => match[1],
      );
    });
    const listed = [...MATRIX.map((entry) => entry.action), ...SIGN_IN_ACTIONS];
    expect(exported.filter((name) => !listed.includes(name))).toEqual([]);
  });

  it("lists every route", () => {
    const folder = path.resolve("src/app/api");
    const routes = readdirSync(folder, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith("route.ts"))
      .map((file) => `/api/${path.dirname(file).replaceAll("\\", "/")}`);
    const listed = [...MATRIX.map((entry) => entry.action.replace("GET ", "")), ...SIGN_IN_ROUTES];
    expect(routes.filter((route) => !listed.includes(route))).toEqual([]);
  });

  it("has a way to run every action it lists", () => {
    expect(MATRIX.filter((entry) => !RUN[entry.action])).toEqual([]);
  });
});
