"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CalendarDate } from "@/domain/dates";
import type { Actor } from "@/domain/permissions";
import type { PublicHoliday } from "@/domain/public-holidays";
import { BusinessUnitSwitcher } from "@/features/calendar/header/business-unit-switcher";
import { useCalendarParams } from "@/features/calendar/use-calendar-params";
import { calendarSearchParams } from "@/lib/search-params";
import type { AdminBusinessUnit } from "@/server/queries/business-units";
import type { AdminTeams } from "@/server/queries/teams";
import type { AdminUser } from "@/server/queries/users";
import { BusinessUnitsTab } from "./business-units-tab";
import { HolidaysTab } from "./holidays-tab";
import { TeamsTab } from "./teams-tab";
import { UsersTab } from "./users-tab";

export type BusinessUnitOption = { id: string; slug: string; name: string; hidden: boolean };

type Props = {
  viewer: Actor;
  businessUnit: BusinessUnitOption; // the BU in the URL, the one being managed
  businessUnits: BusinessUnitOption[]; // every BU the viewer may manage
  teams: AdminTeams;
  users: AdminUser[];
  holidays: PublicHoliday[]; // global, the same in every BU
  allBusinessUnits: AdminBusinessUnit[] | null; // super admins only
  today: CalendarDate;
};

// The admin dialog (spec §9): a modal over the grid with its own URL (?admin=teams,
// ?admin=users, ?admin=holidays or ?admin=units), so Back closes it. Teams and Users are
// for the BU the calendar is showing. Business units is for super admins only; anyone else
// asking for it gets Teams.
export function AdminDialog({
  viewer,
  businessUnit,
  businessUnits,
  teams,
  users,
  holidays,
  allBusinessUnits,
  today,
}: Props) {
  const [params, setParams] = useCalendarParams();
  const [announcement, setAnnouncement] = useState("");
  let tab = params.admin ?? "teams";
  if (tab === "units" && !allBusinessUnits) tab = "teams";

  function close() {
    // Replace, not push, so Back doesn't reopen it.
    setParams({ admin: null }, { history: "replace" });
  }

  return (
    <Dialog
      open={params.admin !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:h-[min(46rem,calc(100dvh-2rem))] sm:max-w-[37.5rem]"
        onEscapeKeyDown={(event) => {
          // Esc while renaming a team cancels the rename, not the whole dialog.
          if (event.target instanceof Element && event.target.closest("[data-renaming]")) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="gap-3 px-6 pt-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <DialogTitle className="font-[650] text-[1.1875rem] tracking-[-0.015em]">
              Admin · {businessUnit.name}
            </DialogTitle>
            {/* Super admins only: an ADMIN has just their own BU, so it hides itself. */}
            <BusinessUnitSwitcher
              businessUnits={businessUnits}
              value={businessUnit.slug}
              // Filters belong to one BU, so switching BU clears them, as in the header.
              onChange={(slug) => setParams({ bu: slug, teams: null, people: null })}
            />
          </div>
          <DialogDescription>Changes show on everyone's calendar straight away.</DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          // Every tab's data is already here, so switching only changes the URL (shallow).
          // parse turns the plain string Radix hands back into one of the tab names.
          onValueChange={(value) =>
            setParams(
              { admin: calendarSearchParams.admin.parse(value) },
              { history: "replace", shallow: true },
            )
          }
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList variant="line" className="mx-6 w-auto justify-start border-b">
            <TabsTrigger value="teams" className="px-2.5">
              Teams
            </TabsTrigger>
            <TabsTrigger value="users" className="px-2.5">
              Users
            </TabsTrigger>
            <TabsTrigger value="holidays" className="px-2.5">
              Public holidays
            </TabsTrigger>
            {allBusinessUnits && (
              <TabsTrigger value="units" className="px-2.5">
                Business units
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="teams" className="overflow-y-auto px-6 pt-5 pb-6">
            <TeamsTab businessUnitId={businessUnit.id} data={teams} onAnnounce={setAnnouncement} />
          </TabsContent>
          <TabsContent value="users" className="overflow-y-auto px-6 pt-5 pb-6">
            <UsersTab
              viewer={viewer}
              businessUnitId={businessUnit.id}
              otherBusinessUnits={businessUnits.filter((unit) => unit.id !== businessUnit.id)}
              teams={teams.teams}
              users={users}
              onAnnounce={setAnnouncement}
            />
          </TabsContent>
          <TabsContent value="holidays" className="overflow-y-auto px-6 pt-5 pb-6">
            <HolidaysTab holidays={holidays} today={today} onAnnounce={setAnnouncement} />
          </TabsContent>
          {allBusinessUnits && (
            <TabsContent value="units" className="overflow-y-auto px-6 pt-5 pb-6">
              <BusinessUnitsTab units={allBusinessUnits} onAnnounce={setAnnouncement} />
            </TabsContent>
          )}
        </Tabs>
        {/* <output> is a polite live region. While the dialog is open, screen readers
            can't reach the rest of the page, so the dialog says what happened itself. */}
        <output className="sr-only">{announcement}</output>
      </DialogContent>
    </Dialog>
  );
}
