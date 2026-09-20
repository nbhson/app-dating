import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";
import { getTodayQuestion } from "@/lib/dailyQuestion";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const date = todayKey();
  const question = await getTodayQuestion();
  const answer = await prisma.dailyAnswer.findUnique({ where: { userId_date: { userId, date } } });
  return NextResponse.json({ question, answer: answer?.answer ?? null, date });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { answer } = await req.json();
  if (!answer || typeof answer !== "string" || answer.trim().length < 4) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  if (answer.trim().length > 300) return NextResponse.json({ error: "TOO_LONG" }, { status: 400 });
  const date = todayKey();
  await getTodayQuestion();
  const upserted = await prisma.dailyAnswer.upsert({
    where: { userId_date: { userId, date } },
    update: { answer: answer.trim().slice(0, 300) },
    create: { userId, date, answer: answer.trim().slice(0, 300) },
  });
  return NextResponse.json({ answer: upserted });
}
