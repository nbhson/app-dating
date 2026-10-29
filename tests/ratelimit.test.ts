import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createMemoryStore, createPrismaStore, getRateLimitStore } from "../src/lib/ratelimit";

const WINDOW = 60_000;
const MAX = 3;

describe("memory rate-limit store", () => {
  it("cho phép tới max lần rồi chặn", async () => {
    const store = createMemoryStore();
    const results = [];
    for (let i = 0; i < MAX + 2; i++) {
      results.push(await store.consume("k1", WINDOW, MAX));
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results[MAX].remaining).toBe(0);
    expect(results[MAX + 1].count).toBe(MAX + 2);
  });

  it("resetAt nằm trong tương lai và reset(key) xoá bucket", async () => {
    const store = createMemoryStore();
    const r = await store.consume("k2", WINDOW, 1);
    expect(r.resetAt).toBeGreaterThan(Date.now());
    expect(r.allowed).toBe(true);
    const denied = await store.consume("k2", WINDOW, 1);
    expect(denied.allowed).toBe(false);
    await store.reset("k2");
    const after = await store.consume("k2", WINDOW, 1);
    expect(after.allowed).toBe(true);
    expect(after.count).toBe(1);
  });

  it("window hết hạn → đếm lại từ 1", async () => {
    vi.useFakeTimers();
    try {
      const store = createMemoryStore();
      expect((await store.consume("k3", WINDOW, 1)).allowed).toBe(true);
      vi.advanceTimersByTime(WINDOW + 1);
      const next = await store.consume("k3", WINDOW, 1);
      expect(next.allowed).toBe(true);
      expect(next.count).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("key khác nhau đếm độc lập", async () => {
    const store = createMemoryStore();
    await store.consume("a", WINDOW, 1);
    const b = await store.consume("b", WINDOW, 1);
    expect(b.allowed).toBe(true);
  });
});

describe("prisma rate-limit store (sqlite isolate)", () => {
  let client: PrismaClient;
  let dir: string;

  // DDL khớp chính xác với những gì `prisma db push` sinh ra cho
  // RateLimitBucket trên sqlite (prisma/dev.db). Dùng DB file tạm riêng để
  // test không chạm vào dev.db.
  const DDL = `
    CREATE TABLE "RateLimitBucket" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "windowStart" DATETIME NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" DATETIME NOT NULL
    );
    CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
  `;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "ratelimit-test-"));
    client = new PrismaClient({
      datasourceUrl: `file:${dir}/test.db`,
      log: ["error"],
    });
    await client.$connect();
    await client.$executeRawUnsafe(DDL);
  });

  afterAll(async () => {
    await client.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it("hit đầu tiên tạo row count=1 (upsert path)", async () => {
    const store = createPrismaStore(client);
    const r = await store.consume("first", WINDOW, MAX);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1);
    const row = await client.rateLimitBucket.findUnique({ where: { key: "first" } });
    expect(row?.count).toBe(1);
    expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("cho phép tới max rồi chặn, count tiếp tục tăng", async () => {
    const store = createPrismaStore(client);
    const results = [];
    for (let i = 0; i < MAX + 1; i++) {
      results.push(await store.consume("cap", WINDOW, MAX));
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[MAX].count).toBe(MAX + 1);
    expect(results[MAX].remaining).toBe(0);
  });

  it("window hết hạn → reset về count=1, vẫn allowed", async () => {
    const store = createPrismaStore(client);
    // đẩy expiresAt về quá khứ để mô phỏng hết hạn
    await client.$executeRawUnsafe(
      `UPDATE "RateLimitBucket" SET "expiresAt" = ? WHERE "key" = 'cap'`,
      new Date(Date.now() - 1000),
    );
    const r = await store.consume("cap", WINDOW, MAX);
    expect(r.allowed).toBe(true);
    expect(r.count).toBe(1); // window mới, không cộng dồn từ window cũ
    const row = await client.rateLimitBucket.findUnique({ where: { key: "cap" } });
    expect(row?.count).toBe(1);
  });

  it("reset(key) xoá bucket → hit tiếp theo lại được phép", async () => {
    const store = createPrismaStore(client);
    for (let i = 0; i < MAX + 1; i++) await store.consume("rst", WINDOW, MAX);
    expect((await store.consume("rst", WINDOW, MAX)).allowed).toBe(false);
    await store.reset("rst");
    const row = await client.rateLimitBucket.findUnique({ where: { key: "rst" } });
    expect(row).toBeNull();
    expect((await store.consume("rst", WINDOW, MAX)).allowed).toBe(true);
  });

  it("nhiều key độc lập trong cùng DB", async () => {
    const store = createPrismaStore(client);
    await store.consume("shared", WINDOW, 1);
    const r = await store.consume("other", WINDOW, 1);
    expect(r.allowed).toBe(true);
  });
});

describe("getRateLimitStore", () => {
  it("mặc định là memory backend", () => {
    expect(getRateLimitStore().backend).toBe("memory");
  });
});
