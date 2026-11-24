import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accessibility statement · WestCal" };

const headingClass = "mt-2 font-semibold text-lg";
const listClass = "flex list-disc flex-col gap-1.5 pl-5";

// The accessibility statement (T35). Anyone can read it, signed in or not, so someone
// who can't sign in can still find out how to report it. Update "Last reviewed" and the
// known limitations whenever they change.
export default function AccessibilityPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Wordmark />
      <h1 className="font-semibold text-2xl">Accessibility statement for WestCal</h1>
      <p>
        WestCal shows who's in and who's off across your team. We want as many people as possible to
        be able to use it. You should be able to:
      </p>
      <ul className={listClass}>
        <li>use everything with a keyboard alone, including the calendar grid</li>
        <li>use it with a screen reader, such as NVDA or Narrator</li>
        <li>zoom in up to 400% without losing anything</li>
        <li>use high contrast mode, light or dark themes, and turn animation off</li>
        <li>read every leave type as a code (such as AL), not only as a colour</li>
      </ul>

      <h2 className={headingClass}>How accessible WestCal is</h2>
      <p>
        We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. We know of
        these limitations:
      </p>
      <ul className={listClass}>
        <li>
          On a narrow screen, or zoomed right in, the calendar scrolls sideways as well as up and
          down. The names and dates stay in place while it scrolls. WCAG allows this for tables of
          data.
        </li>
        <li>
          The printable attendance sheet (PDF) is made for paper, not for screen readers. The same
          information is on the calendar.
        </li>
        <li>
          Testing with screen readers by hand (NVDA and Narrator) is still to be done. Until then
          our testing has been automated and with a keyboard.
        </li>
      </ul>

      <h2 className={headingClass}>Reporting a problem</h2>
      <p>
        If something doesn't work for you, or you need information in another format, contact{" "}
        <strong>[team email to be added]</strong>. Tell us the page, what you were trying to do, and
        what you use (for example, your browser and screen reader).
      </p>

      <h2 className={headingClass}>How we tested</h2>
      <p>
        Every screen is checked automatically with axe in light and dark themes, and with high
        contrast, reduced motion, zoom and wider text spacing. The main tasks (booking, editing and
        deleting leave, filtering, changing the theme, your profile and admin) are tested using only
        the keyboard.
      </p>
      <p className="text-muted-foreground text-sm">Last reviewed 24 November 2026.</p>

      <Button asChild size="lg" className="self-start">
        <Link href="/">Go to the calendar</Link>
      </Button>
    </main>
  );
}
