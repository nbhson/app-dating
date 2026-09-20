import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { toUserId, comment, anchor } = await req.json();
  if (!toUserId || toUserId === userId) return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });

  // Lumen: require comment 6-140 chars
  if (!comment || typeof comment !== "string" || comment.trim().length < 6) {
    return NextResponse.json({ error: "COMMENT_REQUIRED", message: "Hãy viết ít nhất 6 ký tự để gửi bưu thiếp" }, { status: 400 });
  }
  if (comment.trim().length > 140) return NextResponse.json({ error: "COMMENT_TOO_LONG" }, { status: 400 });

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: toUserId },
        { blockerId: toUserId, blockedId: userId },
      ],
    },
  });
  if (blocked) return NextResponse.json({ error: "BLOCKED" }, { status: 403 });

  const existingLike = await prisma.like.findUnique({ where: { fromUserId_toUserId: { fromUserId: userId, toUserId } } });
  if (existingLike) return NextResponse.json({ error: "ALREADY_LIKED" }, { status: 409 });
  const existingPass = await prisma.pass.findUnique({ where: { fromUserId_toUserId: { fromUserId: userId, toUserId } } });
  if (existingPass) await prisma.pass.delete({ where: { fromUserId_toUserId: { fromUserId: userId, toUserId } } });

  const date = todayKey();
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { likes: { increment: 1 } },
    create: { userId, date, likes: 1 },
  });

  const reciprocal = await prisma.like.findUnique({ where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: userId } } });

  await prisma.like.create({ data: { fromUserId: userId, toUserId, comment: comment.trim().slice(0, 140), promptId: anchor ? String(anchor).slice(0, 200) : null } });

  if (reciprocal) {
    const userAId = userId < toUserId ? userId : toUserId;
    const userBId = userId < toUserId ? toUserId : userId;
    const existingMatch = await prisma.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    let matchId: string;
    if (!existingMatch) {
      const match = await prisma.match.create({ data: { userAId, userBId } });
      matchId = match.id;
    } else {
      matchId = existingMatch.id;
    }
    // create intro message with comment so chat opens with context
    const intro = `“${comment.trim()}” — bưu thiếp mở lời`;
    try {
      await prisma.message.create({ data: { matchId, senderId: userId, content: intro } });
      if (reciprocal.comment) {
        // ensure reciprocal's intro also exists (only once)
        const count = await prisma.message.count({ where: { matchId } });
        if (count === 1) {
          await prisma.message.create({ data: { matchId, senderId: toUserId, content: `“${reciprocal.comment}” — bưu thiếp mở lời` } });
        }
      }
    } catch {}
    return NextResponse.json({ status: existingMatch ? "MATCH_EXISTS" : "MATCH_CREATED", matchId });
  }

  return NextResponse.json({ status: "LIKE_CREATED" });
}
