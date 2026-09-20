import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true, verificationStatus: true, verifiedAt: true } });
  const requests = await prisma.verificationRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 });
  return NextResponse.json({ user, requests });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let photoUrl: string | null = null;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data") || ct.includes("form-data")) {
    try {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const name = `${userId}-${Date.now()}.jpg`;
        const { writeFile, mkdir } = await import("fs/promises");
        await mkdir("public/uploads/verification", { recursive: true });
        await writeFile(`public/uploads/verification/${name}`, buf);
        photoUrl = `/uploads/verification/${name}`;
      }
      const urlField = form.get("photoUrl") as string | null;
      if (!photoUrl && urlField) photoUrl = urlField;
    } catch {}
  } else {
    const body = await req.json().catch(() => ({}));
    photoUrl = (body as any).photoUrl ?? null;
  }
  if (!photoUrl) return NextResponse.json({ error: "MISSING_PHOTO" }, { status: 400 });

  // limit pending
  const pending = await prisma.verificationRequest.findFirst({ where: { userId, status: "PENDING" } });
  if (pending) return NextResponse.json({ error: "ALREADY_PENDING" }, { status: 409 });

  const r = await prisma.verificationRequest.create({ data: { userId, photoUrl, status: "PENDING" } });
  await prisma.user.update({ where: { id: userId }, data: { verificationStatus: "PENDING" } });
  return NextResponse.json({ status: "SUBMITTED", request: r });
}
