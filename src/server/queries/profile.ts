import "server-only";
import { cache } from "react";
import { currentAndPendingPattern, type WeeklyPattern } from "@/domain/availability";
import { type CalendarDate, nextSunday } from "@/domain/dates";
import { displayName, initialsOf } from "@/domain/display-name";
import { type Actor, canEditProfileOf } from "@/domain/permissions";
import { UNASSIGNED_GROUP_NAME } from "@/domain/teams";
import { db } from "../db";
import { toPatternVersion } from "../mappers";

export type ProfileData = {
  id: string;
  title: string; // "My profile", or "Priya Shah's profile" for an admin
  isViewer: boolean;
  name: string; // the display name
  initials: string;
  firstName: string; // from SSO
  preferredName: string | null;
  ssoName: string; // first name and surname from SSO
  email: string;
  employeeNumber: string;
  businessUnitName: string;
  teamName: string;
  currentPattern: WeeklyPattern;
  pendingPattern: WeeklyPattern | null; // waiting to start on nextChangeDate
  nextChangeDate: CalendarDate; // the Sunday a pattern saved today starts on
};

// The profile dialog's data (spec §7). Only for the person themselves or an admin of
// their BU; anyone else gets null, as if the person didn't exist, so nothing about them
// reaches the browser. cache() means one lookup per request: the page and its tab title
// both ask for it.
export const getProfile = cache(
  async (actor: Actor, userId: string, today: CalendarDate): Promise<ProfileData | null> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        preferredName: true,
        surname: true,
        email: true,
        employeeNumber: true,
        businessUnitId: true,
        teamId: true,
        businessUnit: { select: { name: true } },
        team: { select: { name: true } },
        patterns: true,
      },
    });
    if (!user?.businessUnitId || !user.businessUnit) return null;
    const subject = { id: user.id, businessUnitId: user.businessUnitId, teamId: user.teamId };
    if (!canEditProfileOf(actor, subject)) return null;

    const isViewer = user.id === actor.id;
    const name = displayName(user);
    const patterns = currentAndPendingPattern(user.patterns.map(toPatternVersion), today);
    return {
      id: user.id,
      title: isViewer ? "My profile" : `${name}'s profile`,
      isViewer,
      name,
      initials: initialsOf(user),
      firstName: user.firstName,
      preferredName: user.preferredName,
      ssoName: user.name, // kept as "firstName surname" by the SSO sync
      email: user.email,
      employeeNumber: user.employeeNumber,
      businessUnitName: user.businessUnit.name,
      teamName: user.team?.name ?? UNASSIGNED_GROUP_NAME,
      currentPattern: patterns.current,
      pendingPattern: patterns.pending,
      nextChangeDate: nextSunday(today),
    };
  },
);
