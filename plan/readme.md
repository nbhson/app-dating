# Plan — app-dating

> Next.js (App Router) + Prisma + NextAuth dating app. Auth qua OAuth (Google/Apple)
> + Credentials, uploads ghi vào `public/uploads/`.

## Kết quả Review (audit đợt 1)

| # | Severity | Vị trí | Vấn đề | Fix |
|---|----------|--------|--------|-----|
| 1 | CRITICAL | lib/auth.ts:111-116 | Đăng nhập credentials vào account OAuth-only (`passwordHash` null) → **hash và set password bất kỳ rồi login luôn** = account takeover toàn bộ user Google/Apple | Từ chối login khi `!user.passwordHash` (đặt password qua flow reset đã verify email) |
| 2 | CRITICAL | api/profile/photos/route.ts:26 | Extension lấy từ `file.name` (client kiểm soát) + chỉ check MIME khai báo → upload `x.svg` (MIME khai báo png) vào `public/uploads` serve same-origin = stored XSS | Ext suy từ MIME allowlist map + chặn magic bytes SVG/XML |
| 3 | MAJOR | api/profile/me/route.ts:37 | Client PATCH được `voiceUrl` chuỗi bất kỳ → render `<a href>` + `<audio src>` = `javascript:` XSS | Loại `voiceUrl` khỏi PATCH (400 nếu gửi), chỉ set qua `/api/profile/voice`; client Onboarding ngừng gửi |
| 4 | MAJOR | api/admin/stats/route.ts:62-64 | SUSPEND/ACTIVATE/DELETE không validate target, admin khóa được admin khác/chính mình, không có audit entry | Whitelist action, chặn target admin/self, ghi `AdminAction` |
| 5 | MAJOR | api/verification/route.ts:24-37 | Selfie không validate size/type + client tự cung cấp `photoUrl` bất kỳ vào DB | Cap 5MB, MIME→ext map, chỉ nhận URL `/uploads/verification/` |
| 6 | MAJOR | api/discover/like/route.ts | Target không validate (id rác → FK 500); `dailyUsage.likes` increment nhưng không bao giờ check → spam like vô hạn | Validate target ACTIVE, cap 50 like/ngày |
| 7 | MAJOR | api/profile/me/route.ts | Unbounded bio/firstName..., `dob` không validate (không có age gate 18+), minAge < 18 qua được | Bound strings, dob 18+, minAge/maxAge 18-99 + min≤max |
| 8 | MAJOR | api/discover/next/route.ts:89 | `distanceKm` raw float trả về API dù UI chỉ hiển thị chuỗi obscure → leak vị trí chính xác | Bỏ khỏi response |
| 9 | MAJOR | prisma/seed.ts:57 | Hardcode password `Lumen123!` cho admin + demo users trong repo | `SEED_DEMO_PASSWORD` env, ≥12 ký tự, thiếu → abort |
| 10 | MAJOR | api/profile/voice/route.ts:23-27 | Upsert tạo profile giả ("You", dob 1998, WOMAN) hiện trong discovery | Chỉ update, 400 nếu chưa có profile |
| 11 | MAJOR | api/verification/route.ts | File không validate size/type; client photoUrl verbatim vào DB | Validate 5MB + MIME; URL chỉ server-sinh |
| 12 | MINOR | api/profile/photos/[id]:24 | PATCH position nhận JSON type bất kỳ → Prisma 500 | Validate integer 0-5 |
| 13 | MINOR | api/profile/me:101 | promptAnswers delete+create không transaction → mất data khi lỗi | `$transaction` |
| 14 | MINOR | OnboardingClient.tsx:109 | Client gửi voiceUrl qua PATCH (mâu thuẫn với fix #7) | Bỏ khỏi payload |

## Không sửa (đã cân nhắc, ghi nhận)

- **Rate limit in-memory** (auth.ts:81): đúng là per-instance + mất khi restart, nhưng app single-instance + cần Redis/Upstash ngoài scope; email+IP shared store là việc cần infra riêng — ghi lại làm follow-up.
- **Auto-registration chưa verify email** (auth.ts:88): cần flow gửi mail (provider config), không thể fix thuần code trong đợt này — follow-up.
- **`user.status` check thiếu ở nhiều route** (suspended vẫn like/message): cần middleware dùng chung — thay đổi lớn, đánh dấu follow-up; auth.ts đã chặn login của suspended.

## Trạng thái

- [x] Plan
- [x] Fix #1–#13
- [x] `tsc --noEmit` pass (sau khi `pnpm install` — repo không có node_modules + không có lockfile)
- [x] Commit + self-review

## Review Log

### Vòng 1
- Self-review: `tsc --noEmit` sạch. Lỗi tự phát hiện trong bản fix: (1) edit đầu tiên dùng nhầm `asBoundedString` chưa định nghĩa + gọi `boundedLocation()` như hàm + làm mất dòng latitude/longitude/interests — viết lại toàn block; (2) lần đầu ghi `AdminAction` sai field name so với schema (dùng `targetUserId`/`details` thay `targetId`/`reason`) — đã đối chiếu `prisma/schema.prisma:335` và sửa. Kiểm tra `ProfileClient`/`OnboardingClient` không còn gửi `voiceUrl` vào PATCH.
- `distanceKm` xác nhận không client nào dùng trước khi bỏ.
