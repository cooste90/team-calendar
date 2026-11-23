// What a team name may be (T29). The admin's New team and Rename forms check with it
// before sending, and the server actions check again.
import { z } from "zod";
import { UNASSIGNED_GROUP_NAME } from "@/domain/teams";

const TEAM_NAME_MAX_LENGTH = 60;

export const teamNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a team name.")
  .max(TEAM_NAME_MAX_LENGTH, `Team names can be up to ${TEAM_NAME_MAX_LENGTH} characters.`)
  // Unassigned is the built-in group, so a team called that would look like it (spec §1.4).
  .refine(
    (name) => name.toLowerCase() !== UNASSIGNED_GROUP_NAME.toLowerCase(),
    `"${UNASSIGNED_GROUP_NAME}" is built in, so a team can't use that name.`,
  );
