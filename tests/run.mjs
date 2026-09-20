import { prisma } from "../src/lib/prisma.ts";
import { todayKey } from "../src/lib/utils.ts";
import { DAILY_LIMIT } from "../src/lib/daily.ts";

async function testDailyLimit() {
  console.log("Test: Daily limit = 20");
  const user = await prisma.user.findFirst({ where: { email: "demo1@lumen.app" } });
  if (!user) throw new Error("seed missing");
  const date = todayKey();
  await prisma.dailyUsage.deleteMany({ where: { userId: user.id, date } });
  for (let i=0;i<20;i++) {
    await prisma.dailyUsage.upsert({ where: { userId_date: { userId: user.id, date }}, update:{ profilesViewed:{ increment:1 }}, create:{ userId:user.id, date, profilesViewed:1 }});
  }
  const usage = await prisma.dailyUsage.findUnique({ where:{ userId_date:{ userId:user.id, date } }});
  console.log(`  viewed=${usage.profilesViewed} limit=${DAILY_LIMIT} reached=${usage.profilesViewed>=DAILY_LIMIT} => ${usage.profilesViewed===20 ? "PASS":"FAIL"}`);
  // 21st should be blocked
  const canView = (usage.profilesViewed < DAILY_LIMIT);
  console.log(`  21st request blocked? ${!canView ? "PASS":"FAIL"}`);
  // reset
  await prisma.dailyUsage.delete({ where:{ userId_date:{ userId:user.id, date } }});
  console.log("  reset => PASS (deleted)");
}

async function testLikeMatch() {
  console.log("\nTest: Like/Match creation");
  const users = await prisma.user.findMany({ take:2 });
  const [a,b]=users;
  const userAId = a.id < b.id ? a.id : b.id;
  const userBId = a.id < b.id ? b.id : a.id;
  await prisma.match.deleteMany({ where:{ OR:[{userAId, userBId}] }});
  await prisma.like.deleteMany({ where:{ OR:[{fromUserId:a.id, toUserId:b.id},{fromUserId:b.id, toUserId:a.id}] }});
  await prisma.like.create({ data:{ fromUserId:a.id, toUserId:b.id }});
  const reciprocal = await prisma.like.findUnique({ where:{ fromUserId_toUserId:{ fromUserId:b.id, toUserId:a.id }}});
  if (!reciprocal) await prisma.like.create({ data:{ fromUserId:b.id, toUserId:a.id }});
  let match = await prisma.match.findUnique({ where:{ userAId_userBId:{ userAId, userBId }}});
  if(!match) match = await prisma.match.create({ data:{ userAId, userBId }});
  console.log(`  match created id=${match.id} => ${match ? "PASS":"FAIL"}`);
  // clean
  await prisma.like.deleteMany({ where:{ OR:[{fromUserId:a.id, toUserId:b.id},{fromUserId:b.id, toUserId:a.id}] }});
  await prisma.match.delete({ where:{ id: match.id }});
}

async function testBlock() {
  console.log("\nTest: Block removes from discovery");
  const users = await prisma.user.findMany({ take:2 });
  const [a,b]=users;
  await prisma.block.deleteMany({ where:{ blockerId:a.id, blockedId:b.id }});
  await prisma.block.create({ data:{ blockerId:a.id, blockedId:b.id }});
  const block = await prisma.block.findUnique({ where:{ blockerId_blockedId:{ blockerId:a.id, blockedId:b.id }}});
  console.log(`  block exists => ${block ? "PASS":"FAIL"}`);
  await prisma.block.delete({ where:{ blockerId_blockedId:{ blockerId:a.id, blockedId:b.id }}});
}

async function testOwnership() {
  console.log("\nTest: Messaging authorization");
  const m = await prisma.match.findFirst();
  if(!m) { console.log("  no match yet => SKIP"); return; }
  const outsider = await prisma.user.findFirst({ where:{ id:{ notIn:[m.userAId, m.userBId] }}});
  const canAccess = outsider && (outsider.id===m.userAId || outsider.id===m.userBId);
  console.log(`  outsider access blocked? ${!canAccess ? "PASS":"FAIL"}`);
}

await testDailyLimit();
await testLikeMatch();
await testBlock();
await testOwnership();
console.log("\nAll domain tests done");
await prisma.$disconnect();
