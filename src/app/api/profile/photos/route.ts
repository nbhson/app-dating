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
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });

  const photosCount = await prisma.profilePhoto.count({ where: { userId } });
  if (photosCount >= 6) return NextResponse.json({ error: "MAX_PHOTOS" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadDir = path.join(process.cwd(), "public", "uploads", userId);
  await mkdir(uploadDir, { recursive: true });
  // SECURITY: extension phải suy ra từ MIME đã allowlist ở trên, KHÔNG lấy từ
  // file.name (client kiểm soát hoàn toàn). Trước đây upload `x.svg` với MIME
  // khai báo image/png được ghi xuống public/uploads và serve same-origin →
  // stored XSS (SVG chạy script trong origin của app).
  const EXT_BY_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const ext = EXT_BY_MIME[file.type];
  // Defense-in-depth: chặn thêm magic bytes của SVG/XML (SVG vẫn qua được nếu
  // browser sniff nội dung thay vì tin Content-Type).
  if (!ext || /^\s*<\??(svg|xml)/i.test(buffer.subarray(0, 256).toString("utf8"))) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);
  const url = `/uploads/${userId}/${filename}`;

  const photo = await prisma.profilePhoto.create({
    data: { userId, url, position: photosCount },
  });

  return NextResponse.json({ photo });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const photos = await prisma.profilePhoto.findMany({ where: { userId }, orderBy: { position: "asc" } });
  return NextResponse.json({ photos });
}
