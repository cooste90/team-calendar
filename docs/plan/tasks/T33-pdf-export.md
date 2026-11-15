# T33 — PDF attendance sheets

**Phase:** 7 · **Depends on:** T32 · **Size:** L

**From T20:** the "More" menu exists (`src/features/calendar/header/more-menu.tsx`). Add an Export item there for admins; it can open the Today / This week / Next week choice as a dialog or a submenu. In `app-header.tsx`, put the wide Export button in its own `hidden @min-[45rem]:block` wrapper, like the Key. A dialog opened from a menu item needs `onCloseAutoFocus` to put focus back on More (see the Key dialog).

## Goal
Admins download a clean, print-ready attendance sheet for Today, This week or Next week, which managers tick by hand.

## Read first
- `00-product-spec.md` §10
- Mockup "PrintSheet" (A4 portrait, 48 people, 8 teams on one page)
- The `@react-pdf/renderer` docs (Node rendering, `renderToBuffer`/`renderToStream`, `Font.register`, fixed elements, page breaks)
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

## Deliverables
1. **Route `GET /api/export/attendance?bu=<slug>&range=today|this-week|next-week`:**
   - `requireUser` plus `canExport(actor, bu)`; anyone else gets 403.
   - Without a session cookie, `proxy.ts` already answers 401 (T11, tested in `tests/e2e/auth.spec.ts`). The route must still check the session itself, because the proxy only checks that a cookie exists.
   - Computes the dates server-side with `todayIn(APP_TIME_ZONE)`: today, or the Sun–Sat week (this or next).
   - Loads the whole BU (teams in admin order, then people by surname; **excluding Unassigned**; **ignoring filters**), with availability and bookings for the range.
   - Responds with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="westcal-attendance-west-operations-2026-11-08.pdf"`, and `Cache-Control: no-store`.
   - Use `export const runtime = "nodejs"`.
2. **A pure layout model** (`src/domain/attendance-sheet.ts`, unit tested) for each person/day (or half):
   - `{ kind: "code", code }` when booked;
   - `{ kind: "box" }` when working with nothing booked;
   - `{ kind: "off" }` when not working.
   - A day where the halves differ becomes a split `{ am, pm }`.
   - **Pagination:** with the page height and row heights it decides rows per page (≈ 55 person rows on A4 portrait for a week), keeps a team header together with at least 2 of its rows, and repeats the table header on every page. Target is 1 page, flowing to 2 when needed.
3. **PDF documents** (`src/features/export/pdf/`), using the registered Geist TTF fonts from `public/fonts`:
   - **Week sheet** (A4 portrait):
     - Header: "Attendance check · {BU}", "Week of Sunday 8 to Saturday 14 November 2026", "Printed {date time} by {name}".
     - Table: a Name column plus 7 day columns (Sun–Sat), team header rows, then cells. Boxes are 9pt squares with a 1.2pt dark border; codes are bold on a light tint (they must read in greyscale); off days are hatched light grey; half cells are split with a dashed divider.
     - **No highlight for today.**
     - Footer: a legend of all codes plus "☐ expected in · hatched = not a working day", and "Page X of Y".
   - **Today sheet** (A4 portrait): "Attendance check · {BU} · Thursday 12 November 2026", then people grouped by team, each with one status cell (box, code, half split, or off). Use **two columns** of people if one column would overflow, to stay on one page where possible.
   - Fonts are ≥ 9pt for names; no grey lighter than `#767676`; strokes ≥ 1pt.
4. **Header UI** (the T15 slot, admins only): an "Export PDF" DropdownMenu with Today / This week / Next week. Choosing one downloads the file with a pending toast ("Preparing PDF…") and a success or error toast. Hidden for non-admins. In the "More" menu when the header is narrow.

## Tests
- Unit: the sheet model for every cell kind; the pagination maths (1 page for 50 people, 2 pages for 90, a team header never orphaned).
- Integration:
  - the route returns a PDF for an admin and 403 for a user;
  - parse the PDF text with `pdf-parse` (dev dependency) and check it has the BU name, the 7 day headers, people names in order, codes, and the page count;
  - Unassigned people are excluded.
- E2E: an admin clicks Export → This week, and the download event gives a PDF with size > 10 KB.

## Acceptance criteria
- The default seed's West Operations BU (about 50 people) prints on **one A4 page** for a week; output is legible in greyscale; the header and legend match the mockup.
