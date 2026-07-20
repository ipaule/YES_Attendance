---
name: reference_login_credentials
description: Where to find working dev-login credentials and test data for driving the app during UX audits
metadata:
  type: reference
---

Dev-seeded PASTOR login for manual/automated UX testing: username `AJ`, password `3927` (defined in `prisma/seed.ts`, hashed with bcrypt). Role PASTOR gives access to all group/team/roster management features (name-click-to-roster-profile, member delete, team delete, etc.) needed to exercise the full mobile UI.

Groups seeded: 샬롬, 사랑, 소망, 믿음 (see `prisma/seed.ts`). Query `prisma/dev.db` directly with `sqlite3` for current team/member ids when you need a real team with attendance data to click into (e.g. `sqlite3 prisma/dev.db "select id,name from Team;"`).

Note: `dev.db` is a real working local copy with real-looking Korean names/data (not obviously synthetic placeholder data) — treat it as sensitive-ish when screenshotting/quoting individual member details (phone/email/home address show up on roster profile pages).
