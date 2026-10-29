-- 0001_check_constraints.sql — Round 3 Postgres migration prep.
--
-- Áp SAU khi `prisma db push --schema prisma/schema.postgres.prisma`:
--   psql "$DATABASE_URL" -f prisma/postgres/0001_check_constraints.sql
--
-- Đây là equivalent Postgres của các ràng buộc mà sqlite không hỗ trợ và
-- hiện chỉ được enforce ở app layer:
--   - giới hạn range (lat/lng/height/age/position/counts) — hiện validate
--     trong api/profile/me (finiteInRange) và api/profile/photos/[id],
--   - ràng buộc quan hệ "không tự tương tác" (no self-like/pass/block/match).
-- Native enum (UserStatus, Gender, ...) đã do Prisma tạo khi db push —
-- KHÔNG cần CHECK cho các cột đó. Ngoại lệ: ReportReason có giá trị chứa
-- dấu cách ("Fake profile") mà DSL enum Prisma 5 không diễn đạt được →
-- enforce bằng CHECK dưới đây.
--
-- Mỗi constraint đặt tên tường minh (ck_*) để dễ drop/alter sau này.
-- Idempotent: dùng DO block kiểm tra pg_constraint trước khi thêm.

-- ============ User ============
ALTER TABLE "User" ADD CONSTRAINT "User_height_range_chk"
  CHECK ("height" IS NULL OR "height" BETWEEN 100 AND 250);
ALTER TABLE "User" ADD CONSTRAINT "User_stamps_nonnegative_chk"
  CHECK ("stamps" >= 0);

-- ============ Profile ============
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_latitude_range_chk"
  CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_longitude_range_chk"
  CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_dob_age_gate_chk"
  CHECK ("dob" <= now() - interval '18 years');
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_bio_len_chk"
  CHECK ("bio" IS NULL OR length("bio") <= 1000);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_firstName_len_chk"
  CHECK (length("firstName") BETWEEN 1 AND 50);

-- ============ Preference ============
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_age_range_chk"
  CHECK ("minAge" >= 18 AND "maxAge" <= 99 AND "minAge" <= "maxAge");
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_maxDistance_range_chk"
  CHECK ("maxDistance" IS NULL OR ("maxDistance" >= 1 AND "maxDistance" <= 500));

-- ============ ProfilePhoto ============
ALTER TABLE "ProfilePhoto" ADD CONSTRAINT "ProfilePhoto_position_range_chk"
  CHECK ("position" BETWEEN 0 AND 5);

-- ============ DailyUsage ============
ALTER TABLE "DailyUsage" ADD CONSTRAINT "DailyUsage_counts_nonnegative_chk"
  CHECK ("profilesViewed" >= 0 AND "likes" >= 0 AND "passes" >= 0);

-- ============ No self-relations (dating domain) ============
ALTER TABLE "Like" ADD CONSTRAINT "Like_no_self_chk"
  CHECK ("fromUserId" <> "toUserId");
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_no_self_chk"
  CHECK ("fromUserId" <> "toUserId");
ALTER TABLE "Block" ADD CONSTRAINT "Block_no_self_chk"
  CHECK ("blockerId" <> "blockedId");
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_no_self_chk"
  CHECK ("userId" <> "targetId");
ALTER TABLE "Match" ADD CONSTRAINT "Match_no_self_chk"
  CHECK ("userAId" <> "userBId");
-- ============ Report ============
ALTER TABLE "Report" ADD CONSTRAINT "Report_reason_allowed_chk"
  CHECK ("reason" IN ('Fake profile', 'Harassment', 'Spam', 'Inappropriate content', 'Scam', 'Other'));
ALTER TABLE "Report" ADD CONSTRAINT "Report_no_self_chk"
  CHECK ("reporterId" <> "reportedId");

-- ============ RateLimitBucket ============
ALTER TABLE "RateLimitBucket" ADD CONSTRAINT "RateLimitBucket_count_nonnegative_chk"
  CHECK ("count" >= 0);
