import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// One static Content Security Policy for every page (T36). Scripts and styles may be
// inline: Next.js and next-themes add small inline scripts, and nonces would need extra
// proxy code and make every page render on each request. That isn't worth it for an
// internal app behind SSO. In development React also needs eval (Next's CSP guide).
// Signing in goes to the identity provider by a page navigation, which connect-src
// doesn't govern, so the SSO origin doesn't need to be listed.
let scriptSrc = "script-src 'self' 'unsafe-inline'";
if (!isProduction) {
  scriptSrc += " 'unsafe-eval'";
}
const contentSecurityPolicy = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Older browsers that don't know frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
];
// Production only: once a browser has seen it, it won't use plain http for a year, which
// would get in the way of http://localhost.
if (isProduction) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Lets requireUser call unauthorized(), which shows app/unauthorized.tsx ("Your
    // session has ended") in place of the page, even mid-save (T34).
    authInterrupts: true,
    // Turbopack's on-disk dev cache (on by default in Next 16) made pages with server
    // actions reload endlessly in dev ("HMR hash mismatch"; seen on Windows, 16.4.6).
    // Turning it off only makes restarting `pnpm dev` a little slower. Try removing
    // this after a Next.js upgrade.
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
