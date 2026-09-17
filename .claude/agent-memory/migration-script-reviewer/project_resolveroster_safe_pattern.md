---
name: project_resolveroster_safe_pattern
description: What a safe, additive, idempotent roster-backfill script looks like in this repo (reference shape from backfill-member-birthday[-turso].ts)
metadata:
  type: project
---

`prisma/backfill-member-birthday.ts` and its Turso twin
`prisma/backfill-member-birthday-turso.ts` (both approved 2026-09-17) are the
reference shape for a safe additive backfill script in this repo:

- Query is scoped narrowly to the rows that need filling:
  `prisma.member.findMany({ where: { birthday: "" }, ... })` — never a full
  table scan for a blanket update.
- Match to `RosterMember` via `resolveRosterMember` (`src/lib/roster-match.ts`)
  with team/group/gender/birthYear scoping, never a bare `name` comparison.
  `ambiguous` and `null` results are both treated as "skip, don't guess."
- The only mutation is `prisma.member.update` on a single already-blank
  field (`birthday`), so it can never clobber a human-edited value — no
  `deleteMany`, no upsert-with-overwrite.
- Idempotent by construction: rerunning only touches rows still matching
  `birthday: ""`, so already-filled rows are excluded on the next pass and no
  duplicates can be created (it's `update`, not `create`).

**Why:** gives a concrete, already-vetted template for what "safe" looks
like — useful when a new backfill script claims to follow the same pattern;
diffing structure against this one is fast context for judging deviations.
See [[project_local_turso_twin_pattern]] for the env-guard convention paired
with this logic.
