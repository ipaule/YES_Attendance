// Pure helpers for profile-derived fields and validation. Used by both UI
// and API layers; no React or Prisma imports here.

export const PHONE_RE = /^\d{3}-\d{3}-\d{4}$/;

// Auto-format US phone as the user types. Strips non-digits, inserts dashes
// at positions 3 and 6. Caps at 10 digits.
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const BIRTHDAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Last two digits of birthday's year, falls back to birthYear, then "—".
export function computePeerGroup(birthday: string, birthYear: string): string {
  if (BIRTHDAY_RE.test(birthday)) {
    return birthday.slice(2, 4);
  }
  const trimmed = (birthYear || "").trim();
  if (!trimmed) return "—";
  // birthYear may be stored as 2-digit ("97") or 4-digit ("1997")
  if (/^\d{4}$/.test(trimmed)) return trimmed.slice(2);
  if (/^\d{2}$/.test(trimmed)) return trimmed;
  return "—";
}

// 만 나이 (international age) computed from birthday.
// Returns null if neither birthday nor birthYear is usable.
export function computeAge(birthday: string, birthYear: string): number | null {
  const today = new Date();
  if (BIRTHDAY_RE.test(birthday)) {
    const [y, m, d] = birthday.split("-").map((n) => parseInt(n, 10));
    let age = today.getFullYear() - y;
    const beforeBirthday =
      today.getMonth() + 1 < m ||
      (today.getMonth() + 1 === m && today.getDate() < d);
    if (beforeBirthday) age -= 1;
    return age >= 0 ? age : null;
  }
  const trimmed = (birthYear || "").trim();
  if (!trimmed) return null;
  let year: number | null = null;
  if (/^\d{4}$/.test(trimmed)) year = parseInt(trimmed, 10);
  else if (/^\d{2}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    year = n >= 50 ? 1900 + n : 2000 + n;
  }
  if (year == null) return null;
  return today.getFullYear() - year;
}

// MM/DD display from birthday string. Returns "—" if missing.
export function formatBirthdayMD(birthday: string): string {
  if (!BIRTHDAY_RE.test(birthday)) return "—";
  return `${birthday.slice(5, 7)}/${birthday.slice(8, 10)}`;
}

// Strict-validate a partial profile patch. Returns first error string or null.
export function validateProfilePatch(data: {
  name?: string;
  email?: string;
  phone?: string;
  birthday?: string;
}): string | null {
  if (data.name !== undefined && !data.name.trim()) {
    return "이름을 입력해주세요.";
  }
  if (data.email && !EMAIL_RE.test(data.email)) {
    return "올바른 이메일 형식이 아닙니다.";
  }
  if (data.phone && !PHONE_RE.test(data.phone)) {
    return "전화번호 형식: XXX-XXX-XXXX";
  }
  if (data.birthday && !BIRTHDAY_RE.test(data.birthday)) {
    return "생년월일 형식: YYYY-MM-DD";
  }
  return null;
}
