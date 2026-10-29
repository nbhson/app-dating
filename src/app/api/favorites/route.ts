import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { getAge } from "@/lib/utils";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const favs = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { target: { include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } } } } },
    take: 100,
  });
  return NextResponse.json({
    favorites: favs.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      user: {
        id: f.target.id,
        name: f.target.profile?.firstName ?? f.target.name,
        age: f.target.profile ? getAge(f.target.profile.dob) : undefined,
        photo: f.target.photos[0]?.url ?? null,
        bio: f.target.profile?.bio ?? null,
      },
    })),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { targetId } = await req.json().catch(() => null) ?? {};
  if (!targetId || targetId === userId) return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });

  // Validate target (id rác → FK violation 500 trước đây).
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { status: true } });
  if (!target || target.status !== "ACTIVE") {
    return NextResponse.json({ error: "TARGET_NOT_AVAILABLE" }, { status: 404 });
  }

  const exists = await prisma.favorite.findUnique({ where: { userId_targetId: { userId, targetId } } });
  if (exists) return NextResponse.json({ status: "ALREADY_FAVORITED", favorite: exists });

  const fav = await prisma.favorite.create({ data: { userId, targetId } });
  return NextResponse.json({ status: "FAVORITED", favorite: fav });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("targetId");
  if (!targetId) return NextResponse.json({ error: "MISSING_TARGET" }, { status: 400 });
  await prisma.favorite.deleteMany({ where: { userId, targetId } });
  return NextResponse.json({ status: "UNFAVORITED" });
}
