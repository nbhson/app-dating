import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      photos: { orderBy: { position: "asc" } },
      preferences: true,
      promptAnswers: true,
      dailyAnswers: { orderBy: { date: "desc" }, take: 5 },
    },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // stats for Admin view
  const [likesSent, likesReceived, matchesCount, reportsAgainst] = await Promise.all([
    prisma.like.count({ where: { fromUserId: id } }),
    prisma.like.count({ where: { toUserId: id } }),
    prisma.match.count({ where: { OR: [{ userAId: id }, { userBId: id }] } }),
    prisma.report.count({ where: { reportedId: id } }),
  ]);

  return NextResponse.json({
    user,
    stats: { likesSent, likesReceived, matchesCount, reportsAgainst },
  });
}
