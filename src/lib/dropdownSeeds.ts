import type { PrismaClient } from "@prisma/client";

// 12-color Tailwind palette used to auto-assign colors to new dropdown options.
// Stored as the palette key (e.g. "blue") — UI maps to Tailwind classes.
export const PALETTE = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "pink",
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export interface SeedOption {
  category: string;
  value: string;
  color: PaletteColor;
  order: number;
}

// Initial dropdown values + locked-in default colors.
export const DROPDOWN_SEEDS: SeedOption[] = [
  // gender
  { category: "gender", value: "남", color: "blue", order: 0 },
  { category: "gender", value: "여", color: "red", order: 1 },

  // community
  { category: "community", value: "믿음", color: "green", order: 0 },
  { category: "community", value: "소망", color: "blue", order: 1 },
  { category: "community", value: "사랑", color: "pink", order: 2 },
  { category: "community", value: "샬롬", color: "purple", order: 3 },

  // salvation_assurance
  { category: "salvation_assurance", value: "있음", color: "green", order: 0 },
  { category: "salvation_assurance", value: "없음", color: "red", order: 1 },
  { category: "salvation_assurance", value: "확인 필요", color: "amber", order: 2 },

  // training
  { category: "training", value: "없음", color: "yellow", order: 0 },
  { category: "training", value: "새일꾼반", color: "green", order: 1 },
  { category: "training", value: "제자반", color: "teal", order: 2 },
  { category: "training", value: "사역반", color: "blue", order: 3 },
  { category: "training", value: "순장반", color: "purple", order: 4 },

  // contact_status
  { category: "contact_status", value: "완료", color: "green", order: 0 },
  { category: "contact_status", value: "미응답", color: "red", order: 1 },
  { category: "contact_status", value: "연락 중", color: "amber", order: 2 },

  // person_status
  { category: "person_status", value: "새가족(샬롬 단계)", color: "purple", order: 0 },
  { category: "person_status", value: "브릿지(공동체 이동 대기)", color: "indigo", order: 1 },
  { category: "person_status", value: "Active(현재 출석 중)", color: "green", order: 2 },
  { category: "person_status", value: "장기 결석(6개월 이상 미출석)", color: "red", order: 3 },
  { category: "person_status", value: "타교회", color: "amber", order: 4 },
  { category: "person_status", value: "한국", color: "cyan", order: 5 },
  { category: "person_status", value: "이사", color: "orange", order: 6 },
  { category: "person_status", value: "연락두절", color: "pink", order: 7 },
  { category: "person_status", value: "결혼", color: "lime", order: 8 },
  { category: "person_status", value: "일 스케쥴", color: "teal", order: 9 },

  // baptism_status (세례 여부)
  { category: "baptism_status", value: "세례", color: "blue", order: 0 },
  { category: "baptism_status", value: "입교", color: "green", order: 1 },
  { category: "baptism_status", value: "아직", color: "orange", order: 2 },

  // recent_attendance (manual overrides for 최근 출석) — newest term first,
  // then 샬롬 졸업, then 미확인 last.
  { category: "recent_attendance", value: "26봄", color: "blue", order: 0 },
  { category: "recent_attendance", value: "25가을", color: "amber", order: 1 },
  { category: "recent_attendance", value: "25봄", color: "green", order: 2 },
  { category: "recent_attendance", value: "24가을", color: "orange", order: 3 },
  { category: "recent_attendance", value: "24봄", color: "teal", order: 4 },
  { category: "recent_attendance", value: "샬롬 졸업", color: "purple", order: 5 },
  { category: "recent_attendance", value: "미확인", color: "yellow", order: 6 },

  // assignee
  { category: "assignee", value: "안정현 목사", color: "indigo", order: 0 },
  { category: "assignee", value: "유민재 전도사", color: "blue", order: 1 },
  { category: "assignee", value: "믿음 공동체장", color: "green", order: 2 },
  { category: "assignee", value: "소망 공동체장", color: "cyan", order: 3 },
  { category: "assignee", value: "사랑 공동체장", color: "pink", order: 4 },
  { category: "assignee", value: "샬롬 공동체장", color: "purple", order: 5 },
  { category: "assignee", value: "순장", color: "amber", order: 6 },
];

export async function seedDropdownOptions(prisma: PrismaClient): Promise<void> {
  for (const seed of DROPDOWN_SEEDS) {
    await prisma.dropdownOption.upsert({
      where: { category_value: { category: seed.category, value: seed.value } },
      update: {},
      create: seed,
    });
  }
}

export function nextPaletteColor(usedColors: string[]): PaletteColor {
  const counts: Record<string, number> = {};
  for (const c of PALETTE) counts[c] = 0;
  for (const c of usedColors) {
    if (c in counts) counts[c]++;
  }
  let best: PaletteColor = PALETTE[0];
  let bestCount = Infinity;
  for (const c of PALETTE) {
    if (counts[c] < bestCount) {
      bestCount = counts[c];
      best = c;
    }
  }
  return best;
}
