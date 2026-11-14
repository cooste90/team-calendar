import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// A quick first check on every request: no session cookie means not signed in.
// It only checks that the cookie exists. requireUser() does the real check on the server.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

// Pages and endpoints that work without signing in, plus Next's own files.
export const config = {
  matcher: [
    "/((?!sign-in|dev-sign-in|dev/|api/auth|api/health|_next/static|_next/image|favicon.ico).*)",
  ],
};
