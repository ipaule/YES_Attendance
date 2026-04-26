#!/usr/bin/env tsx
/**
 * Bulk-import / fill-in new roster data from TSV.
 *
 * Usage:
 *   npx tsx prisma/import-new-roster.ts [--apply] [--resolutions=data/multi-match-resolution.tsv]
 *
 * Without --apply: dry-run only (no DB writes).
 * Writes data/multi-match-resolution.tsv for ambiguous cases — fill it in then re-run with --apply.
 *
 * DB: Turso if TURSO_DATABASE_URL + TURSO_AUTH_TOKEN are set; otherwise local SQLite.
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// ─── Args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const resolutionsFlag = argv.find((a) => a.startsWith("--resolutions="));
const RESOLUTIONS_PATH = resolutionsFlag ? resolutionsFlag.slice("--resolutions=".length) : null;

const ROOT = process.cwd();
const INPUT_TSV = path.join(ROOT, "data", "new-roster.tsv");
const RESOLUTION_TSV_OUT = path.join(ROOT, "data", "multi-match-resolution.tsv");

// ─── Prisma ───────────────────────────────────────────────────────────────────
function buildPrisma(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    console.log(`🌐  Turso: ${tursoUrl}`);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require("@prisma/adapter-libsql");
    const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
    return new PrismaClient({ adapter: new PrismaLibSQL(libsql) } as never);
  }
  console.log("🔵  Local SQLite.");
  return new PrismaClient();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePhone(raw: string): { value: string; warn?: string } {
  if (!raw.trim()) return { value: "" };
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10)
    return { value: raw.trim(), warn: `"${raw}" → ${digits.length} digits, kept as-is` };
  return { value: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` };
}

function convertDate(raw: string): string {
  if (!raw.trim()) return "";
  const parts = raw.trim().split("/");
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (y && m && d)
      return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw.trim();
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface InputRow {
  idx: number;
  name: string;
  englishName: string;
  gender: string;
  memberNumber: string;
  phoneRaw: string;
  registrationDateRaw: string;
  address: string;
  email: string;
}

interface ExistingMember {
  id: string;
  name: string;
  englishName: string;
  gender: string;
  memberNumber: string;
  phone: string;
  registrationDate: string;
  address: string;
  email: string;
  groupName: string;
  teamName: string;
}

type MatchKind =
  | "EXACT-SINGLE"
  | "EXACT-MULTI"
  | "SUFFIX-RENAME"
  | "SUFFIX-RENAME-AMBIG"
  | "NEW"
  | "INPUT-DUPLICATE";

interface Classified {
  row: InputRow;
  kind: MatchKind;
  target?: ExistingMember;
  candidates?: ExistingMember[];
  baseName?: string;
}

interface UpdatePlan {
  existingId: string;
  rename?: { from: string; to: string };
  patch: Record<string, string>;
  skipped: string[];
  phoneWarn?: string;
}

// ─── Parse TSV ────────────────────────────────────────────────────────────────
function parseTSV(filePath: string): InputRow[] {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const rows: InputRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (!line.trim()) continue;
    const c = line.split("\t");
    const name = c[0]?.trim() ?? "";
    if (!name) continue;
    rows.push({
      idx: rows.length,
      name,
      englishName: c[1]?.trim() ?? "",
      gender: c[2]?.trim() ?? "",
      memberNumber: c[3]?.trim() ?? "",
      phoneRaw: c[4]?.trim() ?? "",
      registrationDateRaw: c[5]?.trim() ?? "",
      address: c[6]?.trim() ?? "",
      email: c[7]?.trim() ?? "",
    });
  }
  return rows;
}

// ─── Classify ─────────────────────────────────────────────────────────────────
function classify(rows: InputRow[], byName: Map<string, ExistingMember[]>): Classified[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const { name } = row;
    if (seen.has(name)) return { row, kind: "INPUT-DUPLICATE" };
    seen.add(name);

    const exact = byName.get(name);
    if (exact) {
      if (exact.length === 1) return { row, kind: "EXACT-SINGLE", target: exact[0] };
      return { row, kind: "EXACT-MULTI", candidates: exact };
    }

    if (/\d+$/.test(name)) {
      const baseName = name.replace(/\d+$/, "");
      const baseMatches = byName.get(baseName);
      if (baseMatches) {
        if (baseMatches.length === 1)
          return { row, kind: "SUFFIX-RENAME", target: baseMatches[0], baseName };
        return { row, kind: "SUFFIX-RENAME-AMBIG", candidates: baseMatches, baseName };
      }
    }

    return { row, kind: "NEW" };
  });
}

// ─── Compute patch ────────────────────────────────────────────────────────────
function computePatch(row: InputRow, existing: ExistingMember, newName?: string): UpdatePlan {
  const patch: Record<string, string> = {};
  const skipped: string[] = [];
  let phoneWarn: string | undefined;

  const { value: phoneNorm, warn: pWarn } = normalizePhone(row.phoneRaw);
  if (pWarn) phoneWarn = pWarn;
  const dateConv = convertDate(row.registrationDateRaw);

  const inputs: [string, string, string][] = [
    // [field, newVal, existingVal]
    ["englishName", row.englishName, existing.englishName],
    ["gender", row.gender, existing.gender],
    ["memberNumber", row.memberNumber, existing.memberNumber],
    ["phone", phoneNorm, existing.phone],
    ["registrationDate", dateConv, existing.registrationDate],
    ["address", row.address, existing.address],
    ["email", row.email, existing.email],
  ];

  for (const [field, newVal, oldVal] of inputs) {
    if (!newVal) continue;            // empty in new → preserve existing
    if (!oldVal) {
      patch[field] = newVal;          // fill empty existing
    } else if (newVal !== oldVal) {
      skipped.push(`${field} kept "${oldVal}" (new: "${newVal}")`);
    }
    // newVal === oldVal → no-op
  }

  if (newName) patch.name = newName;

  return {
    existingId: existing.id,
    rename: newName ? { from: existing.name, to: newName } : undefined,
    patch,
    skipped,
    phoneWarn,
  };
}

// ─── Build new-person data ────────────────────────────────────────────────────
function buildNewData(row: InputRow, order: number): Record<string, string | number> {
  const { value: phone, warn } = normalizePhone(row.phoneRaw);
  if (warn) console.log(`  ⚠ Phone [${row.name}]: ${warn}`);
  return {
    name: row.name,
    englishName: row.englishName,
    gender: row.gender,
    memberNumber: row.memberNumber,
    phone,
    registrationDate: convertDate(row.registrationDateRaw),
    address: row.address,
    email: row.email,
    groupName: "",
    teamName: "",
    order,
  };
}

// ─── Resolution file ──────────────────────────────────────────────────────────
function writeResolutionTemplate(ambiguous: Classified[]): void {
  if (ambiguous.length === 0) {
    console.log("\n✅  No ambiguous cases — no resolution file needed.");
    return;
  }
  fs.mkdirSync(path.dirname(RESOLUTION_TSV_OUT), { recursive: true });
  const lines: string[] = [
    "# Fill in the 'action' column for each ambiguous row.",
    "# For each rowIdx group, set exactly ONE row's action to:",
    "#   update   → update that existing member",
    "#   new      → create a new person (use on the CREATE_NEW row)",
    "#   skip     → skip this new row entirely",
    "#",
    ["rowIdx", "newName", "candidateId", "candidateDisplay", "action"].join("\t"),
  ];

  for (const c of ambiguous) {
    const candidates = c.candidates ?? [];
    const label = c.kind === "SUFFIX-RENAME-AMBIG"
      ? `${c.row.name} (base: ${c.baseName})`
      : c.row.name;
    for (const ex of candidates) {
      const display = [ex.name, ex.groupName || "—", ex.teamName || "—", ex.phone || "—"].join(" | ");
      lines.push([c.row.idx, label, ex.id, display, ""].join("\t"));
    }
    lines.push([c.row.idx, label, "CREATE_NEW", "(create as new person)", ""].join("\t"));
    lines.push("");
  }

  fs.writeFileSync(RESOLUTION_TSV_OUT, lines.join("\n"), "utf-8");
  console.log(`\n📝  Resolution template written to: ${RESOLUTION_TSV_OUT}`);
  console.log("    Fill in the 'action' column then re-run with --apply --resolutions=data/multi-match-resolution.tsv");
}

// ─── Read resolution file ────────────────────────────────────────────────────
interface Resolution {
  rowIdx: number;
  action: "update" | "new" | "skip";
  candidateId: string;
}

function readResolutions(filePath: string): Map<number, Resolution> {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const result = new Map<number, Resolution>();
  for (const line of lines) {
    if (line.startsWith("#") || !line.trim()) continue;
    const cols = line.split("\t");
    if (cols[0] === "rowIdx") continue; // header
    const rowIdx = parseInt(cols[0] ?? "", 10);
    const action = (cols[4] ?? "").trim().toLowerCase();
    const candidateId = (cols[2] ?? "").trim();
    if (!action || isNaN(rowIdx)) continue;
    if (action !== "update" && action !== "new" && action !== "skip") continue;
    if (result.has(rowIdx)) {
      console.warn(`⚠  Multiple actions for rowIdx ${rowIdx} — using first.`);
      continue;
    }
    result.set(rowIdx, { rowIdx, action: action as Resolution["action"], candidateId });
  }
  return result;
}

// ─── Phone-sweep all existing ──────────────────────────────────────────────────
async function normalizeAllPhones(prisma: PrismaClient): Promise<number> {
  const all = await prisma.rosterMember.findMany({ select: { id: true, phone: true } });
  let count = 0;
  for (const m of all) {
    if (!m.phone) continue;
    const { value, warn } = normalizePhone(m.phone);
    if (warn) {
      console.log(`  ⚠ Phone normalize [${m.id}]: ${warn}`);
      continue;
    }
    if (value !== m.phone) {
      await prisma.rosterMember.update({ where: { id: m.id }, data: { phone: value } });
      count++;
    }
  }
  return count;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== import-new-roster.ts — ${APPLY ? "APPLY" : "DRY RUN"} ===\n`);

  if (!fs.existsSync(INPUT_TSV)) {
    console.error(`❌  Input file not found: ${INPUT_TSV}`);
    process.exit(1);
  }

  const prisma = buildPrisma();

  // Load all existing members
  const existing = await prisma.rosterMember.findMany({
    select: {
      id: true, name: true, englishName: true, gender: true,
      memberNumber: true, phone: true, registrationDate: true,
      address: true, email: true, groupName: true, teamName: true,
    },
  });

  const byName = new Map<string, ExistingMember[]>();
  for (const m of existing) {
    const arr = byName.get(m.name) ?? [];
    arr.push(m as ExistingMember);
    byName.set(m.name, arr);
  }

  // Parse and classify input
  const inputRows = parseTSV(INPUT_TSV);
  console.log(`Loaded ${inputRows.length} input rows, ${existing.length} existing members.\n`);

  const classified = classify(inputRows, byName);

  const byKind: Record<MatchKind, Classified[]> = {
    "EXACT-SINGLE": [],
    "EXACT-MULTI": [],
    "SUFFIX-RENAME": [],
    "SUFFIX-RENAME-AMBIG": [],
    "NEW": [],
    "INPUT-DUPLICATE": [],
  };
  for (const c of classified) byKind[c.kind].push(c);

  // Estimate phone normalization scope (dry-run counts only)
  const existingWithBadPhone = existing.filter((m) => {
    if (!m.phone) return false;
    const { warn } = normalizePhone(m.phone);
    return warn === undefined && m.phone !== normalizePhone(m.phone).value;
  }).length;

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("=== Summary ===");
  console.log(`  EXACT-SINGLE        (fill empty fields): ${String(byKind["EXACT-SINGLE"].length).padStart(4)}`);
  console.log(`  SUFFIX-RENAME       (rename + fill):     ${String(byKind["SUFFIX-RENAME"].length).padStart(4)}`);
  console.log(`  NEW                 (create):            ${String(byKind["NEW"].length).padStart(4)}`);
  console.log(`  EXACT-MULTI         (need resolution):   ${String(byKind["EXACT-MULTI"].length).padStart(4)}`);
  console.log(`  SUFFIX-RENAME-AMBIG (need resolution):   ${String(byKind["SUFFIX-RENAME-AMBIG"].length).padStart(4)}`);
  console.log(`  INPUT-DUPLICATE     (skipped):           ${String(byKind["INPUT-DUPLICATE"].length).padStart(4)}`);
  console.log(`  PHONE-NORMALIZE     (existing sweep):    ~${existingWithBadPhone}`);
  console.log();

  // ─── Details ────────────────────────────────────────────────────────────────
  if (byKind["SUFFIX-RENAME"].length) {
    console.log("--- SUFFIX-RENAME ---");
    for (const c of byKind["SUFFIX-RENAME"]) {
      const plan = computePatch(c.row, c.target!, c.row.name);
      const changes = Object.entries(plan.patch).filter(([k]) => k !== "name").map(([k, v]) => `${k}="${v}"`);
      console.log(`  [RENAME] "${c.baseName}" → "${c.row.name}"`);
      if (changes.length) console.log(`    + ${changes.join(", ")}`);
      if (plan.skipped.length) console.log(`    ~ skipped (existing kept): ${plan.skipped.join("; ")}`);
      if (plan.phoneWarn) console.log(`    ⚠ phone: ${plan.phoneWarn}`);
    }
    console.log();
  }

  if (byKind["NEW"].length) {
    console.log("--- NEW PERSONS ---");
    for (const c of byKind["NEW"]) {
      const { value: phone } = normalizePhone(c.row.phoneRaw);
      const date = convertDate(c.row.registrationDateRaw);
      const parts = [
        c.row.englishName && `en="${c.row.englishName}"`,
        c.row.gender && `gender=${c.row.gender}`,
        phone && `phone=${phone}`,
        date && `regDate=${date}`,
        c.row.email && `email=${c.row.email}`,
      ].filter(Boolean).join(", ");
      console.log(`  [NEW] ${c.row.name}${parts ? ` — ${parts}` : ""}`);
    }
    console.log();
  }

  if (byKind["EXACT-MULTI"].length || byKind["SUFFIX-RENAME-AMBIG"].length) {
    console.log("--- AMBIGUOUS (need resolution) ---");
    for (const c of [...byKind["EXACT-MULTI"], ...byKind["SUFFIX-RENAME-AMBIG"]]) {
      console.log(`  [${c.kind}] "${c.row.name}":`);
      for (const ex of c.candidates ?? []) {
        console.log(`    candidate: ${ex.id} | ${ex.name} | ${ex.groupName || "—"} | ${ex.teamName || "—"} | ${ex.phone || "—"}`);
      }
    }
    console.log();
  }

  if (byKind["INPUT-DUPLICATE"].length) {
    console.log("--- INPUT DUPLICATES (skipped — only first occurrence used) ---");
    for (const c of byKind["INPUT-DUPLICATE"])
      console.log(`  row ${c.row.idx}: ${c.row.name}`);
    console.log();
  }

  // Skipped-field conflicts across EXACT-SINGLE
  const conflicts: string[] = [];
  for (const c of byKind["EXACT-SINGLE"]) {
    const plan = computePatch(c.row, c.target!);
    for (const s of plan.skipped) conflicts.push(`  ${c.row.name}: ${s}`);
  }
  if (conflicts.length) {
    console.log(`--- FIELD CONFLICTS (existing kept, ${conflicts.length} fields) ---`);
    conflicts.slice(0, 20).forEach((l) => console.log(l));
    if (conflicts.length > 20) console.log(`  ... and ${conflicts.length - 20} more`);
    console.log();
  }

  // Write resolution template regardless of dry/apply
  const ambiguous = [...byKind["EXACT-MULTI"], ...byKind["SUFFIX-RENAME-AMBIG"]];
  writeResolutionTemplate(ambiguous);

  if (!APPLY) {
    console.log("\n⏸  Dry-run complete. Run with --apply to commit changes.");
    await prisma.$disconnect();
    return;
  }

  // ─── APPLY ──────────────────────────────────────────────────────────────────
  console.log("\n=== Applying changes... ===\n");

  // Load resolutions if provided
  const resolutions = RESOLUTIONS_PATH ? readResolutions(RESOLUTIONS_PATH) : new Map<number, Resolution>();

  let updated = 0;
  let renamed = 0;
  let created = 0;
  let skippedAmbig = 0;

  // EXACT-SINGLE
  for (const c of byKind["EXACT-SINGLE"]) {
    const plan = computePatch(c.row, c.target!);
    if (Object.keys(plan.patch).length === 0) continue;
    await prisma.rosterMember.update({ where: { id: plan.existingId }, data: plan.patch });
    updated++;
  }
  console.log(`✅  Updated ${updated} existing members (filled empty fields).`);

  // SUFFIX-RENAME
  for (const c of byKind["SUFFIX-RENAME"]) {
    const plan = computePatch(c.row, c.target!, c.row.name);
    await prisma.rosterMember.update({ where: { id: plan.existingId }, data: plan.patch });
    renamed++;
  }
  console.log(`✅  Renamed + updated ${renamed} members.`);

  // NEW
  const maxOrderRow = await prisma.rosterMember.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  let nextOrder = (maxOrderRow?.order ?? -1) + 1;
  for (const c of byKind["NEW"]) {
    await prisma.rosterMember.create({ data: buildNewData(c.row, nextOrder++) as never });
    created++;
  }
  console.log(`✅  Created ${created} new members.`);

  // AMBIGUOUS — apply resolutions
  const inputByIdx = new Map(inputRows.map((r) => [r.idx, r]));
  const existingById = new Map(existing.map((m) => [m.id, m as ExistingMember]));

  for (const c of ambiguous) {
    const res = resolutions.get(c.row.idx);
    if (!res) { skippedAmbig++; continue; }
    if (res.action === "skip") { skippedAmbig++; continue; }

    if (res.action === "update") {
      const target = existingById.get(res.candidateId);
      if (!target) { console.warn(`  ⚠ candidateId ${res.candidateId} not found — skipping row ${c.row.idx}`); skippedAmbig++; continue; }
      const plan = computePatch(c.row, target);
      if (Object.keys(plan.patch).length > 0)
        await prisma.rosterMember.update({ where: { id: plan.existingId }, data: plan.patch });
      updated++;
    } else if (res.action === "new") {
      const row = inputByIdx.get(c.row.idx)!;
      await prisma.rosterMember.create({ data: buildNewData(row, nextOrder++) as never });
      created++;
    }
  }
  if (skippedAmbig) console.log(`⚠  Skipped ${skippedAmbig} ambiguous rows (no resolution provided).`);

  // Phone normalization sweep
  console.log("\nNormalizing all phone numbers...");
  const phoneFixed = await normalizeAllPhones(prisma);
  console.log(`✅  Normalized ${phoneFixed} phone numbers across all existing members.`);

  console.log(`\n=== Done. Updated: ${updated}, Renamed: ${renamed}, Created: ${created} ===\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
