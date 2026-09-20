import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTodayUsage, DAILY_LIMIT } from "@/lib/daily";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const usage = await getTodayUsage(userId);
  return NextResponse.json({ viewed: usage.profilesViewed, limit: DAILY_LIMIT, likes: usage.likes, passes: usage.passes });
}
