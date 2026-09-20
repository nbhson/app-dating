import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const date = todayKey();
  const [totalUsers, activeUsers, suspended, verified, incognito, matchesTotal, messagesTotal, reportsPending] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.user.count({ where: { isIncognito: true } }),
    prisma.match.count(),
    prisma.message.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
  ]);

  // 7 day funnel
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const day = todayKey(daysAgo(i));
    const [users, matches, messages, likes] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: daysAgo(i), lt: daysAgo(i - 1 < 0 ? 0 : i - 1) } } }).catch(() => 0),
      prisma.match.count({ where: { createdAt: { gte: daysAgo(i), lt: new Date(daysAgo(i).getTime() + 24 * 3600 * 1000) } } }),
      prisma.message.count({ where: { createdAt: { gte: daysAgo(i), lt: new Date(daysAgo(i).getTime() + 24 * 3600 * 1000) } } }),
      prisma.like.count({ where: { createdAt: { gte: daysAgo(i), lt: new Date(daysAgo(i).getTime() + 24 * 3600 * 1000) } } }),
    ]);
    last7.push({ date: day, users, matches, messages, likes });
  }

  // conversion
  const likesToday = await prisma.like.count({ where: { createdAt: { gte: new Date(date) } } });
  const matchesToday = await prisma.match.count({ where: { createdAt: { gte: new Date(date) } } });
  const conversion = likesToday ? Math.round((matchesToday / likesToday) * 100) : 0;

  return NextResponse.json({
    totals: { totalUsers, activeUsers, suspended, verified, incognito, matchesTotal, messagesTotal, reportsPending },
    last7,
    conversion,
    likesToday,
    matchesToday,
  });
}
