import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ matchId: string; messageId: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { matchId, messageId } = await params;
  const { content } = await req.json();
  if (!content || typeof content !== "string" || content.trim().length === 0)
    return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "MESSAGE_TOO_LONG" }, { status: 400 });

  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.matchId !== matchId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (msg.senderId !== userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (msg.deletedAt) return NextResponse.json({ error: "ALREADY_DELETED" }, { status: 400 });

  // only allow edit within 15 minutes
  const age = Date.now() - new Date(msg.createdAt).getTime();
  if (age > 15 * 60 * 1000) return NextResponse.json({ error: "EDIT_EXPIRED" }, { status: 400 });

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: content.trim(), isEdited: true, editedAt: new Date() },
  });
  return NextResponse.json({ message: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ matchId: string; messageId: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { matchId, messageId } = await params;
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.matchId !== matchId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (msg.senderId !== userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (msg.deletedAt) return NextResponse.json({ status: "ALREADY_DELETED" });

  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date(), content: "Đã thu hồi tin nhắn" } });
  return NextResponse.json({ status: "DELETED" });
}
