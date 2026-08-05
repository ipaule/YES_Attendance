---
name: project-reset-and-import-shalom-pii
description: prisma/reset-and-import-shalom.ts hardcodes real PII in source and unconditionally wipes two tables with a documented Turso (prod) invocation path
metadata:
  type: project
---

`prisma/reset-and-import-shalom.ts` (231 lines, first seen untracked 2026-08-05) hardcodes real PII directly in TypeScript source: Korean names, US/KR phone numbers, birth years, and personal notes (health/attendance circumstances) for dozens of people, inside `HISTORY_VISIT` / `HISTORY_REGISTER` arrays. It also calls `prisma.shalomMember.deleteMany({})` and `prisma.shalomHistory.deleteMany({})` unconditionally (no guard, no dry-run flag), and its header comment documents both a local and a direct Turso/production invocation: `npx tsx prisma/reset-and-import-shalom.ts` with no `--env-file` gating shown for the Turso path.

**Why:** If this file is ever `git add`ed and committed, the PII becomes permanent in git history (rewriting history later is much harder than not committing it). Separately, an unconditional `deleteMany({})` runs counter to the user's standing rule that Turso sync must be additive-only (see the user's own memory: "Turso sync must be additive" — never clear before syncing). This combination is exactly the pattern the user's `migration-script-reviewer` subagent exists to catch.

**How to apply:** On every sweep, check whether this file (or similarly-named `reset-and-import-*.ts` / `import-*.ts` scripts with hardcoded personal data) is still untracked. If untracked, flag as high-severity leak risk before any broad `git add`. Recommend either (a) moving the roster data out of source into the already-gitignored `/data` directory and having the script read from there, or (b) if it must stay as a script with inline data, at minimum keep it untracked/never committed and treat it as disposable one-time-use — confirm with user which they want, don't decide unilaterally. Cross-reference [[project_prisma_script_pattern]] for the broader pattern this fits into.
