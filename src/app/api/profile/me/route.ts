import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, photos: { orderBy: { position: "asc" } }, preferences: true, promptAnswers: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json();
  const { firstName, dob, gender, location, latitude, longitude, bio, occupation, education, interests, preferences, promptAnswers, voiceUrl, voiceDuration, isIncognito, height, languages, religion, wantKids, smoking, drinking } = body;

  if (interests && !Array.isArray(interests)) return NextResponse.json({ error: "INVALID_INTERESTS" }, { status: 400 });

  const updateData: any = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (dob !== undefined) updateData.dob = new Date(dob);
  if (gender !== undefined) updateData.gender = gender;
  if (location !== undefined) updateData.location = location;
  if (latitude !== undefined) updateData.latitude = latitude === null ? null : Number(latitude);
  if (longitude !== undefined) updateData.longitude = longitude === null ? null : Number(longitude);
  if (bio !== undefined) updateData.bio = bio;
  if (occupation !== undefined) updateData.occupation = occupation;
  if (education !== undefined) updateData.education = education;
  if (interests !== undefined) updateData.interests = JSON.stringify(interests);
  if (voiceUrl !== undefined) updateData.voiceUrl = voiceUrl;
  if (voiceDuration !== undefined) updateData.voiceDuration = voiceDuration;

  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (profile) {
    profile = await prisma.profile.update({ where: { userId }, data: updateData });
  } else if (Object.keys(updateData).length > 0) {
    if (!firstName || !dob || !gender) return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    profile = await prisma.profile.create({
      data: {
        userId,
        firstName,
        dob: new Date(dob),
        gender,
        location,
        latitude: latitude !== undefined ? Number(latitude) : null,
        longitude: longitude !== undefined ? Number(longitude) : null,
        bio,
        occupation,
        education,
        interests: interests ? JSON.stringify(interests) : null,
        voiceUrl: voiceUrl ?? null,
        voiceDuration: voiceDuration ?? null,
      },
    });
  }

  if (preferences) {
    const prefData: any = {};
    if (preferences.interestedIn) prefData.interestedIn = preferences.interestedIn;
    if (preferences.minAge !== undefined) prefData.minAge = preferences.minAge;
    if (preferences.maxAge !== undefined) prefData.maxAge = preferences.maxAge;
    if (preferences.maxDistance !== undefined) prefData.maxDistance = preferences.maxDistance;
    if (preferences.intent) prefData.intent = preferences.intent;
    if (preferences.verifiedOnly !== undefined) prefData.verifiedOnly = !!preferences.verifiedOnly;
    if (preferences.hasVoiceOnly !== undefined) prefData.hasVoiceOnly = !!preferences.hasVoiceOnly;
    if (preferences.hasPhotoOnly !== undefined) prefData.hasPhotoOnly = !!preferences.hasPhotoOnly;
    if (preferences.educationFilter !== undefined) prefData.educationFilter = preferences.educationFilter ? String(preferences.educationFilter) : null;
    const existingPref = await prisma.preference.findUnique({ where: { userId } });
    if (existingPref) {
      await prisma.preference.update({ where: { userId }, data: prefData });
    } else {
      await prisma.preference.create({ data: { userId, ...prefData } });
    }
  }

  if (isIncognito !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { isIncognito: !!isIncognito } });
  }
  // extended profile fields on User
  const userExtra: any = {};
  if (height !== undefined) userExtra.height = height ? Number(height) : null;
  if (languages !== undefined) userExtra.languages = languages ? JSON.stringify(languages) : null;
  if (religion !== undefined) userExtra.religion = religion || null;
  if (wantKids !== undefined) userExtra.wantKids = wantKids || null;
  if (smoking !== undefined) userExtra.smoking = smoking || null;
  if (drinking !== undefined) userExtra.drinking = drinking || null;
  if (Object.keys(userExtra).length) {
    await prisma.user.update({ where: { id: userId }, data: userExtra });
  }

  if (Array.isArray(promptAnswers)) {
    // replace up to 3
    const toKeep = promptAnswers.slice(0, 3);
    await prisma.promptAnswer.deleteMany({ where: { userId } });
    for (const pa of toKeep) {
      if (pa.question && pa.answer && pa.answer.trim().length >= 4) {
        await prisma.promptAnswer.create({ data: { userId, question: pa.question, answer: pa.answer.trim().slice(0, 300) } });
      }
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, photos: { orderBy: { position: "asc" } }, preferences: true, promptAnswers: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  await prisma.user.update({ where: { id: userId }, data: { status: "DELETED" } });
  return NextResponse.json({ status: "DELETED" });
}
