---
name: project_local_turso_twin_pattern
description: This repo's convention for local-only vs Turso-only twin scripts in prisma/, and how src/lib/db.ts picks the DB backend
metadata:
  type: project
---

This repo has paired scripts for data backfills: a local-only version and a
Turso-only twin (e.g. `prisma/backfill-member-birthday.ts` vs
`prisma/backfill-member-birthday-turso.ts`). Both reviewed and approved
2026-09-17.

- `src/lib/db.ts` (`createPrismaClient`, ~line 61) picks the backend purely
  by presence of `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` — both truthy means
  Turso (libsql adapter), otherwise local sqlite via plain `PrismaClient`.
- The **local-only** twin forces `process.env.TURSO_DATABASE_URL = ""` and
  `TURSO_AUTH_TOKEN = ""` at the top of the file, before the dynamic
  `import("../src/lib/db")`, with a comment explaining this works around
  `.env.local` blanking these for `next dev` but Prisma's own dotenv loader
  (which only reads `.env`, not `.env.local`) otherwise leaking real Turso
  creds into a plain `tsx` run.
- The **Turso** twin instead throws at the top if either var is unset —
  opposite guard, same mechanism, no other logic differs.

**Why:** confirms the "twin script, opposite guard" pattern is a deliberate,
established convention here (not an ad-hoc risk) — when reviewing one twin
of a pair, the other twin is very likely identical except for this env
guard, and a diff between the two is the fastest way to confirm nothing else
snuck in.

**How to apply:** when asked to review a `*-turso.ts` script that has a
same-named non-`-turso` sibling in `prisma/`, run `diff` between them first —
the only expected difference is the env-guard block (forced-empty vs
require-set) and the header comment. Any other diff is a red flag worth
calling out explicitly. See [[project_resolveRosterMember_safe_pattern]] for
the additive-backfill logic itself.
