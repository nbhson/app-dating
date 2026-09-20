import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  // allow all logged users to read active announcements
  const announcements = await prisma.announcement.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 10 });
  // if admin also return all
  if (me?.isAdmin) {
    const all = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    return NextResponse.json({ announcements: all });
  }
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { title, body, isActive } = await req.json();
  if (!title || !body) return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  const a = await prisma.announcement.create({ data: { title, body, isActive: isActive ?? true, createdBy: userId } });
  // broadcast as notification to all active users
  const users = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true }, take: 500 });
  if (users.length) {
    await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type: "SYSTEM", title: `Thông báo: ${title}`, body, link: "/" })) });
  }
  await prisma.adminAction.create({ data: { adminId: userId, action: "CREATE_ANNOUNCEMENT", metadata: JSON.stringify({ id: a.id }) } });
  return NextResponse.json({ announcement: a });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id, isActive, title, body } = await req.json();
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  const updated = await prisma.announcement.update({ where: { id }, data: { isActive: isActive ?? undefined, title: title ?? undefined, body: body ?? undefined } });
  return NextResponse.json({ announcement: updated });
}
