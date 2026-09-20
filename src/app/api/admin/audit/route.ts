import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const skip = (page - 1) * limit;
  const [actions, total] = await Promise.all([
    prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit, include: { admin: { select: { email: true, name: true } }, target: { select: { email: true, name: true } } } }),
    prisma.adminAction.count(),
  ]);
  return NextResponse.json({ actions, total, page, limit });
}
