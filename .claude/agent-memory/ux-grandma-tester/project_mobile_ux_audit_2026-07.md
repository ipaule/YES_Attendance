---
name: project_mobile_ux_audit_2026-07
description: Findings from mobile-viewport UX audits of the attendance app — 2026-07-03 full-app pass and 2026-07-19 Shalom-history feature pass
metadata:
  type: project
---

## 2026-07-03 — full app audit (login, dashboard, group, attendance table, roster profile)

Logged in as PASTOR user `AJ` / password `3927` (from prisma/seed.ts) against local dev.db.

**Why this matters:** this app is a Korean-language church youth-group ("YES 청년부") attendance tracker. Users are pastors/leaders on phones, not developers.

**Top findings (worst first), each handed to root-cause-analyst separately:**
1. CRITICAL: pinning Name/Rate/Grade/Delete columns left zero horizontal space at 375px for the actual attendance-marking date columns. File: `src/components/attendance/AttendanceTable.tsx`.
2. CRITICAL: tapping a member name lands on a fully-editable PII form with instant Save/Cancel, no read-only mode, no confirmation on save. File: `src/app/dashboard/roster/[id]/page.tsx`.
3. HIGH: destructive icon buttons (member delete, date lock/delete, team edit/delete) render at ~12-14px tap targets, clustered tightly. Files: `AttendanceTable.tsx`, `src/app/dashboard/group/[groupId]/page.tsx`. **See also the same pattern recurring in the Shalom-history feature below (2026-07-19) — looks like a codebase-wide convention, not a one-off.**
4. HIGH: fixed bottom MobileNav has no compensating `pb-20` on 4 specific pages (roster/[id], roster/new, shalom/[id], shalom/new).
5. MEDIUM-HIGH: invalid/stale deep links show a static "로딩 중..." or empty skeleton for 10+ seconds before a friendly error appears (react-query retry + fetch discarding HTTP status).
6. MEDIUM: name-tap navigation has zero loading feedback, no `loading.tsx` under `roster/`.
7. MEDIUM (data-integrity): name-tap resolver matches purely by name string with no group/team scoping in the exact-match branch.
8. ~~LOW-MEDIUM: login page inputs/button measured 38-40px tall, under 44px minimum~~ — **FIXED as of 2026-07-19**: login page now has `min-h-[44px]` on both inputs and the submit button (confirmed by reading rendered HTML). Likely fixed by commit `36f65bc "Fix mobile UX issues: tap lag, tap targets, error hangs, name collisions"`.

## 2026-07-19 — Shalom history feature audit (flat folder list + people table rewrite)

Context: this session rewrote Shalom history from a nested folder/record tree into a flat folder list where each folder holds one selectable people table. Also fixed a real bug where Korean IME composition double-fired Enter keydown, creating 2 folders on one Enter press (fix verified: `!e.nativeEvent.isComposing` guard now present in both create and rename handlers).

**What worked well (passed the grandmother test):**
- Creating a folder with a Korean name (테스트그룹): exactly one folder created, correct name, no duplicates — confirmed the double-folder bug fix holds.
- Renaming via pencil icon + Enter key AND via pencil icon + checkmark button: both work correctly, no duplicates, no glitches (same composing-guard fix applies to rename).
- Deleting an empty folder: uses a native `confirm()` dialog with a clear Korean message before deleting — a real confirmation step exists.
- Deleting a non-empty folder (40 people): correctly BLOCKED with a clear, plain-Korean `alert()`: `"2026년 1월- 6월" 폴더에는 40명이 있어 삭제할 수 없습니다. 먼저 다른 폴더로 이동해주세요.` — tells the user exactly what to do.
- Select checkboxes, select-all, the "N명 선택됨" bar with 선택 해제/이동 buttons, and the move-to-another-folder flow (including creating the target folder inline) — all work correctly end-to-end when given enough time to complete (folder counts updated correctly, HTTP 200).
- No "Record" concept, no nested tree, no drag handles leaked into the new flat-folder UI — matches the intended simplified design.

**New findings filed with root-cause-analyst (2026-07-19):**
1. Table headers with 3+ Korean characters (전화번호, 방문 날짜, 인도자, 샬롬 순장) wrap one character per line instead of triggering the intended `overflow-x-auto` horizontal scroll, because only the 성별 header has `whitespace-nowrap` — the rest don't, so the table auto-layout shrinks columns instead of overflowing. File: `src/app/dashboard/shalom/history/[historyId]/page.tsx` lines 150-161. Measured: "샬롬 순장" header rendered 28.9px wide x 96.5px tall at 390px viewport.
2. Rename (pencil) and delete (trash) icon buttons on the folder list are 16x16px with only 4px gap between them — same undersized/clustered-icon-button pattern as the 2026-07-03 finding #3, now recurring in a brand-new feature. File: `src/app/dashboard/shalom/history/page.tsx` lines 179-194.
3. The "move people to another folder" mutation has no AbortController and only a text-based "이동 중..." pending indicator; if interrupted (e.g. user navigates away while it's pending), the UI is left in a stale, ambiguous state with no visible error — user can't tell if the move happened. Reproduced via test: navigating away mid-request aborts the fetch silently; waiting it out instead completes correctly. File: `src/app/dashboard/shalom/history/[historyId]/page.tsx` lines 59-81, 246-253.

## 2026-07-19 follow-up — targeted duplicate-folder regression check + root causes confirmed

Context: asked to specifically re-verify the "Korean name → 2 folders" bug on `/dashboard/shalom/history` was still fixed, since the original IME-composition fix (commit `36f65bc`) can't be perfectly exercised by browser automation (no real IME compose events). Used Playwright at 375px viewport (Chrome extension wasn't connected this session — fell back to a driven headless browser).

**Regression check result: the originally-fixed IME bug is still fixed.** Create-via-Enter, create-via-checkmark, rename-via-Enter all produced exactly 1 folder, no duplicates, across a clean run.

**But found a related, currently-unfixed duplicate-creation bug via a different mechanism** — not IME, a plain fast double-tap/double-click on the confirm button. Root-cause-analyst confirmed:
- Client: the create-folder confirm buttons (`src/app/dashboard/shalom/history/page.tsx:137` and `src/components/HistoryTree.tsx:250`, the latter shared by Shalom sub-folders AND Term/텀 history) call `.mutate()`/`onCreateFolder()` directly from `onClick` with **no `isPending` guard and no `disabled` attribute** — two clicks landing before React re-renders both fire.
- Server: `POST /api/shalom/history` and `POST /api/terms/folders` call `prisma.<model>.create()` unconditionally with **no `@@unique` constraint** on `ShalomHistory`/`TermHistory` (contrast: `Attendance` model does have `@@unique([memberId, attendanceDateId])` — the codebase knows this pattern, just didn't apply it here) and no pre-existence check.
- Reproduced concretely: dispatching two `.click()` events on the same DOM node in the same JS tick produced 2 DB rows with identical names.
- Rename buttons have the identical missing-guard shape but are NOT exploitable the same way — rename is a `PATCH`/`update` keyed by existing `id`, so double-firing just re-applies the same name (idempotent). Only *create*-type actions (folder create, and structurally-identical Term-history folder/term create) are at risk.

**Second new finding**: the same four confirm buttons (create x2, rename x2, across `page.tsx` and `HistoryTree.tsx`) guard against empty/whitespace input with `name.trim() && ...` *inside the onClick handler only* — never mirrored to `disabled`/styling. Tapping confirm on an empty box does nothing, with zero visual feedback (button doesn't even look disabled beforehand). Codebase already has the right idiom elsewhere in the same file (`HistoryTree.tsx` move-modal buttons use `disabled={...}` + `disabled:opacity-40 disabled:cursor-not-allowed`) — just wasn't applied to these four.

**Confirmed again**: the 16x16px/4px-gap rename+delete tap targets from the 2026-07-19 audit (finding #2 above) are unchanged.

## Tooling notes (reusable for future audits of this project)

- No browser automation tool pre-installed by default in fresh environments, but as of 2026-07-19 `playwright` (with chromium) was already installed in `node_modules` — check first with `ls node_modules/.bin/playwright` before reinstalling.
- **Run driver scripts from the project root as a `.mjs` file directly (`node script.mjs`), not via `NODE_PATH=... node /tmp/script.mjs`** — ESM `import 'playwright'` resolution does not honor `NODE_PATH` the way CJS `require` does; it will fail with `ERR_MODULE_NOT_FOUND` even though the package is installed. Put the scratch script inside the project directory (and delete it when done) instead.
- Use `context = await browser.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true, userAgent: <iPhone Safari UA> })`.
- **Login timing gotcha:** after filling the login form and clicking submit, `page.waitForLoadState('networkidle')` can resolve *before* the client-side redirect to `/dashboard` actually completes (session cookie set + router.push race) — this produces a silent false failure where subsequent `page.goto('/dashboard/...')` calls just bounce back to `/login`. Fix: after clicking submit, use a flat `page.waitForTimeout(3000)` instead of (or in addition to) `waitForLoadState`, then verify `page.url()` before proceeding.
- **Shared-dev-environment gotcha (new, 2026-07-19):** dev.db is a single shared sqlite file. During this audit, two test folders created by this agent vanished between two separate script runs with no action by this agent — later confirmed another concurrent Claude Code session was also running Playwright scripts against the same dev server/DB around the same time (evidenced by other `scratch-*.mjs` files appearing/disappearing in the repo root that this agent didn't create). **Do not assume disappearing/changing data between script runs is a product bug — always check `git status`/`ls scratch-*` for other in-flight sessions and re-verify against a fresh, uninterrupted single script run before reporting a data-loss finding.** Also: don't delete scratch files you didn't create.
- **Async-mutation testing gotcha:** when testing a "did my action save" flow (e.g. move/save with a mutation), don't navigate away immediately after clicking confirm — `page.goto()` can abort the in-flight fetch and produce a false "it didn't work" result that's actually a test artifact, not a real bug. Poll (`page.waitForTimeout` loop checking for the pending-state to clear) before deciding the feature is broken, and separately test what a real interrupted-navigation user scenario would look like as its own finding.
- Login credentials and seeded data: see `[[reference_login_credentials]]`.
- **Claude in Chrome extension is not always connected** — check first; if unavailable, fall back to a Playwright driver script (see above) rather than blocking. Works fine as a substitute for mobile-viewport walkthroughs.
- **To test for double-tap/rapid-click race conditions** (the actual mechanism behind "duplicate item created" bugs, as opposed to IME-composition double-firing), Playwright's `.click()` with actionability waiting is too slow/serialized to catch it — a real double-tap lands both events before React re-renders. Use `page.evaluate(() => { btn.click(); btn.click(); })` to dispatch two click events on the same DOM node in the same JS tick instead. This caught a real unguarded-`onClick`-calling-`mutate()` bug that normal sequential `.click(); .click();` calls missed (the first click's success handler unmounted the button before the second `.click()` could land, causing a Playwright timeout instead of reproducing the race).
