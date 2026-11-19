"use client";

import { useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { InitialsAvatar } from "@/components/initials-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeaveSummary } from "@/domain/tallies";
import { calendarSearchParams } from "@/lib/search-params";
import type { ProfileData } from "@/server/queries/profile";
import { DetailsTab } from "./details-tab";
import { HistoryTab } from "./history-tab";
import { PatternTab } from "./pattern-tab";
import { UpcomingTab } from "./upcoming-tab";

type Props = { profile: ProfileData; leave: LeaveSummary };

// The profile (spec §7), for the viewer or, for an admin, someone else. It's a modal
// over the grid with its own URL (?profile=me or ?person=<id>, and ?tab=), so a link
// can open it and Back closes it. The page renders it when the URL asks for it.
export function ProfileDialog({ profile, leave }: Props) {
  const [params, setParams] = useQueryStates(calendarSearchParams);
  const [announcement, setAnnouncement] = useState("");
  const open = params.profile !== null || params.person !== null;

  function close() {
    // Replace, not push, so Back doesn't reopen it. shallow: false re-renders the page
    // without the dialog, which also puts the tab title back.
    setParams({ profile: null, person: null, tab: null }, { history: "replace", shallow: false });
  }

  // A toast, and the same words inside the dialog for screen readers: while the dialog
  // is open, the rest of the page (toasts included) is hidden from them.
  function announce(message: string) {
    toast.success(message);
    setAnnouncement(message);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-[37.5rem]">
        <DialogHeader className="gap-3 px-6 pt-6 pb-4">
          <DialogTitle className="font-[650] text-[1.1875rem] tracking-[-0.015em]">
            {profile.title}
          </DialogTitle>
          <div className="flex items-center gap-3">
            <InitialsAvatar initials={profile.initials} className="size-11 text-base" />
            <DialogDescription className="flex min-w-0 flex-col">
              <span className="font-semibold text-foreground">{profile.name}</span>
              <span>
                {profile.businessUnitName} · {profile.teamName}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>
        <Tabs
          value={params.tab}
          // parse turns the plain string Radix hands back into one of the four tab names.
          onValueChange={(value) =>
            setParams({ tab: calendarSearchParams.tab.parse(value) }, { history: "replace" })
          }
          className="min-h-0 flex-1 gap-0"
        >
          {/* On phones the four tabs wrap onto a second row. */}
          <TabsList variant="line" className="mx-6 w-auto justify-start border-b">
            <TabsTrigger value="details" className="px-2.5">
              Details
            </TabsTrigger>
            <TabsTrigger value="pattern" className="px-2.5">
              Working pattern
            </TabsTrigger>
            <TabsTrigger value="history" className="px-2.5">
              Leave history
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="px-2.5">
              Upcoming leave
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="overflow-y-auto px-6 pt-5 pb-6">
            <DetailsTab profile={profile} onSaved={announce} />
          </TabsContent>
          <TabsContent value="pattern" className="overflow-y-auto px-6 pt-5 pb-6">
            <PatternTab profile={profile} onSaved={announce} />
          </TabsContent>
          <TabsContent value="history" className="overflow-y-auto px-6 pt-5 pb-6">
            <HistoryTab history={leave.history} />
          </TabsContent>
          <TabsContent value="upcoming" className="overflow-y-auto px-6 pt-5 pb-6">
            <UpcomingTab upcoming={leave.upcoming} />
          </TabsContent>
        </Tabs>
        {/* <output> is a polite live region (role "status"). */}
        <output className="sr-only">{announcement}</output>
      </DialogContent>
    </Dialog>
  );
}
