import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  if (id === userId) return NextResponse.json({ error: "CANNOT_BLOCK_SELF" }, { status: 400 });
  const existing = await prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: userId, blockedId: id } } });
  if (existing) return NextResponse.json({ status: "ALREADY_BLOCKED" });
  await prisma.block.create({ data: { blockerId: userId, blockedId: id } });
  // remove matches & likes between them
  const userAId = userId < id ? userId : id;
  const userBId = userId < id ? id : userId;
  await prisma.match.deleteMany({ where: { userAId, userBId } });
  return NextResponse.json({ status: "BLOCKED" });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: id } });
  return NextResponse.json({ status: "UNBLOCKED" });
}
