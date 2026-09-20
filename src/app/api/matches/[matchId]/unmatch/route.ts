import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { matchId } = await params;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId))
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.match.update({ where: { id: matchId }, data: { status: "UNMATCHED" } });
  // soft delete: also mark messages as deleted? keep for audit but hide
  return NextResponse.json({ status: "UNMATCHED" });
}
