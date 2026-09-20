import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const PROMPT_QUESTIONS = [
  "Điều khiến mình tò mò gần đây",
  "Một ngày Chủ Nhật hoàn hảo",
  "Mình sẽ không bao giờ đùa về",
  "Cách mình thể hiện sự quan tâm",
  "Điều mình đang học về bản thân",
  "Chuyến đi khiến mình thay đổi",
  "Âm nhạc khiến mình nhớ một người",
  "Mình muốn được hiểu điều gì ngay từ đầu",
];

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const answers = await prisma.promptAnswer.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ answers, questions: PROMPT_QUESTIONS });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { question, answer } = await req.json();
  if (!question || !answer || typeof answer !== "string" || answer.trim().length < 4) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }
  if (!PROMPT_QUESTIONS.includes(question)) return NextResponse.json({ error: "UNKNOWN_QUESTION" }, { status: 400 });
  const existing = await prisma.promptAnswer.findFirst({ where: { userId, question } });
  if (existing) {
    const updated = await prisma.promptAnswer.update({ where: { id: existing.id }, data: { answer: answer.trim().slice(0, 300) } });
    return NextResponse.json({ answer: updated });
  }
  if ((await prisma.promptAnswer.count({ where: { userId } })) >= 3) {
    return NextResponse.json({ error: "LIMIT_3" }, { status: 400 });
  }
  const created = await prisma.promptAnswer.create({ data: { userId, question, answer: answer.trim().slice(0, 300) } });
  return NextResponse.json({ answer: created });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  const pa = await prisma.promptAnswer.findUnique({ where: { id } });
  if (!pa || pa.userId !== userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  await prisma.promptAnswer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
