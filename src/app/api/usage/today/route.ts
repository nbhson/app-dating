import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { getTodayUsage, DAILY_LIMIT, DAILY_LIKE_LIMIT } from "@/lib/daily";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  // Round 2: trả thêm stamps + likeLimit — DiscoverClient hiện số tem còn lại
  // ngay trên composer thay vì chỉ phát hiện hết tem khi server trả 402.
  const [usage, me] = await Promise.all([
    getTodayUsage(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { stamps: true } }),
  ]);
  return NextResponse.json({
    viewed: usage.profilesViewed,
    limit: DAILY_LIMIT,
    likes: usage.likes,
    passes: usage.passes,
    likeLimit: DAILY_LIKE_LIMIT,
    stamps: me?.stamps ?? 0,
  });
}
