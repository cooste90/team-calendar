// Working days as the server actions accept them (spec §4): a day swap's value and a
// weekly pattern. The types are in src/domain/availability.ts.
import { z } from "zod";

export const workDaySchema = z.enum(["FULL", "AM", "PM", "OFF"]);

// Seven days, Sunday first.
export const weeklyPatternSchema = z.array(workDaySchema).length(7);
