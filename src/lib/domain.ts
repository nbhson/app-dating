/**
 * Round 2 — single source of truth cho các enum domain + validator đầu vào.
 *
 * Prisma + SQLite không hỗ trợ enum/CHECK constraint native (validate trả
 * P1012: "the current connector does not support enums"), nên mọi ràng buộc
 * miền giá trị phải được enforce ở lớp ứng dụng — ngay trước khi ghi DB.
 * Các route KHÔNG được định nghĩa allowlist riêng (trước đây REPORT_REASONS
 * bị copy 3 nơi, lệch nhau là bypass validate).
 */

export const GENDERS = ["MAN", "WOMAN"] as const;
export const INTERESTED_IN = ["MEN", "WOMEN", "EVERYONE"] as const;
export const INTENTS = ["LONG_TERM", "SHORT_TERM", "FRIENDSHIP", "EXPLORING", "UNSURE"] as const;
export const HABIT_LEVELS = ["NEVER", "SOCIAL", "OFTEN"] as const;
export const REPORT_REASONS = ["Fake profile", "Harassment", "Spam", "Inappropriate content", "Scam", "Other"] as const;

export type Gender = (typeof GENDERS)[number];
export type InterestedIn = (typeof INTERESTED_IN)[number];
export type Intent = (typeof INTENTS)[number];
export type HabitLevel = (typeof HABIT_LEVELS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Kiểm tra giá trị thuộc allowlist (type-safe khi trả về). */
export function isAllowed(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/**
 * Chuỗi có giới hạn độ dài. Trả về:
 *  - `undefined` nếu không phải string (gọi route tự quyết 400 hay bỏ qua),
 *  - chuỗi đã trim, giới hạn `max` ký tự nếu hợp lệ.
 */
export function bounded(value: unknown, max: number, min = 0): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  return s.length >= min ? s.slice(0, max) : undefined;
}

/** Chuỗi optional cho phép rỗng/null (religion, wantKids...): "" → null. */
export function boundedNullable(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  if (value === "") return null;
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, max) || null;
}

/**
 * Số thực trong khoảng [min, max].
 *  - `undefined`: field không được gửi,
 *  - `null`: gửi tường minh (cho phép xoá) HOẶC không hợp lệ — route phân biệt
 *    bằng cách kiểm tra đầu vào trước khi gọi hàm này.
 */
export function finiteInRange(v: unknown, min: number, max: number): number | null | undefined {
  if (v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;
export const HEIGHT_MIN = 100;
export const HEIGHT_MAX = 250;
