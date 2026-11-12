# T04 — Design foundation

**Phase:** 0 · **Depends on:** T03 · **Size:** M

## Goal
Put the WestCal design system from `02-design-system.md` into code: tokens, fonts, theming, base components, and a dev-only gallery for checking them.

## Read first
- `02-design-system.md` (all of it). Mockup: the "Palette" and "App" artboards.
- `03-accessibility.md` §1
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` and `13-fonts.md`
- The current shadcn docs for Tailwind v4 (`components.json`, `@theme inline`, `tw-animate-css`), and the next-themes README

## Deliverables
1. **shadcn init:**
   - Tailwind v4, Radix-based, CSS variables, lucide icons, aliases matching `@/components/ui` and `@/lib/utils`.
   - Add these components: button, dialog, alert-dialog, popover, hover-card, dropdown-menu, select, command, tabs, tooltip, toggle-group, radio-group, calendar, label, input, textarea, field (or form), badge, avatar, sonner, skeleton, scroll-area, separator.
2. **Tokens in `globals.css`:**
   - Every light and dark token from the design system, plus the leave colour tokens.
   - Map them to the shadcn variable names and to Tailwind utilities through `@theme inline`, so you can write `bg-surface`, `text-muted-foreground`, `bg-leave-al` and `text-leave-al-fg`.
   - Radius scale, shadows, the hatch utility (`.bg-hatch`, `.bg-hatch-left`, `.bg-hatch-right`), and the `forced-colors` rules (§2.2).
3. **Fonts:** Geist and Geist Mono through `next/font`, applied to `<body>`, plus a tabular-nums utility.
4. **Theme:**
   - A `ThemeProvider` (next-themes, `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`) in the root layout, with `suppressHydrationWarning` on `<html>`.
   - Make sure there's no flash of the wrong theme. Read `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`.
5. **Brand components:** `src/components/brand/logo.tsx` (the SVG from the mockup) and `wordmark.tsx`.
6. **Custom primitives** (styled per the mockup):
   - `SegmentedControl`, wrapping ToggleGroup.
   - `LeaveChip`.
   - `src/domain/leave-types.ts`: the single source of type metadata (enum value → code, label, CSS token names, tallied, tally window).
7. **Contrast test:** `src/domain/__tests__/contrast.test.ts` asserts every leave fg/bg pair, and the text / text-muted pairs on bg and surface, in **both** themes, are ≥ 4.5:1. The test reads the hex values straight out of `globals.css` with a simple regex, so there's one source of truth and no generated CSS.
8. **Dev gallery `/dev/design-system`:**
   - Returns 404 in production.
   - Shows brand, colour swatches, the leave chips in both themes, buttons, inputs, the segmented control, dialog and popover examples, and a theme toggle.
   - An e2e test runs axe on it in light and dark.
9. **Animation and reduced motion (CSS only, no library):** the `--ease-out` token, the `grow` keyframe and `animate-grow` utility (design system §6), and one global `@media (prefers-reduced-motion: reduce)` rule that turns off all animations and transitions.

## Acceptance criteria
- The gallery matches the mockup palette visually in both themes, and the theme persists across reloads.
- The contrast test passes, and axe passes on the gallery in both themes.
- In forced-colors emulation, chips and buttons stay distinguishable (Playwright screenshot attached to the MR).

## Out of scope
The calendar UI.
