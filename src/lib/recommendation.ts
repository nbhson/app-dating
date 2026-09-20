import { prisma } from "./prisma";
import { haversineKm } from "./geo";

export interface RecommendationEngine {
  getCandidates(userId: string): Promise<string[]>; // return ordered userIds
}

export class SimpleRecommendationEngine implements RecommendationEngine {
  async getCandidates(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true, profile: true, promptAnswers: true },
    });
    if (!user || !user.profile || !user.preferences) return [];

    const prefs = user.preferences as any;
    const blocked = await prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    const blockedIds = new Set(blocked.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)));

    const likes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const passes = await prisma.pass.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
    const excluded = new Set<string>([
      userId,
      ...blockedIds,
      ...likes.map((l) => l.toUserId),
      ...passes.map((p) => p.toUserId),
    ]);

    const reports = await prisma.report.findMany({ where: { reporterId: userId }, select: { reportedId: true } });
    reports.forEach((r) => excluded.add(r.reportedId));

    const allCandidates = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        id: { notIn: Array.from(excluded) },
        profile: { isNot: null },
      },
      include: { profile: true, photos: true, preferences: true, promptAnswers: true },
      take: 100,
    });

    const filtered = allCandidates.filter((c) => {
      if (!c.profile) return false;
      if (prefs.interestedIn !== "EVERYONE") {
        const wanted = prefs.interestedIn;
        if (wanted === "MEN" && c.profile.gender !== "MAN") return false;
        if (wanted === "WOMEN" && c.profile.gender !== "WOMAN") return false;
      }
      const age = getAge(c.profile.dob);
      if (age < prefs.minAge || age > prefs.maxAge) return false;
      // distance filter if both have coords and maxDistance set
      if (prefs.maxDistance && user.profile?.latitude != null && user.profile?.longitude != null && c.profile?.latitude != null && c.profile?.longitude != null) {
        const d = haversineKm(
          { lat: user.profile.latitude, lng: user.profile.longitude },
          { lat: c.profile.latitude, lng: c.profile.longitude }
        );
        if (d > prefs.maxDistance) return false;
      }
      return true;
    });

    const userInterests: string[] = user.profile.interests ? JSON.parse(user.profile.interests) : [];
    const userPrompts = user.promptAnswers.map((p) => p.question);

    const scored = filtered.map((c) => {
      let score = Math.random() * 0.35;
      const completeness = (c.profile?.bio ? 0.18 : 0) + (c.photos.length > 1 ? 0.18 : 0) + (c.profile?.interests ? 0.1 : 0) + (c.promptAnswers.length > 0 ? 0.15 : 0) + (c.profile?.voiceUrl ? 0.1 : 0);
      score += completeness;
      const daysAgo = (Date.now() - new Date(c.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo < 7) score += 0.2;
      if (daysAgo < 1) score += 0.15;

      if (c.profile?.interests && userInterests.length) {
        try {
          const their: string[] = JSON.parse(c.profile.interests);
          const shared = their.filter((x) => userInterests.includes(x));
          score += shared.length * 0.12;
        } catch {}
      }
      const sharedPrompts = c.promptAnswers.filter((p) => userPrompts.includes(p.question)).length;
      score += sharedPrompts * 0.08;

      if (prefs.intent && c.preferences && (c.preferences as any).intent === prefs.intent) score += 0.1;

      // proximity boost: nearer = higher score (only if both have coords)
      if (user.profile?.latitude != null && c.profile?.latitude != null) {
        const d = haversineKm(
          { lat: user.profile.latitude, lng: user.profile.longitude! },
          { lat: c.profile!.latitude!, lng: c.profile!.longitude! }
        );
        if (d < 5) score += 0.15;
        else if (d < 20) score += 0.08;
        else if (d < 50) score += 0.03;
      }

      return { id: c.id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.id);
  }
}

function getAge(dob: Date) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const recommendationEngine = new SimpleRecommendationEngine();
