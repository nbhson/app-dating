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
  const status = searchParams.get("status") ?? "PENDING";
  const requests = await prisma.verificationRequest.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 50, include: { user: { include: { profile: true } } } });
  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { requestId, action, note } = await req.json();
  const r = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!r) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (action === "APPROVE") {
    await prisma.verificationRequest.update({ where: { id: requestId }, data: { status: "APPROVED", reviewedBy: userId, reviewedAt: new Date(), note } });
    await prisma.user.update({ where: { id: r.userId }, data: { isVerified: true, verifiedAt: new Date(), verificationStatus: "VERIFIED" } });
    await prisma.notification.create({ data: { userId: r.userId, type: "VERIFICATION", title: "Xác minh thành công", body: "Bạn đã có tick xanh ♥" } });
  } else {
    await prisma.verificationRequest.update({ where: { id: requestId }, data: { status: "REJECTED", reviewedBy: userId, reviewedAt: new Date(), note } });
    await prisma.user.update({ where: { id: r.userId }, data: { verificationStatus: "REJECTED" } });
  }
  await prisma.adminAction.create({ data: { adminId: userId, targetId: r.userId, action: action === "APPROVE" ? "VERIFY_APPROVE" : "VERIFY_REJECT" } });
  return NextResponse.json({ status: "OK" });
}
