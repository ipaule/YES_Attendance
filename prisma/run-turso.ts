// Wrapper to run any seed script against Turso
// Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx prisma/run-turso.ts <script>
// Example: npx tsx prisma/run-turso.ts prisma/sample-data2.ts

import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

// Monkey-patch PrismaClient to use Turso adapter
const OriginalPrismaClient = PrismaClient;
const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);

// Override the module cache so when scripts import PrismaClient, they get the Turso version
const Module = require("module");
const originalResolveFilename = Module._resolveFilename;
let tursoClient: InstanceType<typeof PrismaClient> | null = null;

Module._resolveFilename = function (request: string, ...args: unknown[]) {
  return originalResolveFilename.call(this, request, ...args);
};

// Patch PrismaClient constructor
const originalProto = OriginalPrismaClient.prototype;
const handler = {
  construct(_target: unknown, args: unknown[]) {
    if (!tursoClient) {
      tursoClient = new OriginalPrismaClient({ adapter } as never);
    }
    return tursoClient;
  },
};

// Replace global PrismaClient
(globalThis as unknown as Record<string, unknown>).__turso_prisma = new Proxy(OriginalPrismaClient, handler);

// Now dynamically import the target script
const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error("Usage: npx tsx prisma/run-turso.ts <script-path>");
  process.exit(1);
}

// Override require for @prisma/client
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "@prisma/client") {
    const original = originalRequire.call(this, id);
    return {
      ...original,
      PrismaClient: new Proxy(OriginalPrismaClient, handler),
    };
  }
  return originalRequire.call(this, id);
};

require(require("path").resolve(scriptPath));
