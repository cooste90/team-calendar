import "server-only";
import { type Actor, canManagePublicHolidays } from "@/domain/permissions";
import type { PublicHoliday } from "@/domain/public-holidays";
import { db } from "../db";
import { toPublicHoliday } from "../mappers";

// The admin dialog's Public holidays tab (spec §6.1): every holiday, by date. Only for
// admins; anyone else gets null.
export async function getAdminPublicHolidays(actor: Actor): Promise<PublicHoliday[] | null> {
  if (!canManagePublicHolidays(actor)) return null;
  const rows = await db.publicHoliday.findMany({ orderBy: { date: "asc" } });
  return rows.map(toPublicHoliday);
}
