import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "TOO_LARGE" }, { status: 400 });
  const duration = Number(form.get("duration") ?? 15);
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("webm") ? "webm" : file.type.includes("mp4") ? "m4a" : "webm";
  const dir = path.join(process.cwd(), "public", "uploads", "voices");
  await mkdir(dir, { recursive: true });
  const name = `${userId}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  const url = `/uploads/voices/${name}`;
  // Chỉ update profile CÓ SẴN — upsert cũ tự tạo profile rác ("You", dob
  // 1998, WOMAN) hiện trong discovery như một user thật.
  const existing = await prisma.profile.findUnique({ where: { userId }, select: { userId: true } });
  if (!existing) {
    return NextResponse.json({ error: "NO_PROFILE", message: "Hoàn thiện hồ sơ trước khi thêm giọng nói" }, { status: 400 });
  }
  await prisma.profile.update({
    where: { userId },
    data: { voiceUrl: url, voiceDuration: Math.min(30, Math.max(3, duration)) },
  });
  return NextResponse.json({ url, duration });
}

export async function DELETE() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  await prisma.profile.update({ where: { userId }, data: { voiceUrl: null, voiceDuration: null } });
  return NextResponse.json({ ok: true });
}
