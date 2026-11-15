"use server";

import { z } from "zod";
import { authedAction } from "@/server/authed-action";
import { saveTeamCollapsed } from "@/server/services/save-team-collapsed";

// The grid's team collapse buttons. It says "collapsed or not" rather than "toggle", so
// sending the same request twice (two tabs, a retry) can't flip it the wrong way.
export const setTeamCollapsed = authedAction(
  z.object({ groupId: z.string().min(1).max(64), collapsed: z.boolean() }),
  async ({ groupId, collapsed }, actor) => {
    await saveTeamCollapsed(actor, groupId, collapsed);
  },
);
