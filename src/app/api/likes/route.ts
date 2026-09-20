import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAge } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "received"; // received, sent, all

  if (type === "sent") {
    const likes = await prisma.like.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        toUser: { include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } } } },
      },
      take: 50,
    });
    return NextResponse.json({
      likes: likes.map((l) => ({
        id: l.id,
        createdAt: l.createdAt,
        comment: l.comment,
        isPriority: (l as any).isPriority,
        user: {
          id: l.toUser.id,
          name: l.toUser.profile?.firstName ?? l.toUser.name,
          age: l.toUser.profile ? getAge(l.toUser.profile.dob) : undefined,
          photo: l.toUser.photos[0]?.url ?? null,
          bio: l.toUser.profile?.bio ?? null,
        },
      })),
    });
  }

  if (type === "received") {
    // who liked me - exclude already matched or passed
    const likes = await prisma.like.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } }, preferences: true } },
      },
      take: 50,
    });
    // filter out already liked back (matched)
    const myLikes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const myLikedSet = new Set(myLikes.map((x) => x.toUserId));
    const filtered = likes.filter((l) => !myLikedSet.has(l.fromUserId));
    return NextResponse.json({
      likes: filtered.map((l) => ({
        id: l.id,
        createdAt: l.createdAt,
        comment: l.comment,
        anchor: (l as any).promptId,
        isPriority: (l as any).isPriority,
        user: {
          id: l.fromUser.id,
          name: l.fromUser.profile?.firstName ?? l.fromUser.name,
          age: l.fromUser.profile ? getAge(l.fromUser.profile.dob) : undefined,
          photo: l.fromUser.photos[0]?.url ?? null,
          bio: l.fromUser.profile?.bio ?? null,
          isVerified: (l.fromUser as any).isVerified ?? false,
        },
      })),
    });
  }

  // all
  const [sent, received] = await Promise.all([
    prisma.like.count({ where: { fromUserId: userId } }),
    prisma.like.count({ where: { toUserId: userId } }),
  ]);
  return NextResponse.json({ sent, received });
}
