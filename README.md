# YES Attendance

Full-stack attendance tracking platform for a 300+ person community group, built solo.

## Stack
Next.js 16, React 19, TypeScript, Prisma, Turso (libSQL) in production / SQLite locally, deployed on Vercel.

## Notable engineering decisions

**Custom JWT auth with `jose`, not `jsonwebtoken`.** The auth check runs in Next.js Edge
middleware, which only exposes the WebCrypto API — no Node `crypto` module. `jose` is built
on WebCrypto; `jsonwebtoken` depends on Node's crypto and simply can't run there. Sessions use
a 30-day sliding window with a 90-day absolute expiry cap.

**AES-256-GCM PII encryption via a Prisma extension.** A single `$allOperations` interceptor
transparently encrypts/decrypts PII fields across every model, with a versioned envelope
format (`v1:base64(iv‖tag‖ciphertext)`) designed to support future key rotation.

**Dual-target database adapter.** Runs on local SQLite in development and Turso (networked
libSQL) in production, swapping at runtime based on environment — Vercel's serverless
functions have no persistent local filesystem, so a networked SQLite-compatible service is
required in production.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
