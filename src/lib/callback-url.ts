// Where to go after signing in. Only a path on this site is accepted, so a link can't
// send someone to another website once they've signed in (an "open redirect").
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string") return "/";
  // "//example.com" and "/\example.com" are read by browsers as another website.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

// A sign-in page, remembering where to come back to.
export function signInPageUrl(page: "/sign-in" | "/dev-sign-in", callbackUrl: string): string {
  if (callbackUrl === "/") return page;
  return `${page}?callbackURL=${encodeURIComponent(callbackUrl)}`;
}
