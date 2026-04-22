// Tailwind class mapping for dropdown colors. Keep keys in sync with PALETTE
// in dropdownSeeds.ts so the color stored in DB always resolves to a class.
const CHIP_CLASSES: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  lime: "bg-lime-50 text-lime-700 border-lime-200",
  green: "bg-green-50 text-green-700 border-green-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
};

const TEXT_CLASSES: Record<string, string> = {
  red: "text-red-600",
  orange: "text-orange-600",
  amber: "text-amber-600",
  yellow: "text-yellow-600",
  lime: "text-lime-600",
  green: "text-green-600",
  emerald: "text-emerald-600",
  teal: "text-teal-600",
  cyan: "text-cyan-600",
  blue: "text-blue-600",
  indigo: "text-indigo-600",
  purple: "text-purple-600",
  pink: "text-pink-600",
};

export function chipClassFor(color: string | undefined | null): string {
  if (!color) return "bg-gray-50 text-gray-600 border-gray-200";
  return CHIP_CLASSES[color] || "bg-gray-50 text-gray-600 border-gray-200";
}

export function textClassFor(color: string | undefined | null): string {
  if (!color) return "text-gray-600";
  return TEXT_CLASSES[color] || "text-gray-600";
}
