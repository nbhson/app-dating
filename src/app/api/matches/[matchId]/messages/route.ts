import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SLOW_LIMIT = 5;
const SLOW_WINDOW_HOURS = 48;

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { matchId } = await params;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId))
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, name: true } } },
  });

  await prisma.message.updateMany({
    where: { matchId, senderId: { not: userId }, read: false },
    data: { read: true, readAt: new Date() },
  });

  const otherId = match.userAId === userId ? match.userBId : match.userAId;
  const other = await prisma.user.findUnique({ where: { id: otherId }, include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } } } });

  // slow chat info: count messages from user in last 24h if match <48h old
  const isNew = Date.now() - new Date(match.createdAt).getTime() < SLOW_WINDOW_HOURS * 3600 * 1000;
  let slow: any = null;
  if (isNew) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const count = await prisma.message.count({ where: { matchId, senderId: userId, createdAt: { gte: since } } });
    slow = { remaining: Math.max(0, SLOW_LIMIT - count), limit: SLOW_LIMIT, isNew };
  }

  // starter is first message that looks like intro
  const starter = messages.find((m) => m.content.includes("bưu thiếp mở lời"))?.content ?? null;

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      createdAt: m.createdAt,
      isMine: m.senderId === userId,
      read: m.read,
      readAt: (m as any).readAt,
      editedAt: (m as any).editedAt,
      isEdited: (m as any).isEdited,
      deletedAt: (m as any).deletedAt,
    })),
    other: other
      ? {
          id: other.id,
          name: other.profile?.firstName ?? other.name ?? "User",
          photo: other.photos[0]?.url ?? null,
        }
      : null,
    slow,
    starter,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { matchId } = await params;
  const { content } = await req.json();
  if (!content || typeof content !== "string" || content.trim().length === 0)
    return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "MESSAGE_TOO_LONG" }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId))
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const otherId = match.userAId === userId ? match.userBId : match.userAId;
  const blocked = await prisma.block.findFirst({
    where: { OR: [{ blockerId: userId, blockedId: otherId }, { blockerId: otherId, blockedId: userId }] },
  });
  if (blocked) return NextResponse.json({ error: "BLOCKED" }, { status: 403 });

  // slow-chat enforcement
  const isNew = Date.now() - new Date(match.createdAt).getTime() < SLOW_WINDOW_HOURS * 3600 * 1000;
  if (isNew) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const count = await prisma.message.count({ where: { matchId, senderId: userId, createdAt: { gte: since } } });
    if (count >= SLOW_LIMIT) return NextResponse.json({ error: "SLOW_LIMIT", remaining: 0 }, { status: 429 });
  }

  const message = await prisma.message.create({
    data: { matchId, senderId: userId, content: content.trim() },
  });
  // notify recipient
  try {
    await prisma.notification.create({
      data: { userId: otherId, type: "MESSAGE", title: "Thư mới ✉", body: content.trim().slice(0, 60), link: `/matches/${matchId}` },
    });
  } catch {}

  return NextResponse.json({ message: { id: message.id, content: message.content, createdAt: message.createdAt } });
}
