// What the admin dialog's Public holidays tab sends (T31): a new holiday, a change to one
// (name and date together), or a delete. The form checks the name with it before
// sending, and the preview and save actions check the whole change again.
import { z } from "zod";
import { calendarDateSchema } from "@/domain/dates";

const NAME_MAX_LENGTH = 60;

export const holidayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(NAME_MAX_LENGTH, `Names can be up to ${NAME_MAX_LENGTH} characters.`);

export const holidayChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create"), name: holidayNameSchema, date: calendarDateSchema }),
  z.object({
    kind: z.literal("update"),
    id: z.string().min(1),
    name: holidayNameSchema,
    date: calendarDateSchema,
  }),
  z.object({ kind: z.literal("delete"), id: z.string().min(1) }),
]);

export type HolidayChange = z.output<typeof holidayChangeSchema>;
