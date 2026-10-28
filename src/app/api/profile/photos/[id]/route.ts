import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const photo = await prisma.profilePhoto.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (photo.userId !== userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const count = await prisma.profilePhoto.count({ where: { userId } });
  if (count <= 1) return NextResponse.json({ error: "MIN_ONE_PHOTO" }, { status: 400 });
  await prisma.profilePhoto.delete({ where: { id } });
  return NextResponse.json({ status: "DELETED" });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const { position } = await req.json();
  // Validate: position phải là số nguyên 0..5 (trước đây JSON type bất kỳ →
  // Prisma 500, âm/giá trị lạ vào DB).
  if (!Number.isInteger(position) || position < 0 || position > 5) {
    return NextResponse.json({ error: "INVALID_POSITION" }, { status: 400 });
  }
  const photo = await prisma.profilePhoto.findUnique({ where: { id } });
  if (!photo || photo.userId !== userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const updated = await prisma.profilePhoto.update({ where: { id }, data: { position } });
  return NextResponse.json({ photo: updated });
}
