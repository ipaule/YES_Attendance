import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, isEncrypted } from "./crypto";

// Prisma model name → fields to encrypt/decrypt transparently
const ENCRYPTED_FIELDS: Record<string, readonly string[]> = {
  RosterMember: [
    "phone", "email", "address", "prayerRequest", "note",
    "birthday", "salvationAssurance", "statusReason",
  ],
  ShalomMember: ["phone", "note"],
  TermHistory:  ["data"],
  ShalomHistory:["data"],
};

// Operations whose return value is one or more model rows (decrypt on exit)
const READ_OPS = new Set([
  "findMany", "findFirst", "findFirstOrThrow",
  "findUnique", "findUniqueOrThrow",
  "create", "update", "upsert", "delete",
]);

// Operations that carry PII in args.data (encrypt on entry, not upsert)
const WRITE_DATA_OPS = new Set(["create", "update", "createMany", "updateMany"]);

function encField(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string")
    return isEncrypted(value) ? value : encrypt(value);
  // Prisma { set: "..." } shorthand used in update operations
  if (typeof value === "object" && "set" in (value as object)) {
    const s = (value as { set: unknown }).set;
    if (typeof s === "string") return { set: isEncrypted(s) ? s : encrypt(s) };
  }
  return value;
}

function decField(value: unknown): unknown {
  return typeof value === "string" ? decrypt(value) : value;
}

function encryptData(fields: readonly string[], data: unknown): void {
  if (!data || typeof data !== "object") return;
  const d = data as Record<string, unknown>;
  for (const f of fields) {
    if (f in d) d[f] = encField(d[f]);
  }
}

function decryptRow(fields: readonly string[], row: unknown): unknown {
  if (!row || typeof row !== "object") return row;
  const out = { ...(row as Record<string, unknown>) };
  for (const f of fields) {
    if (f in out) out[f] = decField(out[f]);
  }
  return out;
}

function createPrismaClient() {
  let base: PrismaClient;
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require("@prisma/adapter-libsql");
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    base = new PrismaClient({ adapter } as never);
  } else {
    base = new PrismaClient();
  }

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: (args: any) => Promise<unknown>;
        }) {
          const fields = ENCRYPTED_FIELDS[model];

          if (fields) {
            if (operation === "upsert") {
              encryptData(fields, args.create);
              encryptData(fields, args.update);
            } else if (WRITE_DATA_OPS.has(operation)) {
              if (Array.isArray(args.data)) {
                args.data.forEach((d: unknown) => encryptData(fields, d));
              } else {
                encryptData(fields, args.data);
              }
            }
          }

          const result = await query(args);

          if (fields && READ_OPS.has(operation)) {
            if (Array.isArray(result)) {
              return result.map((r: unknown) => decryptRow(fields, r));
            }
            return decryptRow(fields, result);
          }

          return result;
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
