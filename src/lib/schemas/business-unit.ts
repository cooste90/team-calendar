// What a business unit name may be (T32). The Business units tab checks with it before
// sending, and the server actions check again.
import { z } from "zod";

const NAME_MAX_LENGTH = 60;

export const businessUnitNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(NAME_MAX_LENGTH, `Names can be up to ${NAME_MAX_LENGTH} characters.`);
