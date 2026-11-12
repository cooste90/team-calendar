# T35 — Accessibility audit and fixes

**Phase:** 8 · **Depends on:** T34 · **Size:** M

## Goal
Independently verify WCAG 2.2 AA across the whole app and fix whatever falls short.

## Read first
- `03-accessibility.md` (all of it, especially §5)
- `node_modules/next/dist/docs/03-architecture/accessibility.md`

## Deliverables
1. **Automated suite** (`tests/e2e/a11y/`): one spec per screen and state listed in `03-accessibility.md` §5, each run in **light and dark**, plus:
   - `reducedMotion: "reduce"` checks (no running animations; `getAnimations()` is empty after interactions);
   - `forcedColors: "active"` screenshots of the grid, form and popovers, attached as artifacts;
   - zoom/reflow: viewports 640×400 and 320×256, asserting there's no horizontal scroll on `document.scrollingElement` outside the grid container, and that every header action is reachable;
   - a text spacing test (inject the WCAG 1.4.12 CSS and assert no clipped text in key components, using `scrollWidth > clientWidth` checks on labels);
   - a target size check: a script finds interactive elements under 24×24 px that aren't exempt.
2. **Keyboard journeys** (e2e, no mouse): the full list in `03-accessibility.md` §5.
3. **Manual screen-reader pass:** NVDA + Chrome, NVDA + Firefox, and Narrator + Edge, following a written script (sign in, navigate the grid, book, handle a conflict, undo, open the profile, admin reorder). Record the results in `docs/a11y-report.md` (issues, fixes, and residual notes).
4. **Fix everything found**, or log anything genuinely out of scope as a follow-up in `progress.md` with its WCAG reference and reasoning.
5. **Accessibility statement page** `/accessibility`, linked from the user menu footer: conformance target, known limitations, and how to report issues (a placeholder contact for the product owner to fill in).

## Acceptance criteria
- Zero axe violations across the suite; all keyboard journeys pass; `docs/a11y-report.md` is complete with no open AA failures.
