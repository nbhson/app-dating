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
      };
    })
  );

  data.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return NextResponse.json({ matches: data });
}
