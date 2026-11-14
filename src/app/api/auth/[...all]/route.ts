import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Better Auth's own endpoints: SSO redirect and callback, sign-out, dev sign-in.
export const { GET, POST } = toNextJsHandler(auth);
