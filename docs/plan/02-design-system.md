# WestCal — Design system

**Visual reference:** the approved mockup canvas "WestCal design direction" (https://claude.ai/artifact/Aq7zARQnJRuY8t9pV5QFo6). The product owner has to share it before other people can open it. The tokens below are the source of truth. The mockup shows how they come together.

**Personality:** calm, fresh and quick to scan. Dusk indigo for actions and focus, sunset apricot for "today", and soft pastel fills for leave, always with a dark code label so colour is never the only cue.

---

## 1. Brand
- **Name:** WestCal. **Tagline** (optional, sign-in page): "See who's in, at a glance."
- **Logo:** a rounded square in Dusk indigo with an apricot half-sun setting over a white horizon line and a fainter reflection line. It is an inline SVG component (`src/components/brand/logo.tsx`), decorative next to the wordmark (`aria-hidden`) and `role="img"` with a label when it stands alone. The PDF uses a monochrome version.
- **Typeface:** **Geist** (UI) and **Geist Mono** (IDs, employee numbers), loaded with `next/font` (`geist` package or Google). Use tabular numerals in the grid header and counts (`font-variant-numeric: tabular-nums`).

## 2. Colour tokens
These are defined as CSS custom properties in `src/app/globals.css`, with `:root` for light and `.dark` for dark, and exposed to Tailwind through `@theme inline`. They map onto the shadcn variable names (`--background`, `--foreground`, `--primary` …) **and** add WestCal names.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` (`--background`) | `#F6F6FA` | `#0D0D13` | App background |
| `--surface` (`--card`, `--popover`) | `#FFFFFF` | `#15151D` | Header, grid, dialogs |
| `--surface-2` (`--muted`, `--secondary`) | `#F2F2F8` | `#1B1B25` | Team rows, segmented controls, hovers |
| `--border` | `#E2E2EC` | `#2A2A37` | Component borders |
| `--border-soft` | `#ECECF3` | `#21212C` | Grid lines |
| `--text` (`--foreground`) | `#17171F` | `#EDEDF4` | Body text |
| `--text-muted` (`--muted-foreground`) | `#5C5C6E` | `#A4A4B8` | Secondary text (≥ 4.5:1 on bg and surface) |
| `--primary` (text and focus use) | `#4F46E5` | `#8F89FF` | Links, focus, selected outlines |
| `--primary-solid` (fills with white text) | `#4F46E5` | `#5B52E8` | Primary buttons, "You" chip |
| `--primary-soft` | `#ECEBFE` | `#232144` | Tags, selected cards |
| `--focus` (`--ring`) | `#4F46E5` | `#A5A0FF` | 2px focus ring, 2px offset |
| `--today` | `#FFF4EA` | `#1C1814` | Today column tint |
| `--sunset` / `--on-sunset` | `#C2410C` / `#FFFFFF` | `#FDBA74` / `#1F1306` | Today date pill |
| `--me` | `#F4F3FF` | `#191830` | Viewer's row tint (solid, so sticky cells cover) |
| `--me-today` | `#FFE8D4` | `#2B2124` | Crosshair cell (viewer row × today) |
| `--hatch` | `rgba(23,23,31,.10)` | `rgba(255,255,255,.07)` | Non-working day hatching |
| `--bar-hatch` | `rgba(255,255,255,.65)` | `rgba(0,0,0,.38)` | Non-working days inside a bar |
| `--destructive` | `#B42318` | `#FF8A80` | Delete actions, errors |
| `--warning-bg` / `--warning-fg` / `--warning-border` | `#FFF4EA` / `#8A2F08` / `#F6C9A4` | `#2A1D12` / `#FDC89A` / `#5A3A1E` | Conflict alert |

### 2.1 Leave colours (fill / label text)
Each pair is well above 4.5:1. The fill is never the only cue, because the code text is always present (WCAG 1.4.1).

| Type | Code | Light fill / text | Dark fill / text |
|---|---|---|---|
| Annual leave | AL | `#D6E6FF` / `#173A6B` | `#1E3456` / `#CFE0FF` |
| Flexi leave | FL | `#CDEEDD` / `#11492F` | `#173D2C` / `#C4EFD9` |
| Sickness | SK | `#FFD9CF` / `#6E2513` | `#4A2219` / `#FFD4C8` |
| Special leave | SL | `#E6DDFF` / `#3C2A7D` | `#2F2754` / `#E2D8FF` |
| Parental leave | PL | `#FFD8EA` / `#6E1D47` | `#4A1E35` / `#FFD3E7` |
| Wellbeing day | WBD | `#F8EEB4` / `#574504` | `#3D3613` / `#F6E9A6` |
| Other | OT | `#E7E5E0` / `#3B3934` | `#2E2D2A` / `#E4E1DA` |
| Working from home | WFH | `#C9EEF0` / `#0E4A50` | `#153D41` / `#C3EDEF` |
| Public holiday | PH | `#FFE3C2` / `#6B3A07` | `#46301A` / `#FFDCB4` |

Tokens are named `--leave-al-bg`, `--leave-al-fg` and so on. The metadata lives in one map, `src/domain/leave-types.ts`: `{ type, code, label, tallied, tallyWindow }`. A unit test checks every pair against WCAG contrast (≥ 4.5:1) using a small relative-luminance helper. **This test must stay green if colours are ever changed.**

### 2.2 Forced colours (Windows High Contrast)
Under `@media (forced-colors: active)`:
- bars get a `1px solid CanvasText` border;
- the today column gets an outline;
- hatching becomes a `GrayText` pattern;
- the focus ring uses `Highlight`.
Never rely on `background-color` alone in this mode.

## 3. Type scale
| Role | Size / weight / tracking |
|---|---|
| Page title (period) | 21px / 650 / −0.015em |
| Dialog title | 19px / 650 / −0.015em |
| Body, controls | 14px / 400–500 |
| Grid bar label | 12px / 650 (month view 11px; half bars 9.5–10px) |
| Day header weekday | 11px / 500, muted; date number 15px / 600 (month view 13px) |
| Section labels | 11–13px / 600, uppercase 0.06–0.08em for menu section labels |

Every size is in `rem` so browser zoom and text resizing work (WCAG 1.4.4).

## 4. Shape, spacing and elevation
- **Radius:** controls 10px, cards and popovers 14px, dialogs 20px, bars 9px (month view 8px, half bars 6px), chips 7px, pills 999px.
- **Control height:** 36px (header), 38–44px (dialogs). Target size is always ≥ 24×24px, and ≥ 36px for primary controls.
- **Spacing:** 4px base. Header padding 10px × 20px; dialog padding 24px.
- **Shadow (popovers and dialogs):** light `0 16px 40px -12px rgba(23,23,31,.22), 0 2px 6px rgba(23,23,31,.06)`; dark `0 16px 40px -12px rgba(0,0,0,.7)` plus a 1px white 4% ring.

## 5. The grid
- **Name column** 236px (`--name-col`), sticky left, with a solid background. **Header row** 54px, sticky top. **Person rows** 42px; **team rows** 40px.
- **Day columns** are 2 half-tracks each, separated by `--border-soft`.
- **Bars:** height 30px (month 28px), 3px horizontal inset (2px for half bars). A clipped edge (a booking that continues beyond the visible range) is square with no inset.
- **Hatching:** `repeating-linear-gradient(135deg, var(--hatch) 0 1.5px, transparent 1.5px 7px)`. AM-only days hatch the right half; PM-only days hatch the left half.
- **Today:** the column is tinted `--today`, and the header date sits in a `--sunset` pill.
- **Viewer row:** `--me` tint, with a "You" chip next to the name.
- **Public holiday header marker:** a small chip with the PH name under the date, using PH colours.
- **Hover:** cell `--cell-hover` (primary at 7%); bar `translateY(-1px)` plus a slight saturation boost.

## 6. Motion
- **No animation library.** Everything is a CSS transition or a CSS `@keyframes` animation in `globals.css`. Durations 150–250ms for UI, 700ms for the booking grow. Easing `cubic-bezier(.22, 1, .36, 1)`, stored as the `--ease-out` token.
- **Booking grow:** one keyframe, `grow`, from `clip-path: inset(0 100% 0 0 round 9px)` to `inset(0 0 0 0 round 9px)`. The bar for the just-created booking gets the class `animate-grow`. This doesn't trigger layout and avoids text squish.
- **Team collapse:** instant. Only the chevron rotates (a 150ms transition).
- **View or period change:** the grid fades in (a 150ms `fade-in` class from `tw-animate-css`).
- **Dialogs and popovers:** the shadcn defaults (fade and zoom 95%).
- **`prefers-reduced-motion: reduce`:** one global CSS rule in `globals.css` turns every animation and transition off. No JavaScript is needed.

## 7. Components (shadcn, customised to the tokens)
Button (default / secondary / ghost / destructive / icon), Dialog, AlertDialog, Popover, HoverCard (Key), DropdownMenu, Select, Command (filters), Tabs, Tooltip, ToggleGroup (segmented controls), RadioGroup (type cards), Calendar plus a date-picker Popover, Field/Label/Input/Textarea, Badge, Avatar, Sonner, Skeleton, ScrollArea, Separator.

**Custom components:**
- `SegmentedControl`: a ToggleGroup styled as in the mockup.
- `LeaveChip`: code plus colours, with a tooltip giving the full name.
- `TypeRadioCard`: chip plus label, 44px tall, in a 3-column grid.
- `FilterBuilder`: a trigger button with a count badge, and a popover containing Command, checkable items, selected chips and "Clear".
- `RangeSummary`: an `aria-live="polite"` region.
- `ConflictAlert`.
- `DayHeader`.
- `GridCell`, `GridBar`.
- `TeamGroupRow`.

**Built so far (T04):** `Logo`, `Wordmark`, `LeaveChip` and `SegmentedControl` in `src/components/`, and the shadcn components above in `src/components/ui/`. T34 deleted the ones the app never used (Avatar, Command, HoverCard, InputGroup, RadioGroup, ScrollArea, Select); add them again with the shadcn CLI if a feature needs one. T34 also added `IconButton` (an icon-only button whose label is also its tooltip) and `StatusPage` (the frame for the not-found, error and session-ended pages). You can see them all at `/dev/design-system` (dev only). Notes on how they're wired:
- **Focus:** one global `:focus-visible` rule in `globals.css` draws the 2px ring with a 2px gap. shadcn's per-component focus rings were removed, so change focus styling in that one place.
- **Primary buttons** use `bg-primary-solid text-on-primary`. shadcn's `--primary` is the design's text/link colour, which is lighter in dark mode.
- **Theme preview:** add the class `light` or `dark` to any element to show that part of the page in that theme (the gallery uses this to show leave chips in both themes side by side).
- **Leave type details** (code, label, colour classes, how it's counted) come from `src/domain/leave-types.ts`, the single source.
- **Contrast:** `src/domain/__tests__/contrast.test.ts` reads the hex values from `globals.css` and checks 19 text/background pairs in both themes.

## 8. Writing style (UI copy)
- Sentence case. Short, plain words: "Add event", "Save changes", "Replace it".
- Dates follow en-GB, for example "Thu 12 Nov".
- Errors say what happened and what to do next, for example: "This clashes with Working from home on Fri 13 Nov (full day). Replace it, or change the dates."
- Avoid jargon. Admin-facing warnings include the scope, for example "Applies to every business unit (214 people)".
