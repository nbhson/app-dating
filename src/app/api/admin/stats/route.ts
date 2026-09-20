import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const date = todayKey();
  const [totalUsers, activeUsers, newToday, matchesToday, messagesToday, reportsToday] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(date) } } }),
    prisma.match.count({ where: { createdAt: { gte: new Date(date) } } }),
    prisma.message.count({ where: { createdAt: { gte: new Date(date) } } }),
    prisma.report.count({ where: { createdAt: { gte: new Date(date) } } }),
  ]);
  const discoveryToday = await prisma.dailyUsage.aggregate({ _sum: { profilesViewed: true }, where: { date } });

  const reports = await prisma.report.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { reporter: true, reported: true } });
  const users = await prisma.user.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { profile: true } });

  return NextResponse.json({
    totalUsers,
    activeUsers,
    newToday,
    matchesToday,
    messagesToday,
    reportsToday,
    discoveryToday: discoveryToday._sum.profilesViewed ?? 0,
    recentReports: reports,
    recentUsers: users,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { targetUserId, action } = await req.json();
  if (action === "SUSPEND") await prisma.user.update({ where: { id: targetUserId }, data: { status: "SUSPENDED" } });
  if (action === "ACTIVATE") await prisma.user.update({ where: { id: targetUserId }, data: { status: "ACTIVE" } });
  if (action === "DELETE") await prisma.user.update({ where: { id: targetUserId }, data: { status: "DELETED" } });
  return NextResponse.json({ status: "OK" });
}
