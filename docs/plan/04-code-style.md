# WestCal: Keep it simple

The product owner is a junior developer who will **read, maintain and extend this code by hand** after the agents finish. Every task is judged on this as much as on its features. If a choice is between clever and obvious, choose obvious.

## The rules

1. **Write for a junior reader.** Someone who knows basic React, TypeScript and SQL should be able to open any file and follow it from top to bottom without looking anything up.
2. **Few lines, but never at the cost of clarity.** Cut boilerplate, wrappers and unused options. Don't squash logic into dense one-liners, nested ternaries or chained tricks. A clear `if` beats a clever expression.
3. **Don't repeat yourself.** If the same logic appears twice, move it into one well-named function and call it from both places. Rules live once, in `src/domain`. Zod schemas live once, in `src/lib/schemas`, and are shared by forms and server actions.
4. **But don't build abstractions before they're needed.** Don't make a generic helper, factory, base class or config option for something that's used once. Don't add code "for later". Three similar lines are fine. A fourth means extract.
5. **Use the platform first.** Prefer, in this order:
   1. plain HTML and CSS;
   2. React and Next.js built-ins;
   3. a library already in the stack;
   4. a new library, only when it saves a lot of code. Write down why in `progress.md`.
6. **Simple data flow.** Server components load data. Server actions change data and then call `refresh()`. There is no client-side data cache, and data isn't copied into client state.
7. **Plain names, plain types.** Use full words (`booking`, `startDate`), not abbreviations. Types are plain object types and string unions. Avoid generics, branded types, overloads, conditional types and type gymnastics unless there's no simpler way.
8. **Small files, one job each.** A file does one thing and is named after it. Aim for under ~200 lines per file, and under ~40 lines per function. Split by feature, not by technical layer.
9. **Comments say *why*, not *what*.** Add a short comment wherever the reason isn't obvious (a business rule, a workaround). Each file in `src/domain` and `src/server/services` starts with one or two lines saying what it's for. Don't write comments that repeat the code.
10. **No dead code.** No commented-out code, unused exports, TODOs without a `progress.md` entry, or feature flags.
11. **Errors are boring.** Throw a typed error from the small set in `src/domain/errors.ts`, and let `authedAction` turn it into a result. Don't add `try/catch` in every function.
12. **Tests read like the spec.** Name each test after the rule it proves ("an ADMIN can book up to 7 days in the past"). Use plain arrays of examples in table-driven tests. Don't write test helpers that hide what's being tested.

## Things we deliberately don't use
These were considered and rejected because a simpler option does the job here:

| Not used | Use instead |
|---|---|
| TanStack Query, client data caches, optimistic cache patching | Server components + server actions + `refresh()`; a small `useRefreshOnFocus` hook |
| A `/api/calendar` JSON endpoint | The calendar page loads its own data on the server |
| Intercepting or parallel routes for modals | Dialogs opened by a URL search param (`?profile=me`, `?person=<id>`, `?admin=teams`) through nuqs |
| Postgres exclusion constraints, generated columns, advisory locks | One `lockUsers` row lock plus a plain overlap check in the service |
| Branded types | `type CalendarDate = string // "YYYY-MM-DD"`, validated by zod at the edges |
| Motion (animation library) | CSS transitions and keyframes (Tailwind and `tw-animate-css`) |
| react-hook-form | A plain `<form>`, `useState` for the few fields that change the UI, and the shared zod schema |
| TanStack Virtual (row virtualisation) | Render normally, and use CSS `content-visibility: auto` on team groups |
| dnd-kit (drag and drop) | Move up and Move down buttons |
| CSP nonces | A static Content-Security-Policy header in `next.config.ts` |

If a task seems to need one of these, stop and note it in `progress.md` with the measured reason. Don't add it on your own.

## Before you commit: the simplicity pass
Re-read your whole diff as if you were the junior maintainer, and ask:
- Could any file, function, prop, type or option be deleted without losing a requirement?
- Is anything written twice?
- Is there a built-in (HTML, CSS, React, Next, an existing library) that does this already?
- Would a newcomer understand each function's name and purpose without reading its body?

Fix what you find. If the `/simplify` skill is available in your session, run it on your changes too. Mention the simplicity pass in your `progress.md` entry.
