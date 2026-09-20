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
  const type = searchParams.get("type") ?? "photos"; // photos, prompts

  if (type === "photos") {
    const photos = await prisma.profilePhoto.findMany({
      where: { status: "PENDING" as any },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { id: true, email: true, name: true, profile: { select: { firstName: true } } } } },
    });
    // fallback: if no pending, show recent for demo
    const data = photos.length ? photos : await prisma.profilePhoto.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { id: true, email: true } } } });
    return NextResponse.json({ photos: data });
  }

  if (type === "prompts") {
    const prompts = await prisma.promptAnswer.findMany({ where: { status: "PENDING" as any }, orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { id: true, email: true } } } });
    const data = prompts.length ? prompts : await prisma.promptAnswer.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { id: true, email: true } } } });
    return NextResponse.json({ prompts: data });
  }

  // verification queue
  if (type === "verification") {
    const reqs = await prisma.verificationRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { id: true, email: true, profile: { select: { firstName: true } } } } } });
    return NextResponse.json({ verificationRequests: reqs });
  }

  return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { type, id, action, note } = await req.json();
  if (type === "photo") {
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    await prisma.profilePhoto.update({ where: { id }, data: { status, moderatedAt: new Date(), moderatedBy: userId } });
    if (status === "REJECTED") {
      // optionally delete
    }
    await prisma.adminAction.create({ data: { adminId: userId, action: `MODERATE_PHOTO_${status}`, metadata: JSON.stringify({ photoId: id }) } });
    return NextResponse.json({ status });
  }
  if (type === "prompt") {
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    await prisma.promptAnswer.update({ where: { id }, data: { status } });
    if (status === "REJECTED") await prisma.promptAnswer.delete({ where: { id } });
    await prisma.adminAction.create({ data: { adminId: userId, action: `MODERATE_PROMPT_${status}`, metadata: JSON.stringify({ promptId: id }) } });
    return NextResponse.json({ status });
  }
  if (type === "verification") {
    const v = await prisma.verificationRequest.findUnique({ where: { id } });
    if (!v) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (action === "APPROVE") {
      await prisma.verificationRequest.update({ where: { id }, data: { status: "APPROVED", reviewedBy: userId, reviewedAt: new Date(), note } });
      await prisma.user.update({ where: { id: v.userId }, data: { isVerified: true, verifiedAt: new Date(), verificationStatus: "VERIFIED" } });
      await prisma.notification.create({ data: { userId: v.userId, type: "VERIFICATION", title: "Xác minh thành công", body: "Bạn đã được tick xanh ♥" } });
    } else {
      await prisma.verificationRequest.update({ where: { id }, data: { status: "REJECTED", reviewedBy: userId, reviewedAt: new Date(), note } });
      await prisma.user.update({ where: { id: v.userId }, data: { verificationStatus: "REJECTED" } });
    }
    await prisma.adminAction.create({ data: { adminId: userId, targetId: v.userId, action: action === "APPROVE" ? "VERIFY_APPROVE" : "VERIFY_REJECT" } });
    return NextResponse.json({ status: action });
  }
  return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
}
