import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/domain";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  if (id === userId) return NextResponse.json({ error: "CANNOT_REPORT_SELF" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const reason = (body as any)?.reason;
  const details = (body as any)?.details;
  // Allowlist từ lib/domain — single source dùng chung với client.
  if (typeof reason !== "string" || !(REPORT_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json({ error: "INVALID_REASON" }, { status: 400 });
  }
  if (details !== undefined && details !== null && typeof details !== "string") {
    return NextResponse.json({ error: "INVALID_DETAILS" }, { status: 400 });
  }

  // Validate target: id rác đi thẳng xuống report.create → FK violation 500
  // (cùng lớp bug Round-1 #6, lúc đó chỉ fix trong like).
  const target = await prisma.user.findUnique({ where: { id }, select: { status: true } });
  if (!target || target.status !== "ACTIVE") {
    return NextResponse.json({ error: "TARGET_NOT_AVAILABLE" }, { status: 404 });
  }

  const report = await prisma.report.create({
    data: { reporterId: userId, reportedId: id, reason, details: details?.slice(0, 1000) },
  });
  // Trả object tối thiểu — không leak toàn bộ row nội bộ.
  return NextResponse.json({ report: { id: report.id, status: report.status } });
}
