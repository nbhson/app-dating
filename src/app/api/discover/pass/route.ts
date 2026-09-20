import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { toUserId } = await req.json();
  if (!toUserId || toUserId === userId) return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });

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
