import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const unreadOnly = searchParams.get("unread") === "true";

  const where: any = { userId };
  if (unreadOnly) where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  // internal use or admin broadcast - for now let admin create
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { userIds, type, title, body, link } = await req.json();
  if (!title) return NextResponse.json({ error: "MISSING_TITLE" }, { status: 400 });
  const targets: string[] = Array.isArray(userIds) ? userIds : [];
  if (targets.length === 0) return NextResponse.json({ error: "NO_TARGETS" }, { status: 400 });
  const data = targets.map((uid) => ({ userId: uid, type: type ?? "SYSTEM", title, body, link }));
  await prisma.notification.createMany({ data });
  return NextResponse.json({ status: "CREATED", count: targets.length });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id, markAll } = await req.json();
  if (markAll) {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return NextResponse.json({ status: "ALL_READ" });
  }
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  return NextResponse.json({ status: "READ" });
}
