import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const configs = await prisma.systemConfig.findMany();
  const map: Record<string, string> = {};
  configs.forEach((c) => (map[c.key] = c.value));
  // defaults
  if (!map["DAILY_LIMIT"]) map["DAILY_LIMIT"] = "20";
  if (!map["SLOW_LIMIT"]) map["SLOW_LIMIT"] = "5";
  if (!map["STAMPS_PER_WEEK"]) map["STAMPS_PER_WEEK"] = "3";
  return NextResponse.json({ configs: map });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  await prisma.systemConfig.upsert({ where: { key }, update: { value: String(value), updatedBy: userId }, create: { key, value: String(value), updatedBy: userId } });
  await prisma.adminAction.create({ data: { adminId: userId, action: "UPDATE_CONFIG", metadata: JSON.stringify({ key, value }) } });
  return NextResponse.json({ status: "UPDATED" });
}
