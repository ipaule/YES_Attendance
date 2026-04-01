export function calculateAttendanceRate(
  statuses: string[]
): number {
  const awrCount = statuses.filter((s) => s === "AWR").length;
  const hereCount = statuses.filter((s) => s === "HERE").length;
  const totalDates = statuses.length - awrCount;

  if (totalDates === 0) return 0;
  return (hereCount / totalDates) * 100;
}

export function calculateGrade(rate: number): string {
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
