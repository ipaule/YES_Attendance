## Before Creating Documentation
Always read and explore the codebase first before writing CLAUDE.md or other project documentation. Do not generate docs based on assumptions.

## Post-Edit Verification
After any multi-file refactor or import changes, run `npm run typecheck` and `npm run lint` before declaring work complete. Do not remove imports without verifying they are unused across the whole file.

## Dev Server & Caching
When Prisma schema changes or environment variables change, restart the dev server and regenerate the Prisma client (`npx prisma generate`). Assume caching issues are likely when changes don't appear to take effect.

Next.js blocks cross-origin dev requests by default. To test on a phone over LAN wifi, add `allowedDevOrigins: ["<lan-ip>"]` to `next.config.ts` and restart the dev server — otherwise requests (e.g. login) fail silently.

## TypeScript Config
This project uses `moduleResolution: 'bundler'`. Do not add `ignoreDeprecations` workarounds without checking the TypeScript version first.

## React Compiler
This project enforces `react-hooks/refs` — a ref's value cannot be read during render. For values that need referential stability across renders (e.g. stabilizing an array passed to a child), use the "adjust state during render" pattern (compare-then-`setState` in the render body) instead of `useRef`.

## Known Lint Baseline
`npm run lint` reports 4 pre-existing errors / 11 warnings unrelated to any single change: `require()` imports in `prisma/run-turso.ts`, a React Compiler memoization-skip in `AttendanceTable.tsx`'s `sortedMembers` useMemo, and assorted unused-vars/`<img>` warnings. If your lint output matches this exactly, you haven't introduced anything new.

## Shared Helpers
- `src/lib/http.ts` — `fetchJson`/`HttpError`: use for TanStack Query `queryFn`s so HTTP status is preserved and the global retry predicate (`QueryProvider.tsx`) can fail fast on 4xx.
- `src/lib/roster-match.ts` — `resolveRosterMember`: scoped (team/group/gender/birthYear) matching between a team `Member` and org-wide `RosterMember`. Use this instead of matching by name alone — unscoped name matching has caused real wrong-person bugs.

## Post-Deploy Verification
After deploying, curl the production health endpoint, query the DB to confirm row counts match expectations, and show the output. Do not declare work done without showing proof.

## UI Feature Design Spec
Before coding any UI feature, write a short design spec — layout, components, states (empty / loading / error), and 3-5 acceptance criteria. Wait for review before implementing.

@AGENTS.md
