// The id of a person, booking, team, business unit or public holiday, as sent by the
// browser. The database makes them (UUIDs, 36 characters); the limit stops a huge value
// from ever reaching a query (T36).
import { z } from "zod";

export const idSchema = z.string().min(1, "Missing id.").max(64, "That id is too long.");
