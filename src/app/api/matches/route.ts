import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAge } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }], status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      userA: { include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } }, preferences: true } },
      userB: { include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } }, preferences: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const data = await Promise.all(
    matches.map(async (m) => {
      const other = m.userAId === userId ? m.userB : m.userA;
      const unread = await prisma.message.count({ where: { matchId: m.id, senderId: { not: userId }, read: false } });
      return {
        id: m.id,
        createdAt: m.createdAt,
        other: {
          id: other.id,
          name: other.profile?.firstName ?? other.name ?? "User",
          age: other.profile ? getAge(other.profile.dob) : undefined,
          photo: other.photos[0]?.url ?? null,
          intent: (other.preferences as any)?.intent ?? null,
        },
        lastMessage: m.messages[0]?.content ?? null,
        lastMessageAt: m.messages[0]?.createdAt ?? m.createdAt,
        unread,
        type: "match" as const,
      };
    })
  );

  data.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  // pending likes (bưu thiếp chưa đáp lại) — đây là bug gốc: chỉ báo notification mà không vào hòm thư
  const mySentLikes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
  const sentSet = new Set(mySentLikes.map((x) => x.toUserId));
  const pendingLikesRaw = await prisma.like.findMany({
    where: { toUserId: userId, fromUserId: { notIn: Array.from(sentSet) } },
    orderBy: { createdAt: "desc" },
    include: { fromUser: { include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } } } } },
    take: 20,
  });
  const pendingLikes = pendingLikesRaw.map((l) => ({
    id: `like_${l.id}`,
    likeId: l.id,
    createdAt: l.createdAt,
    type: "like" as const,
    other: {
      id: l.fromUser.id,
      name: l.fromUser.profile?.firstName ?? l.fromUser.name ?? "User",
      age: l.fromUser.profile ? getAge(l.fromUser.profile.dob) : undefined,
      photo: l.fromUser.photos[0]?.url ?? null,
      intent: null,
    },
    comment: l.comment,
    anchor: (l as any).promptId,
    isPriority: (l as any).isPriority,
    lastMessage: `“${l.comment?.slice(0, 60) ?? ""}” — bưu thiếp mới`,
    lastMessageAt: l.createdAt,
    unread: 1,
  }));

  return NextResponse.json({ matches: data, pendingLikes, pendingLikesCount: pendingLikes.length });
}
