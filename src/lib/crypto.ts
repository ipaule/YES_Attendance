import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

type KeyMap = Record<string, Buffer>;
let _keys: KeyMap | null = null;

function getKeys(): KeyMap {
  if (_keys) return _keys;
  const raw = process.env.ENCRYPTION_KEY_V1;
  if (!raw) throw new Error("ENCRYPTION_KEY_V1 is required but not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32)
    throw new Error(`ENCRYPTION_KEY_V1 must be 32 bytes (got ${key.length})`);
  _keys = { v1: key };
  return _keys;
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("v1:");
}

export function encrypt(plaintext: string): string {
  const keys = getKeys();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.v1, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // always 16 bytes
  return "v1:" + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(stored: string): string {
  if (!isEncrypted(stored)) return stored; // legacy plaintext passthrough
  const keys = getKeys();
  const version = stored.slice(0, 2);
  const key = keys[version];
  if (!key) throw new Error(`Unknown encryption key version: ${version}`);
  const buf = Buffer.from(stored.slice(3), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Decryption failed: data may be tampered or key is incorrect");
  }
}
