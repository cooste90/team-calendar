import type { Metadata } from "next";
import { cookies } from "next/headers";
import { personFilterOptions, teamFilterOptions } from "@/domain/filter-options";
import { formatDocumentTitlePeriod, formatPeriodTitle } from "@/domain/format";
import { type Actor, canEditBookingsFor, canManageBusinessUnit } from "@/domain/permissions";
import { AdminDialog } from "@/features/admin/admin-dialog";
import { readSavedView, resolveCalendarView } from "@/features/calendar/calendar-view";
import { FilterSummary } from "@/features/calendar/filters/filter-summary";
import { CalendarGrid } from "@/features/calendar/grid/calendar-grid";
import { AppHeader } from "@/features/calendar/header/app-header";
import { NavigationProgress, PendingArea } from "@/features/calendar/header/navigation-transition";
import { UnassignedBanner } from "@/features/calendar/unassigned-banner";
import { ProfileDialog } from "@/features/profile/profile-dialog";
import { ProfileNotAllowed } from "@/features/profile/profile-not-allowed";
import { UNASSIGNED_BANNER_COOKIE } from "@/lib/search-params";
import { getBusinessUnitBySlug, getVisibleBusinessUnits } from "@/server/queries/business-units";
import { getCalendarData } from "@/server/queries/calendar";
import { getProfile, getProfileLeave } from "@/server/queries/profile";
import { getAdminPublicHolidays } from "@/server/queries/public-holidays";
import { getAdminTeams } from "@/server/queries/teams";
import { getUserMenuDetails } from "@/server/queries/user-menu";
import { getAdminUsers } from "@/server/queries/users";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

// e.g. "Week of 8 Nov 2026 · West Operations · WestCal", or "My profile · WestCal" while
// the profile is open (accessibility §1).
export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const actor = await requireUser();
  const { params, view, period } = await resolveCalendarView(searchParams);
  const profile = await getOpenProfile(actor, params);
  if (profile) {
    return { title: `${profile.title} · WestCal` };
  }
  const businessUnit = await getBusinessUnitBySlug(actor, params.bu);
  if (params.admin && canManageBusinessUnit(actor, businessUnit.id)) {
    return { title: `Admin · ${businessUnit.name} · WestCal` };
  }
  return {
    title: `${formatDocumentTitlePeriod(view, period.from)} · ${businessUnit.name} · WestCal`,
  };
}

// The profile the URL asks for (?profile=me or ?person=<id>), if the viewer may see it.
function getOpenProfile(actor: Actor, params: { profile: "me" | null; person: string | null }) {
  const userId = params.profile === "me" ? actor.id : params.person;
  if (!userId) return null;
  return getProfile(actor, userId, serverToday());
}

// The calendar: header, title and grid. The data is loaded here on the server, so the
// first paint already shows the grid (architecture §6.1).
export default async function CalendarPage({ searchParams }: PageProps<"/">) {
  const actor = await requireUser();
  const { params, view, period } = await resolveCalendarView(searchParams);
  const businessUnit = await getBusinessUnitBySlug(actor, params.bu);
  const data = await getCalendarData(actor, businessUnit, period.from, period.to);
  const businessUnits = await getVisibleBusinessUnits(actor);
  const ownBusinessUnit = await getBusinessUnitBySlug(actor, null);
  const teamOptions = teamFilterOptions(data.teams);
  // An unassigned USER can't book for anyone, not even themselves (spec §1.4, §5.3).
  // Admins can book in their BU whether or not they're in a team, so they never see it.
  const showUnassignedBanner =
    !canEditBookingsFor(actor, actor) && !(await cookies()).has(UNASSIGNED_BANNER_COOKIE);
  const profile = await getOpenProfile(actor, params);
  const leave = profile && (await getProfileLeave(actor, profile.id, serverToday()));
  const profileRequested = params.profile !== null || params.person !== null;
  // ?admin= manages the BU on screen. Someone who can't manage it gets no dialog (null).
  const adminTeams = params.admin && (await getAdminTeams(actor, businessUnit.id));
  const adminUsers = adminTeams && (await getAdminUsers(actor, businessUnit.id));
  const adminHolidays = adminTeams && (await getAdminPublicHolidays(actor));

  return (
    <>
      <AppHeader
        user={await getUserMenuDetails(actor, ownBusinessUnit.name)}
        businessUnits={businessUnits}
        ownBusinessUnitSlug={ownBusinessUnit.slug}
        defaultView={await readSavedView()}
        today={data.today}
        teamOptions={teamOptions}
        personOptions={personFilterOptions(data.teams, data.people)}
      />
      <NavigationProgress />
      <main id="main" className="flex flex-1 flex-col">
        <PendingArea>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-5 pt-[1.125rem] pb-3">
            <h1 className="font-[650] text-[1.3125rem] tracking-[-0.015em]">
              {formatPeriodTitle(view, period)}
            </h1>
            <FilterSummary businessUnitName={businessUnit.name} teamOptions={teamOptions} />
          </div>
          {showUnassignedBanner && <UnassignedBanner />}
          <CalendarGrid data={data} view={view} period={period} />
        </PendingArea>
      </main>
      {/* key: a different person's profile starts with fresh forms. */}
      {profile && leave && <ProfileDialog key={profile.id} profile={profile} leave={leave} />}
      {profileRequested && !profile && <ProfileNotAllowed />}
      {/* key: another BU's teams start with fresh forms. */}
      {adminTeams && adminUsers && adminHolidays && (
        <AdminDialog
          key={businessUnit.id}
          viewer={actor}
          businessUnit={businessUnit}
          businessUnits={businessUnits.filter((unit) => canManageBusinessUnit(actor, unit.id))}
          teams={adminTeams}
          users={adminUsers}
          holidays={adminHolidays}
          today={data.today}
        />
      )}
    </>
  );
}
