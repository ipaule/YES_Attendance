import { prisma } from "@/lib/db";
import { normalizeRosterName } from "@/lib/roster-names";
import type { RosterMember } from "@prisma/client";

export type RosterMatchResult =
  | RosterMember
  | { ambiguous: true; candidates: RosterMember[] }
  | null;

function narrow<T>(candidates: T[], predicate: (r: T) => boolean): T[] {
  if (candidates.length <= 1) return candidates;
  const filtered = candidates.filter(predicate);
  return filtered.length > 0 ? filtered : candidates;
}

/**
 * Resolve a per-team Member to its org-wide RosterMember, scoped by name plus
 * whatever context is available, so unrelated people who share a bare name
 * (e.g. "강예지" vs "강예지4") are never conflated.
 *
 * Candidates are collected by name (exact or suffix-tolerant), then narrowed
 * by team/group, gender, and birth year in order — each narrowing step only
 * applies when the caller supplies that field, and is skipped if it would
 * eliminate every remaining candidate. Callers must treat an `ambiguous`
 * result the same as "no confident match": never guess.
 */
export async function resolveRosterMember(params: {
  name: string;
  teamName?: string | null;
  groupName?: string | null;
  gender?: string | null;
  birthYear?: string | null;
}): Promise<RosterMatchResult> {
  const { name, teamName, groupName, gender, birthYear } = params;

  const rawCandidates = await prisma.rosterMember.findMany({
    where: { name: { startsWith: name } },
  });
  let candidates = rawCandidates.filter(
    (r) => r.name === name || normalizeRosterName(r.name) === name
  );

  if (teamName) {
    candidates = narrow(candidates, (r) => !r.teamName || r.teamName === teamName);
  }
  if (groupName) {
    candidates = narrow(candidates, (r) => !r.groupName || r.groupName === groupName);
  }
  if (gender) {
    candidates = narrow(candidates, (r) => !r.gender || r.gender === gender);
  }
  if (birthYear) {
    candidates = narrow(candidates, (r) => !r.birthYear || r.birthYear === birthYear);
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return { ambiguous: true, candidates };
}
