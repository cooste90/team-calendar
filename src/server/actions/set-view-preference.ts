"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { VIEW_COOKIE } from "@/lib/search-params";
import { authedAction } from "@/server/authed-action";

const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

// Remembers week or month view, so the next visit opens in it (spec §2.2).
export const setViewPreference = authedAction(z.enum(["week", "month"]), async (view) => {
  const cookieStore = await cookies();
  cookieStore.set(VIEW_COOKIE, view, { maxAge: ONE_YEAR_IN_SECONDS, sameSite: "lax", path: "/" });
});
