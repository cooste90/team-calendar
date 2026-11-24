import type { MetadataRoute } from "next";

// Lets browsers install WestCal as an app, with its name, logo and colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WestCal",
    short_name: "WestCal",
    description: "See who's in and who's off across your team.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6fa",
    theme_color: "#4f46e5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
