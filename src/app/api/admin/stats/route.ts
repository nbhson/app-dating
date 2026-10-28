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

  const [pendingVerification, pendingReports, pendingPhotos, pendingPrompts] = await Promise.all([
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.profilePhoto.count({ where: { status: "PENDING" } }),
    prisma.promptAnswer.count({ where: { status: "PENDING" } }),
  ]);

  const reports = await prisma.report.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { reporter: true, reported: true } });
  const users = await prisma.user.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { profile: true, photos: { orderBy: { position: "asc" } } } });

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
    pendingCounts: {
      verification: pendingVerification,
      reports: pendingReports,
      photos: pendingPhotos,
      prompts: pendingPrompts,
      moderation: pendingPhotos + pendingPrompts + pendingVerification,
      total: pendingVerification + pendingReports + pendingPhotos + pendingPrompts,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { targetUserId, action } = await req.json();
  // Validate: action whitelist + target tồn tại + không cho admin tác động
  // lên admin khác (kể cả chính mình) — trước đây id rác → Prisma 500 và
  // admin có thể khóa chính mình, không có audit entry nào.
  const VALID_ACTIONS = new Set(["SUSPEND", "ACTIVATE", "DELETE"]);
  if (!VALID_ACTIONS.has(action)) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });
  }
  if (targetUserId === userId) {
    return NextResponse.json({ error: "CANNOT_TARGET_SELF" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isAdmin: true } });
  if (!target) return NextResponse.json({ error: "TARGET_NOT_FOUND" }, { status: 404 });
  if (target.isAdmin) return NextResponse.json({ error: "CANNOT_MODERATE_ADMIN" }, { status: 403 });

  const status = action === "SUSPEND" ? "SUSPENDED" : action === "DELETE" ? "DELETED" : "ACTIVE";
  await prisma.user.update({ where: { id: targetUserId }, data: { status } });
  // Audit trail: mọi moderatio action phải ghi lại (schema: AdminAction).
  await prisma.adminAction.create({
    data: { adminId: userId, targetId: targetUserId, action, reason: `status -> ${status}` },
  });
  return NextResponse.json({ status: "OK" });
}
