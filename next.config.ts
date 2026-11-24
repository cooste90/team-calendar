import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
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
