/**
 * Smoke: Prisma rate-limit backend against a real Postgres DB.
 * Usage: DATABASE_URL=postgres://... npx tsx scripts/rl-smoke-pg.ts
 * (Requires the client generated from schema.postgres.prisma.)
 */
import { PrismaClient } from "@prisma/client";
import { createPrismaStore } from "../src/lib/ratelimit";

async function main() {
  const pg = new PrismaClient({ datasourceUrl: process.env.SMOKE_DATABASE_URL ?? process.env.DATABASE_URL });
  const store = createPrismaStore(pg);
  console.log("backend:", store.backend);
  const r1 = await store.consume("pg:k1", 60_000, 2);
  const r2 = await store.consume("pg:k1", 60_000, 2);
  const r3 = await store.consume("pg:k1", 60_000, 2);
  console.log("allowed:", r1.allowed, r2.allowed, r3.allowed); // true true false
  await store.reset("pg:k1");
  const r4 = await store.consume("pg:k1", 60_000, 2);
  console.log("after reset:", r4.allowed, r4.count); // true 1
  await store.reset("pg:k1");
  console.log("cleanup done");
  await pg.$disconnect();
}
main().catch(e => { console.error("ERR:", e.constructor?.name, e.code, (e.stack || String(e)).slice(0, 600)); process.exit(1); });
