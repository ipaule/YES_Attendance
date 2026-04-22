// Pure date helpers for the 한주의 준비 weekly-prep view.

// Returns the upcoming Sun→Sat week block. If today is Sunday, returns the
// NEXT Sunday's block (not today's), matching the user's requirement that
// "following Sunday" always means ahead of today.
export function getUpcomingWeek(today: Date): { sunday: Date; saturday: Date } {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = t.getDay(); // 0 = Sunday
  const daysToSunday = dow === 0 ? 7 : 7 - dow;
  const sunday = new Date(t);
  sunday.setDate(t.getDate() + daysToSunday);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { sunday, saturday };
}

// Month+day match. `birthday` in YYYY-MM-DD format. Feb 29 matches in
// Feb 28–Mar 1 on non-leap years.
export function isBirthdayInRange(birthday: string, start: Date, end: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return false;
  const [, mStr, dStr] = birthday.split("-");
  const bm = parseInt(mStr, 10);
  const bd = parseInt(dStr, 10);
  if (!bm || !bd) return false;

  // Enumerate every calendar day in the window and compare (month, day).
  // Window is at most 7 days so the cost is negligible.
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const stop = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const year = cursor.getFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  while (cursor.getTime() <= stop.getTime()) {
    const m = cursor.getMonth() + 1;
    const d = cursor.getDate();
    if (m === bm && d === bd) return true;
    // Feb 29 edge: if non-leap and birthday is 2/29, match on 2/28 and 3/1.
    if (!isLeap && bm === 2 && bd === 29) {
      if ((m === 2 && d === 28) || (m === 3 && d === 1)) return true;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

// Sort key for a birthday within a known week window: the month+day mapped
// onto the starting year. Used for ascending sort by date-in-window.
export function birthdaySortKey(birthday: string, start: Date): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return Number.MAX_SAFE_INTEGER;
  const [, mStr, dStr] = birthday.split("-");
  const bm = parseInt(mStr, 10);
  const bd = parseInt(dStr, 10);
  if (!bm || !bd) return Number.MAX_SAFE_INTEGER;
  // Try this-year first, fall back to next-year if before the window.
  const thisYear = new Date(start.getFullYear(), bm - 1, bd);
  if (thisYear.getTime() >= start.getTime()) return thisYear.getTime();
  return new Date(start.getFullYear() + 1, bm - 1, bd).getTime();
}

export function formatMDSlash(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const yy = date.getFullYear() % 100;
  return `${m}/${d}/${yy.toString().padStart(2, "0")}`;
}

export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

export function formatBirthdayMDShort(birthday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return "";
  const m = parseInt(birthday.slice(5, 7), 10);
  const d = parseInt(birthday.slice(8, 10), 10);
  return `${m}/${d}`;
}

export function formatBirthdayMDYSlash(birthday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return "";
  const y = parseInt(birthday.slice(0, 4), 10);
  const m = parseInt(birthday.slice(5, 7), 10);
  const d = parseInt(birthday.slice(8, 10), 10);
  const yy = y % 100;
  return `${m}/${d}/${yy.toString().padStart(2, "0")}`;
}
