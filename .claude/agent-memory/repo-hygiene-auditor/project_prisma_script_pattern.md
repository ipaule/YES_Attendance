---
name: project-prisma-script-pattern
description: prisma/ accumulates one-off per-group import/seed scripts by design, not by accident — don't over-flag them as dead code
metadata:
  type: project
---

`prisma/` holds ~17+ scripts (as of 2026-08-05) not referenced by any `package.json` script and >30 days old: `add-roster-batch2.ts`, `add-unassigned-roster.ts`, `delete-unassigned.ts`, `fix-roster-notes.ts`, `import-new-roster.ts`, `import-roster-mideum.ts`, `import-roster-sarang.ts`, `import-roster-somang.ts`, `import-roster.ts`, `import-shalom.ts`, `reset.ts`, `seed-leader-members.ts`, `seed-leaders.ts`, `seed-teams.ts`, `seed-turso.ts`, `sync-to-turso.ts`, `run-turso.ts`.

**Why:** This is a church roster/attendance app (YES_Attendance) organized by team/group (Shalom, Somang, Sarang, Mideum, etc). Each group's roster import is a one-time manual data-migration script, run once via `npx tsx prisma/<script>.ts` and then kept around as an audit trail / template for the next term's import, not wired into `package.json` scripts. `run-turso.ts` specifically is called out in CLAUDE.md's "Known Lint Baseline" as a pre-existing, still-relevant file (its `require()` imports are an accepted lint baseline item) — treat it as intentionally kept, not dead.

**How to apply:** Still flag these per the standard "candidate for archive — confirm with user" criteria (age + no package.json reference), since new one-off scripts (like `reset-and-import-shalom.ts`) keep landing in the same untracked state and are worth surfacing each sweep. But don't editorialize that the whole directory is cruft — this accumulation is the expected shape of this project, and the user has not indicated they want a purge. See [[project_reset_and_import_shalom_pii]] for the higher-severity variant of this pattern (hardcoded PII + destructive delete).
