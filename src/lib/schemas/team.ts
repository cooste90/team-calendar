// What a team name may be (T29). The admin's New team and Rename forms check with it
// before sending, and the server actions check again.
import { z } from "zod";

const TEAM_NAME_MAX_LENGTH = 60;

export const teamNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a team name.")
  .max(TEAM_NAME_MAX_LENGTH, `Team names can be up to ${TEAM_NAME_MAX_LENGTH} characters.`);
