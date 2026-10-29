import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { todayKey } from "@/lib/utils";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { toUserId } = await req.json().catch(() => null) ?? {};
  if (!toUserId || toUserId === userId) return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });

  // Validate target (id rác → FK violation 500 trước đây).
  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { status: true } });
  if (!target || target.status !== "ACTIVE") {
    return NextResponse.json({ error: "TARGET_NOT_AVAILABLE" }, { status: 404 });
  }


  const existingPass = await prisma.pass.findUnique({ where: { fromUserId_toUserId: { fromUserId: userId, toUserId } } });
  if (existingPass) return NextResponse.json({ status: "ALREADY_PASSED" });

  const existingLike = await prisma.like.findUnique({ where: { fromUserId_toUserId: { fromUserId: userId, toUserId } } });
  if (existingLike) return NextResponse.json({ error: "ALREADY_LIKED" }, { status: 409 });

  await prisma.pass.create({ data: { fromUserId: userId, toUserId } });
  const date = todayKey();
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { passes: { increment: 1 } },
    create: { userId, date, passes: 1 },
  });

  return NextResponse.json({ status: "PASS_CREATED" });
}
