import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { signInPageUrl } from "@/lib/callback-url";

// A quick first check on every request: no session cookie means not signed in.
// It only checks that the cookie exists. requireUser() does the real check on the server.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }
  // A server action (a save) goes through, so requireUser can show "Your session has
  // ended" in place of the page. A redirect would break the action's response.
  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  // After signing in, they come back to the page they asked for.
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(signInPageUrl("/sign-in", pathname + search), request.url));
}

// Pages and endpoints that work without signing in, plus Next's own files.
export const config = {
  matcher: [
    "/((?!sign-in|dev-sign-in|dev/|accessibility|api/auth|api/health|_next/static|_next/image|icon.svg|manifest.webmanifest).*)",
  ],
};
