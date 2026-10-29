import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  if (id === userId) return NextResponse.json({ error: "CANNOT_BLOCK_SELF" }, { status: 400 });
  // Validate target tồn tại (id rác → FK violation 500 trước đây). Block một
  // tài khoản đã SUSPENDED/DELETED vẫn cho phép — user có quyền chặn ai đó
  // trong lịch sử tương tác của mình.
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "TARGET_NOT_FOUND" }, { status: 404 });
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
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: id } });
  return NextResponse.json({ status: "UNBLOCKED" });
}
