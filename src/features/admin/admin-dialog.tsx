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
import { BusinessUnitSwitcher } from "@/features/calendar/header/business-unit-switcher";
import { useCalendarParams } from "@/features/calendar/use-calendar-params";
import type { AdminTeams } from "@/server/queries/teams";
import { TeamsTab } from "./teams-tab";

type BusinessUnitOption = { id: string; slug: string; name: string; hidden: boolean };

type Props = {
  businessUnit: BusinessUnitOption; // the BU in the URL, the one being managed
  businessUnits: BusinessUnitOption[]; // every BU the viewer may manage
  teams: AdminTeams;
};

// The admin dialog (spec §9): a modal over the grid with its own URL (?admin=teams), so
// Back closes it. It manages the BU the calendar is showing. Only the Teams tab so far:
// Users, Public holidays and Business units come in T30–T32.
export function AdminDialog({ businessUnit, businessUnits, teams }: Props) {
  const [params, setParams] = useCalendarParams();
  const [announcement, setAnnouncement] = useState("");

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
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-[37.5rem]"
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
        <Tabs value="teams" className="min-h-0 flex-1 gap-0">
          <TabsList variant="line" className="mx-6 w-auto justify-start border-b">
            <TabsTrigger value="teams" className="px-2.5">
              Teams
            </TabsTrigger>
          </TabsList>
          <TabsContent value="teams" className="overflow-y-auto px-6 pt-5 pb-6">
            <TeamsTab businessUnitId={businessUnit.id} data={teams} onAnnounce={setAnnouncement} />
          </TabsContent>
        </Tabs>
        {/* <output> is a polite live region. While the dialog is open, screen readers
            can't reach the rest of the page, so the dialog says what happened itself. */}
        <output className="sr-only">{announcement}</output>
      </DialogContent>
    </Dialog>
  );
}
