/**
 * Round 2 — Profile completeness.
 *
 * Tính % hoàn thiện hồ sơ + danh sách mục còn thiếu. Trả về trong
 * GET /api/profile/me để mọi client (Nav, Profile) dùng chung một công thức —
 * không tự tính phía client (điểm tương tự từng bị copy trong recommendation
 * engine; nhiều nơi sẽ trôi nhau).
 */

export interface CompletenessItem {
  key: "photo" | "bio" | "prompts" | "interests" | "voice" | "location" | "extras";
  weight: number;
  done: boolean;
}

export interface ProfileCompleteness {
  score: number; // 0–100
  missing: string[]; // key của các mục chưa hoàn thành
  items: CompletenessItem[];
}

interface CompletenessInput {
  profile: {
    bio?: string | null;
    interests?: string | null;
    voiceUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  photos: unknown[];
  promptAnswers: unknown[];
  height?: number | null;
  languages?: string | null;
  religion?: string | null;
}

export function computeProfileCompleteness(user: CompletenessInput): {
  score: number;
  missing: string[];
  items: CompletenessItem[];
} {
  const items = buildItems(user);
  const score = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  return { score, missing: items.filter((i) => !i.done).map((i) => i.key), items };
}

function buildItems(user: CompletenessInput): CompletenessItem[] {
  return [
    { key: "photo", weight: 25, done: (user.photos?.length ?? 0) > 0 },
    { key: "bio", weight: 20, done: Boolean(user.profile?.bio && user.profile.bio.trim()) },
    { key: "prompts", weight: 15, done: (user.promptAnswers?.length ?? 0) > 0 },
    { key: "interests", weight: 15, done: interestsCount(user.profile?.interests) >= 3 },
    { key: "voice", weight: 10, done: Boolean(user.profile?.voiceUrl) },
    { key: "location", weight: 10, done: user.profile?.latitude != null && user.profile?.longitude != null },
    { key: "extras", weight: 5, done: hasExtras(user) },
  ];
}

function interestsCount(raw: string | null | undefined): number {
  try {
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

function hasExtras(user: CompletenessInput): boolean {
  if (user.height != null) return true;
  if (user.religion) return true;
  return safeLanguages(user.languages).length > 0;
}

function safeLanguages(raw: string | null | undefined): string[] {
  try {
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
