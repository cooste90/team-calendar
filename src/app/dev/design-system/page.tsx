import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "Design system · WestCal" };

// A dev-only page for checking the design tokens and components. Hidden in production.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <Gallery />;
}
