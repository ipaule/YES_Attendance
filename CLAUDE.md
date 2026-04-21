## Before Creating Documentation
Always read and explore the codebase first before writing CLAUDE.md or other project documentation. Do not generate docs based on assumptions.

## Post-Edit Verification
After any multi-file refactor or import changes, run `npm run typecheck` and `npm run lint` before declaring work complete. Do not remove imports without verifying they are unused across the whole file.

## Dev Server & Caching
When Prisma schema changes or environment variables change, restart the dev server and regenerate the Prisma client (`npx prisma generate`). Assume caching issues are likely when changes don't appear to take effect.

## TypeScript Config
This project uses `moduleResolution: 'bundler'`. Do not add `ignoreDeprecations` workarounds without checking the TypeScript version first.

## Post-Deploy Verification
After deploying, curl the production health endpoint, query the DB to confirm row counts match expectations, and show the output. Do not declare work done without showing proof.

## UI Feature Design Spec
Before coding any UI feature, write a short design spec — layout, components, states (empty / loading / error), and 3-5 acceptance criteria. Wait for review before implementing.

@AGENTS.md
