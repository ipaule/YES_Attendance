export function calculateAttendanceRate(
  statuses: string[]
): number {
  // Exclude AWR and blank (unrecorded) from denominator
  const excludedCount = statuses.filter((s) => s === "AWR" || s === "" || !s).length;
  const hereCount = statuses.filter((s) => s === "HERE").length;
  const totalDates = statuses.length - excludedCount;

  // No dates with a recorded outcome yet — distinct from a real 0% rate
  // (attended none of N recorded dates). Callers show "-" instead of a
  // percentage/grade for this sentinel (B1: a brand-new member with zero
  // history should not read as an F).
  if (totalDates === 0) return -1;
  return (hereCount / totalDates) * 100;
}

export function calculateGrade(rate: number): string {
  if (rate < 0) return "-";
  if (rate >= 80) return "A";
  if (rate >= 60) return "B";
  if (rate >= 40) return "C";
  if (rate >= 20) return "D";
  return "F";
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-green-600 bg-green-50";
    case "B": return "text-blue-600 bg-blue-50";
    case "C": return "text-yellow-600 bg-yellow-50";
    case "D": return "text-orange-600 bg-orange-50";
    case "F": return "text-red-600 bg-red-50";
    default: return "text-gray-600 bg-gray-50";
  }
}
