import { describe, it, expect } from "vitest";
import {
  GENDERS,
  INTERESTED_IN,
  INTENTS,
  HABIT_LEVELS,
  REPORT_REASONS,
  isAllowed,
  bounded,
  boundedNullable,
  finiteInRange,
} from "../src/lib/domain";
import { computeProfileCompleteness } from "../src/lib/completeness";
import { getAge, todayKey } from "../src/lib/utils";

describe("domain enums (app-layer thay cho Prisma enum/CHECK — sqlite không hỗ trợ)", () => {
  it("allowlist khớp với những gì UI gửi", () => {
    expect(isAllowed("MAN", GENDERS)).toBe(true);
    expect(isAllowed("nonbinary", GENDERS)).toBe(false);
    expect(isAllowed("EVERYONE", INTERESTED_IN)).toBe(true);
    expect(isAllowed("UNSURE", INTENTS)).toBe(true);
    expect(isAllowed("NEVER", HABIT_LEVELS)).toBe(true);
    expect(isAllowed("SOMETIMES", HABIT_LEVELS)).toBe(false);
    expect(isAllowed(null, INTENTS)).toBe(false);
    expect(isAllowed(undefined, INTENTS)).toBe(false);
  });

  it("report reasons khớp giữa client và API (single source)", () => {
    expect(REPORT_REASONS).toContain("Fake profile");
    expect(REPORT_REASONS).toHaveLength(6);
  });
});

describe("bounded — chuỗi có giới hạn", () => {
  it("cắt đúng max và trim", () => {
    expect(bounded("  hello  ", 10)).toBe("hello");
    expect(bounded("x".repeat(100), 5)).toBe("xxxxx");
  });
  it("trả undefined nếu không phải string", () => {
    expect(bounded(123 as unknown, 10)).toBeUndefined();
    expect(bounded(undefined, 10)).toBeUndefined();
  });
});

describe("boundedNullable", () => {
  it("chuỗi rỗng → null, không hợp lệ → undefined", () => {
    expect(boundedNullable("", 60)).toBeNull();
    expect(boundedNullable(null, 60)).toBeNull();
    expect(boundedNullable("  care  ", 60)).toBe("care");
    expect(boundedNullable(42 as unknown, 60)).toBeUndefined();
  });
});

describe("finiteInRange — số trong khoảng", () => {
  it("chặn NaN và ngoài range", () => {
    expect(finiteInRange(10, -90, 90)).toBe(10);
    expect(finiteInRange(999, -90, 90)).toBeNull();
    expect(finiteInRange("abc", -90, 90)).toBeNull();
    expect(finiteInRange(undefined, -90, 90)).toBeUndefined();
    expect(finiteInRange("-12.5", -180, 180)).toBe(-12.5);
  });
});

describe("age gate", () => {
  it("18 tuổi chính xác theo tháng/ngày", () => {
    const now = new Date();
    const exactly18 = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
    const dayBefore = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate() + 1);
    const tooYoung = new Date(now.getFullYear() - 17, now.getMonth(), now.getDate());
    expect(getAge(exactly18)).toBe(18);
    expect(getAge(dayBefore)).toBeLessThan(18);
    expect(getAge(tooYoung)).toBeLessThan(18);
  });
});

describe("todayKey", () => {
  it("trả về định dạng YYYY-MM-DD UTC", () => {
    expect(todayKey(new Date("2026-10-29T23:30:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });
});

describe("computeProfileCompleteness", () => {
  const full = {
    profile: { bio: "hi", interests: JSON.stringify(["a", "b", "c"]), voiceUrl: "/x.webm", latitude: 10, longitude: 106 },
    photos: [{}],
    promptAnswers: [{}],
    height: 170,
    languages: null,
    religion: null,
  };
  it("hồ sơ đủ = 100, missing rỗng", () => {
    const r = computeProfileCompleteness(full);
    expect(r.score).toBe(100);
    expect(r.missing).toHaveLength(0);
  });
  it("hồ sơ trống = 0 + đủ 7 mục thiếu", () => {
    const r = computeProfileCompleteness({ profile: null, photos: [], promptAnswers: [] });
    expect(r.score).toBe(0);
    expect(r.missing).toHaveLength(7);
  });
  it("interests JSON hỏng không crash, vẫn tính thiếu", () => {
    const r = computeProfileCompleteness({ profile: { interests: "{oops", bio: "hi" }, photos: [], promptAnswers: [] });
    expect(r.missing).toContain("interests");
    expect(r.score).toBe(20); // chỉ bio
  });
  it("weights tổng đúng 100", () => {
    const { items } = computeProfileCompleteness(full);
    expect(items.reduce((s, i) => s + i.weight, 0)).toBe(100);
  });
});
