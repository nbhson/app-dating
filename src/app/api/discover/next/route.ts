import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DAILY_LIMIT, incrementView } from "@/lib/daily";
import { todayKey, getAge } from "@/lib/utils";
import { recommendationEngine } from "@/lib/recommendation";
import { getTodayQuestion } from "@/lib/dailyQuestion";
import { haversineKm, obscureDistance } from "@/lib/geo";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, preferences: true },
  });
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  if (!user.profile || !user.preferences) {
    return NextResponse.json({ error: "PROFILE_INCOMPLETE", redirect: "/onboarding" }, { status: 403 });
  }
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "ACCOUNT_SUSPENDED" }, { status: 403 });

  const date = todayKey();
  let usage = await prisma.dailyUsage.findUnique({ where: { userId_date: { userId, date } } });
  if (!usage) {
    usage = await prisma.dailyUsage.create({ data: { userId, date, profilesViewed: 0 } });
  }
  if (usage.profilesViewed >= DAILY_LIMIT) {
    return NextResponse.json({ error: "DAILY_LIMIT_REACHED", limit: DAILY_LIMIT, viewed: usage.profilesViewed }, { status: 429 });
  }

  const candidateIds = await recommendationEngine.getCandidates(userId);
  if (candidateIds.length === 0) {
    return NextResponse.json({ error: "NO_PROFILES", viewed: usage.profilesViewed, limit: DAILY_LIMIT }, { status: 200 });
  }
  const nextId = candidateIds[0];
  const candidate = await prisma.user.findUnique({
    where: { id: nextId },
    include: { profile: true, photos: { orderBy: { position: "asc" } }, preferences: true, promptAnswers: true },
  });
  if (!candidate || !candidate.profile) {
    return NextResponse.json({ error: "NO_PROFILES" }, { status: 200 });
  }

  await incrementView(userId);
  const updatedUsage = await prisma.dailyUsage.findUnique({ where: { userId_date: { userId, date } } });
  await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });

  // compatibility calc
  let compatibility: { score: number; shared: string[] } | null = null;
  try {
    const myInterests: string[] = user.profile.interests ? JSON.parse(user.profile.interests) : [];
    const theirInterests: string[] = candidate.profile.interests ? JSON.parse(candidate.profile.interests) : [];
    const shared = myInterests.filter((x) => theirInterests.includes(x));
    const score = Math.min(95, 42 + shared.length * 14 + (candidate.promptAnswers.length ? 10 : 0) + (candidate.profile.voiceUrl ? 8 : 0));
    if (shared.length > 0 || score > 50) compatibility = { score, shared: shared.slice(0, 3) };
  } catch {}

  const dailyQuestion = await getTodayQuestion();
  const dailyAnswer = await prisma.dailyAnswer.findUnique({ where: { userId_date: { userId: nextId, date } } });

  // real distance if both have lat/lng, otherwise fallback
  let distance: string;
  let distanceKm: number | null = null;
  if (user.profile.latitude != null && user.profile.longitude != null && candidate.profile.latitude != null && candidate.profile.longitude != null) {
    distanceKm = haversineKm(
      { lat: user.profile.latitude, lng: user.profile.longitude },
      { lat: candidate.profile.latitude, lng: candidate.profile.longitude }
    );
    distance = obscureDistance(distanceKm) + " • vị trí thật";
  } else if (candidate.profile.latitude != null) {
    distance = "Khoảng cách ẩn • chưa chia sẻ vị trí";
  } else {
    distance = "Khoảng cách ẩn";
  }

  const publicProfile = {
    id: candidate.id,
    name: candidate.profile.firstName,
    age: getAge(candidate.profile.dob),
    gender: candidate.profile.gender,
    bio: candidate.profile.bio,
    location: candidate.profile.location ? `${candidate.profile.location}` : "Nearby",
    distance,
    distanceKm,
    occupation: candidate.profile.occupation,
    education: candidate.profile.education,
    interests: candidate.profile.interests ? JSON.parse(candidate.profile.interests) : [],
    photos: candidate.photos.map((p) => ({ id: p.id, url: p.url, position: p.position })),
    prompts: candidate.promptAnswers.map((pa) => ({ id: pa.id, question: pa.question, answer: pa.answer })),
    voiceUrl: candidate.profile.voiceUrl,
    voiceDuration: candidate.profile.voiceDuration,
    intent: (candidate.preferences as any)?.intent ?? "UNSURE",
    compatibility,
    dailyAnswer: dailyAnswer ? { question: dailyQuestion, answer: dailyAnswer.answer } : null,
  };

  return NextResponse.json({
    profile: publicProfile,
    dailyQuestion,
    usage: { viewed: updatedUsage!.profilesViewed, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - updatedUsage!.profilesViewed },
  });
}
