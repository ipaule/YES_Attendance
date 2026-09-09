---
name: reference_login_credentials
description: Where to find working dev-login credentials and test data for driving the app during UX audits
metadata:
  type: reference
---

Dev-seeded PASTOR login for manual/automated UX testing: username `AJ`, password `3927` (defined in `prisma/seed.ts`, hashed with bcrypt). Role PASTOR gives access to all group/team/roster management features (name-click-to-roster-profile, member delete, team delete, etc.) needed to exercise the full mobile UI.

Groups seeded: 샬롬, 사랑, 소망, 믿음 (see `prisma/seed.ts`). Query `prisma/dev.db` directly with `sqlite3` for current team/member ids when you need a real team with attendance data to click into (e.g. `sqlite3 prisma/dev.db "select id,name from Team;"`).

Note: `dev.db` is a real working local copy with real-looking Korean names/data (not obviously synthetic placeholder data) — treat it as sensitive-ish when screenshotting/quoting individual member details (phone/email/home address show up on roster profile pages).

**LEADER-role E2E fixture (added 2026-09-08):** username `e2e-leader`, password `Qa-Test-2026!`. Leads dummy team "QA순" (id `cmttgn4em0002ih1m4atf88rw`) in dummy group "QA태스트" (id `cmttgn4ej0000ih1mfo9jdtwo`), with 2 dummy members QA순원1/QA순원2 and one attendance date "QA 출석" (id `cmttgn4q4000fih1m8fco64tb`). Safe to click/mark/lock/delete freely — made specifically for UX testing. If you delete the date, restore it via `sqlite3 prisma/dev.db "INSERT INTO AttendanceDate (id, date, label, teamId, \"order\", locked, createdAt) VALUES ('cmttgn4q4000fih1m8fco64tb', '2026-09-09T02:09:30.026Z', 'QA 출석', 'cmttgn4em0002ih1m4atf88rw', 0, 0, '2026-09-09T02:09:30.029Z');"` (attendance records don't need restoring, they're disposable).
