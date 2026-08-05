---
name: project-gitignore-bak-pattern-history
description: .gitignore's *.db.bak pattern was too narrow to match dev.db.bak.predummy/.shalom — fixed to *.db.bak* on 2026-08-05, verify the fix lands committed
metadata:
  type: project
---

As of 2026-08-05, `.gitignore` had `*.db.bak` (no trailing wildcard), which only matches a file literally named `...db.bak` — it silently misses `dev.db.bak.predummy` and `dev.db.bak.shalom` (both dated 2026-05-12, sitting in `prisma/`, containing real roster/attendance PII). In this session's working tree, `.gitignore` was already changed to `*.db.bak*` (correctly covers all three on-disk variants) plus two new lines (`session-report.html`, `.serena/`) — but as an uncommitted, unstaged change (`M .gitignore` in `git status`).

**Why:** A gitignore pattern too narrow for the actual on-disk naming convention is a silent leak-risk gap — files won't show as untracked-and-ignored, they'll show as plain untracked (`??`) and get swept into a broad `git add -A`. Confirmed via `git log --all -- prisma/*.bak*` that these specific files were never actually committed historically, so no history-rewrite is needed — but the gap was live until this fix.

**How to apply:** On every sweep, diff `.gitignore` against actual filenames on disk in `prisma/` (`ls prisma/*.bak* prisma/*.db*`) to catch pattern drift early — bak-naming here isn't consistent (`dev.db.bak`, `dev.db.bak.predummy`, `dev.db.bak.shalom` all differ). If a gitignore fix for this pattern is sitting unstaged (as it was on 2026-08-05), call out explicitly that it needs to be committed to take effect for the rest of the team / other clones — a local-only working-tree gitignore edit doesn't protect anyone else's checkout.
