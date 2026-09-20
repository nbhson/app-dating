import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const questions = await prisma.dailyQuestion.findMany({ orderBy: { date: "desc" }, take: 30 });
  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { date, question } = await req.json();
  if (!date || !question) return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  const q = await prisma.dailyQuestion.upsert({
    where: { date },
    update: { question, createdBy: userId },
    create: { date, question, createdBy: userId },
  });
  await prisma.adminAction.create({ data: { adminId: userId, action: "UPSERT_DAILY_QUESTION", metadata: JSON.stringify({ date, question }) } });
  return NextResponse.json({ question: q });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "MISSING_DATE" }, { status: 400 });
  await prisma.dailyQuestion.delete({ where: { date } });
  return NextResponse.json({ status: "DELETED" });
}
