import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const lastPass = await prisma.pass.findFirst({
    where: { fromUserId: userId },
    orderBy: { createdAt: "desc" },
  });
  if (!lastPass) return NextResponse.json({ error: "NO_PASS_TO_UNDO" }, { status: 404 });

  // allow undo only within 5 minutes
  const age = Date.now() - new Date(lastPass.createdAt).getTime();
  if (age > 5 * 60 * 1000) return NextResponse.json({ error: "UNDO_EXPIRED" }, { status: 400 });

  await prisma.pass.delete({ where: { id: lastPass.id } });
  const date = todayKey();
  await prisma.dailyUsage.updateMany({
    where: { userId, date },
    data: { passes: { decrement: 1 } as any },
  });

  return NextResponse.json({ status: "UNDONE", undoneUserId: lastPass.toUserId });
}
