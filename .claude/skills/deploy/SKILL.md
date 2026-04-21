---
name: deploy
description: Deploy app to Vercel with Turso DB sync and verify health
---

1. Run `npm run typecheck && npm run lint`
2. Run `npx prisma generate`
3. Commit and push to `main` (Vercel auto-deploys from `main`)
4. Sync local `dev.db` → Turso: `npx tsx prisma/sync-to-turso.ts` (requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` env vars set)
5. Verify deployment at `https://yesattendance.vercel.app/`:
   - `curl https://yesattendance.vercel.app/api/health` and confirm row counts match expectations
   - Do not declare the deploy done without showing the health output
