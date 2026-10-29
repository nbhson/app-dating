import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api";
import { computeProfileCompleteness } from "@/lib/completeness";
import {
  GENDERS,
  INTERESTED_IN,
  INTENTS,
  HABIT_LEVELS,
  isAllowed,
  bounded,
  boundedNullable,
  finiteInRange,
  LATITUDE_MIN, LATITUDE_MAX, LONGITUDE_MIN, LONGITUDE_MAX, HEIGHT_MIN, HEIGHT_MAX,
} from "@/lib/domain";
import { getAge } from "@/lib/utils";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, photos: { orderBy: { position: "asc" } }, preferences: true, promptAnswers: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({
    user,
    completeness: computeProfileCompleteness({
      profile: user.profile,
      photos: user.photos,
      promptAnswers: user.promptAnswers,
      height: user.height,
      languages: user.languages ?? null,
      religion: user.religion ?? null,
    }),
  });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const { firstName, dob, gender, location, latitude, longitude, bio, occupation, education, interests, preferences, promptAnswers, voiceDuration, isIncognito, height, languages, religion, wantKids, smoking, drinking } = body;
  // voiceUrl đã bị loại khỏi PATCH: trước đây client tự truyền chuỗi bất kỳ →
  // lưu verbatim rồi render `<a href>` + `<audio src>` → `javascript:` URL
  // stored XSS. Giá trị này chỉ được đặt server-side qua /api/profile/voice.
  if (body.voiceUrl !== undefined) {
    return NextResponse.json({ error: "VOICE_URL_IMMUTABLE", message: "voiceUrl chỉ được đặt qua /api/profile/voice" }, { status: 400 });
  }

  if (interests && !Array.isArray(interests)) return NextResponse.json({ error: "INVALID_INTERESTS" }, { status: 400 });
  // Validate dạng + độ dài trước khi ghi DB (trước đây unbounded).
  const asBounded = (v: unknown, max: number): string | undefined => bounded(v, max);
  const boundedFirstName = firstName !== undefined ? asBounded(firstName, 30) : undefined;
  const boundedBio = bio !== undefined ? asBounded(bio, 500) : undefined;
  const boundedOccupation = occupation !== undefined ? asBounded(occupation, 100) : undefined;
  const boundedEducation = education !== undefined ? asBounded(education, 100) : undefined;
  const boundedLocation = location !== undefined ? asBounded(location, 200) : undefined;
  if (firstName !== undefined && !boundedFirstName) {
    return NextResponse.json({ error: "INVALID_FIRST_NAME" }, { status: 400 });
  }
  // Gender là enum domain — không nhận chuỗi tự chế (hỏng filter discovery).
  if (gender !== undefined && !isAllowed(gender, GENDERS)) {
    return NextResponse.json({ error: "INVALID_GENDER" }, { status: 400 });
  }
  // Tọa độ: phải là số trong range hợp lệ — trước đây chỉ Number(), NaN làm
  // Prisma 500, còn lat=999 được ghi vào DB làm hỏng khoảng cách.
  if (latitude !== undefined && latitude !== null) {
    if (finiteInRange(latitude, LATITUDE_MIN, LATITUDE_MAX) === null) {
      return NextResponse.json({ error: "INVALID_COORDINATES" }, { status: 400 });
    }
  }
  if (longitude !== undefined && longitude !== null) {
    if (finiteInRange(longitude, LONGITUDE_MIN, LONGITUDE_MAX) === null) {
      return NextResponse.json({ error: "INVALID_COORDINATES" }, { status: 400 });
    }
  }
  // Chiều cao (cm): 100–250 hoặc null.
  if (height !== undefined && height !== null && finiteInRange(height, HEIGHT_MIN, HEIGHT_MAX) === null) {
    return NextResponse.json({ error: "INVALID_HEIGHT" }, { status: 400 });
  }
  // Ngôn ngữ: mảng chuỗi ngắn, tối đa 10 mục (trước đây chuỗi bất kỳ).
  if (languages !== undefined) {
    if (languages === null) {
      // cho phép xoá
    } else if (!Array.isArray(languages) || languages.some((l: unknown) => typeof l !== "string") || languages.length > 10) {
      return NextResponse.json({ error: "INVALID_LANGUAGES" }, { status: 400 });
    }
  }
  // Thói quen: rỗng hoặc allowlist (trước đây chuỗi bất kỳ từ client select).
  if (smoking !== undefined && smoking !== null && smoking !== "" && !isAllowed(smoking, HABIT_LEVELS)) {
    return NextResponse.json({ error: "INVALID_SMOKING" }, { status: 400 });
  }
  if (drinking !== undefined && drinking !== null && drinking !== "" && !isAllowed(drinking, HABIT_LEVELS)) {
    return NextResponse.json({ error: "INVALID_DRINKING" }, { status: 400 });
  }
  // Dob: phải là date hợp lệ + đủ 18+ (dating app — age gate bắt buộc).
  if (dob !== undefined) {
    const d = new Date(dob);
    if (Number.isNaN(d.getTime()) || getAge(d) < 18) {
      return NextResponse.json({ error: "INVALID_DOB", message: "Bạn phải từ 18 tuổi trở lên" }, { status: 400 });
    }
  }
  // minAge/maxAge preference: chặn < 18 và min > max.
  if (preferences) {
    const minAge = preferences.minAge;
    const maxAge = preferences.maxAge;
    if (minAge !== undefined && (!Number.isInteger(minAge) || minAge < 18 || minAge > 99)) {
      return NextResponse.json({ error: "INVALID_AGE_RANGE" }, { status: 400 });
    }
    if (maxAge !== undefined && (!Number.isInteger(maxAge) || maxAge < 18 || maxAge > 99)) {
      return NextResponse.json({ error: "INVALID_AGE_RANGE" }, { status: 400 });
    }
    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      return NextResponse.json({ error: "INVALID_AGE_RANGE" }, { status: 400 });
    }
  }

  const updateData: any = {};
  if (boundedFirstName !== undefined) updateData.firstName = boundedFirstName;
  if (dob !== undefined) updateData.dob = new Date(dob);
  if (gender !== undefined) updateData.gender = gender;
  if (boundedLocation !== undefined) updateData.location = boundedLocation;
  if (latitude !== undefined) updateData.latitude = latitude === null ? null : Number(latitude);
  if (longitude !== undefined) updateData.longitude = longitude === null ? null : Number(longitude);
  if (boundedBio !== undefined) updateData.bio = boundedBio;
  if (boundedOccupation !== undefined) updateData.occupation = boundedOccupation;
  if (boundedEducation !== undefined) updateData.education = boundedEducation;
  if (interests !== undefined) updateData.interests = JSON.stringify(interests);
  if (voiceDuration !== undefined) {
    updateData.voiceDuration = Math.min(30, Math.max(3, Number(voiceDuration) || 15));
  }

  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (profile) {
    profile = await prisma.profile.update({ where: { userId }, data: updateData });
  } else if (Object.keys(updateData).length > 0) {
    if (!firstName || !dob || !gender) return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    profile = await prisma.profile.create({
      data: {
        userId,
        firstName: boundedFirstName!,
        dob: new Date(dob),
        gender,
        location: boundedLocation ?? null,
        latitude: latitude !== undefined ? Number(latitude) : null,
        longitude: longitude !== undefined ? Number(longitude) : null,
        bio: boundedBio ?? null,
        occupation: boundedOccupation ?? null,
        education: boundedEducation ?? null,
        interests: interests ? JSON.stringify(interests) : null,
        voiceUrl: null,
        voiceDuration: voiceDuration ?? null,
      },
    });
  }

  if (preferences) {
    // Allowlist + range cho preference — trước đây interestedIn/intent nhận
    // chuỗi bất kỳ làm hỏng filter, maxDistance nhận float/giá trị âm.
    if (preferences.interestedIn !== undefined && !isAllowed(preferences.interestedIn, INTERESTED_IN)) {
      return NextResponse.json({ error: "INVALID_PREFERENCE" }, { status: 400 });
    }
    if (preferences.intent !== undefined && !isAllowed(preferences.intent, INTENTS)) {
      return NextResponse.json({ error: "INVALID_INTENT" }, { status: 400 });
    }
    if (preferences.maxDistance !== undefined && preferences.maxDistance !== null) {
      if (!Number.isInteger(Number(preferences.maxDistance)) || Number(preferences.maxDistance) < 1 || Number(preferences.maxDistance) > 500) {
        return NextResponse.json({ error: "INVALID_MAX_DISTANCE" }, { status: 400 });
      }
    }
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
  // extended profile fields on User — dùng giá trị đã validate ở trên
  const userExtra: any = {};
  if (height !== undefined) userExtra.height = height === null ? null : Number(height);
  if (languages !== undefined) userExtra.languages = languages === null ? null : JSON.stringify(languages.map((l: string) => l.trim().slice(0, 30)));
  if (religion !== undefined) userExtra.religion = boundedNullable(religion, 60);
  if (wantKids !== undefined) userExtra.wantKids = boundedNullable(wantKids, 60);
  if (smoking !== undefined) userExtra.smoking = smoking === "" ? null : smoking ?? null;
  if (drinking !== undefined) userExtra.drinking = drinking === "" ? null : drinking ?? null;
  if (Object.keys(userExtra).length) {
    await prisma.user.update({ where: { id: userId }, data: userExtra });
  }

  if (Array.isArray(promptAnswers)) {
    // replace up to 3 — trong MỘT transaction: trước đây deleteMany rồi create
    // từng dòng; lỗi giữa chừng/race là mất sạch answers cũ.
    const toKeep = promptAnswers.slice(0, 3);
    const valid = toKeep
      .filter((pa: any) => pa.question && pa.answer && pa.answer.trim().length >= 4)
      .map((pa: any) => ({ userId, question: String(pa.question).slice(0, 200), answer: pa.answer.trim().slice(0, 300) }));
    await prisma.$transaction([
      prisma.promptAnswer.deleteMany({ where: { userId } }),
      prisma.promptAnswer.createMany({ data: valid }),
    ]);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, photos: { orderBy: { position: "asc" } }, preferences: true, promptAnswers: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (me?.isAdmin) return NextResponse.json({ error: "ADMIN_CANNOT_DELETE", message: "Admin không thể xóa tài khoản" }, { status: 403 });
  await prisma.user.update({ where: { id: userId }, data: { status: "DELETED" } });
  return NextResponse.json({ status: "DELETED" });
}
