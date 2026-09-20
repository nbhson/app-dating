import { prisma } from "./prisma";
import { todayKey } from "./utils";

export const DAILY_LIMIT = 20;

export async function getTodayUsage(userId: string) {
  const date = todayKey();
  let usage = await prisma.dailyUsage.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (!usage) {
    usage = await prisma.dailyUsage.create({
      data: { userId, date, profilesViewed: 0, likes: 0, passes: 0 },
    });
  }
  return usage;
}

export async function canViewProfile(userId: string) {
  const usage = await getTodayUsage(userId);
  return usage.profilesViewed < DAILY_LIMIT;
}

export async function incrementView(userId: string) {
  const date = todayKey();
  // atomic increment via upsert + increment
  const usage = await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { profilesViewed: { increment: 1 } },
    create: { userId, date, profilesViewed: 1 },
  });
  return usage;
}
