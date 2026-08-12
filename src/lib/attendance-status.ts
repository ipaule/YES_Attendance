import type { AttendanceStatus } from "@/types";

export interface StatusOption {
  value: AttendanceStatus | "";
  /** Action-button text, e.g. inside the popover / mobile row. */
  label: string;
  /** Descriptive text for legends, e.g. "O 출석 · X 결석 · △ 사유결석 · - 미기록". */
  meaning: string;
  glyph: string;
  colorClass: string;
  activeClass: string;
}

// Single source of truth for attendance status vocabulary — desktop
// (AttendanceCell popover) and mobile (TodayAttendanceList) both render off
// this list so the two surfaces never drift into different words for the
// same status (A1/A2).
export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "HERE",
    label: "출석",
    meaning: "출석",
    glyph: "O",
    colorClass: "text-green-600",
    activeClass: "bg-green-600 text-white border-green-600",
  },
  {
    value: "ABSENT",
    label: "결석",
    meaning: "결석",
    glyph: "X",
    colorClass: "text-red-500",
    activeClass: "bg-red-500 text-white border-red-500",
  },
  {
    value: "AWR",
    label: "사유결석",
    meaning: "사유결석",
    glyph: "△",
    colorClass: "text-yellow-500",
    activeClass: "bg-yellow-500 text-white border-yellow-500",
  },
  {
    value: "",
    label: "지우기",
    meaning: "미기록",
    glyph: "-",
    colorClass: "text-gray-300",
    activeClass: "bg-gray-200 text-gray-600 border-gray-300",
  },
];

export function statusOption(status: AttendanceStatus | "" | undefined) {
  return STATUS_OPTIONS.find((o) => o.value === (status || "")) ?? STATUS_OPTIONS[3];
}
