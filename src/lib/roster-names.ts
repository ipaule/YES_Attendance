export function normalizeRosterName(name: string): string {
  return name.trim().replace(/\s+/g, " ").replace(/\s*\d+\s*$/, "");
}
