import { NextResponse } from "next/server";
import { getTodayQuestion } from "@/lib/dailyQuestion";

export async function GET() {
  const question = await getTodayQuestion();
  return NextResponse.json({ question, date: new Date().toISOString().slice(0, 10) });
}
