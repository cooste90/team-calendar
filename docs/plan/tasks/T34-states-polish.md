# T34 — Loading, empty, error and forbidden states; polish

**Phase:** 8 · **Depends on:** T33 · **Size:** M

## Goal
Every edge state is designed, and the app feels finished and smooth.

## Read first
- `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`, and `03-api-reference/03-file-conventions/error.md`, `not-found.md`, `forbidden.md`, `loading.md`
- `02-design-system.md` §6, §8

## Deliverables
1. **Route states:**
   - `app/error.tsx` and `(app)/error.tsx`: friendly messages with Retry, reset to `/`, and an error digest shown for support.
   - `not-found.tsx` and `forbidden.tsx` (enable the `authInterrupts` config if needed; check the docs), both branded.
   - `(app)/loading.tsx`: a skeleton that matches the shell.
2. **Errors:** if a page load fails, `(app)/error.tsx` shows the friendly message with Retry (which calls `reset()`). If an action fails, the existing toast shows the message. Don't build extra offline or retry machinery.
3. **Session expiry:** when an action returns `UNAUTHENTICATED`, show the dialog "Your session has ended" with a "Sign in again" button that keeps the current URL as `callbackURL`. Page loads already redirect to `/sign-in` through `requireUser()`.
4. **Polish pass:**
   - Check focus restoration on every dialog and popover close.
   - **From T29:** state set after an `await` inside `startTransition` isn't part of the transition (React 19), so a form briefly shows its result (e.g. the booking form's clash alert) with `pending` still true and its buttons disabled. Wrap those updates in their own `startTransition` in every form at once (booking form, profile tabs, admin forms), then drop the "wait until enabled" lines in `event-form.test.tsx`.
   - No layout shift when fonts load (next/font metrics).
   - Hover and press micro-interactions (150ms) consistent across buttons.
   - Tooltips on every icon-only button.
   - Smooth scrolling to today when it's off-screen ("Today" in the header scrolls horizontally in month view).
   - The favicon (logo) and `app/icon.svg`, theme-colour meta for light and dark, and `manifest` basics.
5. **Copy review:** go through all UI text against design system §8 (sentence case, en-GB dates, plain words).
6. **Final simplicity sweep** of the whole codebase against `04-code-style.md`: remove unused files, exports and dependencies (`pnpm dlx knip` is a quick way to find them), merge duplicated logic, and make sure every `src/domain` and `src/server/services` file starts with a one-line purpose comment. Record what changed in `progress.md`.

## Tests
- E2E: a failing action shows the error toast; expired session → the sign-in-again dialog; 404 and 403 pages render with axe passing.

## Acceptance criteria
- The simplicity sweep is done, with no unused dependencies left in `package.json`.
- No unstyled or default Next error screens are reachable; Lighthouse (local, desktop) has Performance ≥ 90, Accessibility 100 and Best Practices ≥ 95 on the calendar page with the default seed.
