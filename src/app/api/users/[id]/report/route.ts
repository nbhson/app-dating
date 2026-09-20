import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["Fake profile", "Harassment", "Spam", "Inappropriate content", "Scam", "Other"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  if (id === userId) return NextResponse.json({ error: "CANNOT_REPORT_SELF" }, { status: 400 });
  const { reason, details } = await req.json();
  if (!ALLOWED.includes(reason)) return NextResponse.json({ error: "INVALID_REASON" }, { status: 400 });
  const report = await prisma.report.create({ data: { reporterId: userId, reportedId: id, reason, details } });
  return NextResponse.json({ report });
}
