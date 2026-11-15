"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { UNASSIGNED_BANNER_COOKIE } from "@/lib/search-params";
import { authedAction } from "@/server/authed-action";

// Hides the unassigned banner until the browser is closed: no maxAge makes it a
// session cookie.
export const dismissUnassignedBanner = authedAction(z.void(), async () => {
  const cookieStore = await cookies();
  cookieStore.set(UNASSIGNED_BANNER_COOKIE, "yes", { sameSite: "lax", path: "/" });
});
