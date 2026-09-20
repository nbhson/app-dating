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
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status") ?? "";
  const verified = searchParams.get("verified") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
      { profile: { firstName: { contains: q } } },
    ];
  }
  if (status) where.status = status;
  if (verified === "true") where.isVerified = true;
  if (verified === "false") where.isVerified = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { profile: true, photos: { take: 1, orderBy: { position: "asc" } }, preferences: true },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
}
