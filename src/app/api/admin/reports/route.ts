import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  const [reports, total] = await Promise.all([
    prisma.report.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit, include: { reporter: { select: { id: true, email: true, name: true } }, reported: { select: { id: true, email: true, name: true } } } }),
    prisma.report.count({ where }),
  ]);
  return NextResponse.json({ reports, total, page, limit });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { reportId, status, actionTaken, resolutionNote } = await req.json();
  if (!reportId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  if (!["PENDING", "RESOLVED", "DISMISSED"].includes(status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status, reviewedAt: new Date(), reviewedBy: userId, actionTaken: actionTaken ?? null, resolutionNote: resolutionNote ?? null },
  });
  await prisma.adminAction.create({ data: { adminId: userId, targetId: updated.reportedId, action: status === "RESOLVED" ? "RESOLVE_REPORT" : "DISMISS_REPORT", reason: resolutionNote, metadata: JSON.stringify({ reportId, reason: updated.reason }) } });
  // optional auto suspend if resolved with suspend
  if (status === "RESOLVED" && actionTaken === "SUSPEND") {
    await prisma.user.update({ where: { id: updated.reportedId }, data: { status: "SUSPENDED" } });
  }
  return NextResponse.json({ report: updated });
}
