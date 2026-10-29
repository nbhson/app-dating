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

## Round 2 (2026-10-29) — enterprise upgrade

Objective: nâng thêm một tầm chất lượng nữa — xử lý follow-up Prisma từ đợt 1, vá các lỗ hổng còn sót, chuẩn hoá validation về một nơi duy nhất, thêm feature đúng domain dating, và siết a11y/UI.

### Kết quả deep-review (đợt 2)

| # | Severity | Vị trí | Vấn đề | Fix |
|---|----------|--------|--------|-----|
| R2-1 | CRITICAL (bug) | ProfileClient.tsx:260 | Gửi xác minh từ trang Profile gửi `photoUrl: URL.createObjectURL(file)` qua JSON → API yêu cầu `/uploads/verification/` → **luôn 400 MISSING_PHOTO. Flow self-verification hỏng hoàn toàn từ UI** | Gửi multipart FormData (API đã hỗ trợ sẵn đường multipart) |
| R2-2 | MAJOR | api/discover/pass, api/favorites POST, api/users/[id]/block, api/users/[id]/report | Target id không được validate → id rác đi thẳng xuống Prisma → FK violation 500 (cùng lớp bug Round-1 #6, chỉ fix trong like) | Validate target tồn tại + ACTIVE ở cả 4 route |
| R2-3 | MAJOR | api/profile/me PATCH | `latitude/longitude/height` chỉ `Number()` — NaN/range tùy ý vào DB; `gender/interestedIn/intent/smoking/drinking` là chuỗi bất kỳ (db bị nhồi giá trị lạ làm hỏng filter) | Validate range (lat ±90, lng ±180, height 100–250) + enum allowlist |
| R2-4 | MAJOR | 3 nơi | `REPORT_REASONS` copy-paste ở api/report, DiscoverClient, ChatClient → lệch nhau là bypass validate | Gom vào `lib/domain.ts` (single source) |
| R2-4b | MAJOR | api/discover/like | dailyUsage increment + like.create + stamps decrement chạy riêng lẻ → concurrent requests vượt like-cap, trừ stamps lệch | `$transaction` interactive |
| R2-5 | MINOR | api/matches | N+1: `message.count` trong vòng lặp cho từng match | `message.groupBy` 1 query |
| R2-6 | MINOR | api/discover/undo | decrement `passes` không floor → số âm nếu bấm undo nhiều lần | `updateMany` với `passes > 0` |
| R2-7 | MINOR | api/profile/voice | `file.type.includes("webm"/"mp4")` → nhận cả `video/mp4`, MIME lạ | Allowlist audio MIME map → ext |
| R2-8 | MINOR | Nav.tsx:155 | Thanh tiến trình ngày hiển thị dữ liệu cứng `13/20` (fake) | Lấy thật từ `/api/usage/today` |
| R2-6 | MINOR | ProfileClient.save() | Luôn toast "Đã lưu" kể cả khi API trả 400 | Surface lỗi thật từ response |
| R2-7 | MINOR | a11y | Nút icon-only không có accessible name (photo arrows, favorite heart, xóa ảnh) | `aria-label` |
| R2-8 | INFO | prisma/prisma/dev.db | DB artifact lồng 2 cấp (do chạy CLI với cwd sai) + `prisma/dev.db` thật bị thiếu → app tạo DB rỗng mới | Move db về `prisma/dev.db`, xoá dir lồng, gitignore chặn |

### Follow-up đợt 1: VerificationToken @id + enum/CHECK — KẾT QUẢ DEEP VERIFY

- **@id**: schema cũ (chỉ `@@unique([identifier, token])`) đúng theo docs của `@auth/prisma-adapter` và `prisma validate` pass — audit đánh CRITICAL là quá mức. Tuy nhiên đã **fix chủ động** sang `@@id([identifier, token])`: primary key tường minh, vẫn giữ compound key `identifier_token` mà adapter dùng. Đã chứng minh: `prisma validate` ✓, `prisma db push` sync OK trên db có data (36 users, không mất gì), `prisma generate` OK.
- **Enum/CHECK native: KHÔNG THÊM ĐƯỢC trên sqlite** — Prisma trả `P1012: You defined the enum ... But the current connector does not support enums` (đã test riêng). CHECK constraint cũng không có cú pháp trong Prisma DSL 5.x. → Chọn giải pháp **app-layer enum**: `src/lib/domain.ts` định nghĩa các enum hợp lệ (gender, intent, interestedIn, smoking/drinking, report reasons, statuses…) và mọi API route validate qua đó. Migration sang Postgres (nơi có enum + CHECK thật) ghi là follow-up hạ tầng.

### Features mới (Round 2)

1. **Profile completeness** — `lib/completeness.ts` tính % hoàn thiện hồ sơ + danh sách mục còn thiếu; trả về trong `GET /api/profile/me`; UI: thanh completeness ở Profile page + chip gợi ý nhảy tới đúng section.
2. **Discover quick filters** — filter sheet ngay trên Discover (verified-only / has-voice / has-photo / maxDistance), persist qua `PATCH /api/profile/me` (dùng lại field `Preference` có sẵn), áp dụng ngay cho profile tiếp theo.
3. **Stamps balance trong composer** — `/api/usage/today` trả thêm `stamps`; DiscoverClient hiện chip số tem còn lại, khoá checkbox ưu tiên khi hết (trước đây gửi mới biết `NO_STAMPS`).

### Không làm (ghi nhận)

- **Dark mode**: design system hiện là warm-light "paper" với hàng trăm hex hardcode trong component; override token-level chỉ phủ ~1/3 surface → dark mode nửa vời tệ hơn không có. Follow-up: chuyển toàn bộ hex sang CSS var trước.
- **Rate limit shared store / email verification** — giữ nguyên như Round 1 (cần infra).

### Trạng thái Round 2

- [x] Deep review (src, prisma, tests)
- [x] Plan + findings table (mục trên)
- [x] Prisma follow-up: VerificationToken `@@id` + app-layer enum (`lib/domain.ts`)
- [x] Fix R2-1…R2-8
- [x] Features: completeness / quick filters / stamps
- [x] `tsc --noEmit` sạch · `npm run build` ✓ · `npm test` 17/17 ✓ · `prisma validate` + `db push` ✓ · smoke test dev server (200/401/redirect đúng)
- [x] Commit nhỏ theo conventional commits + self-review diff (1 commit fix theo self-review)

## Trạng thái Round 1

- [x] Plan
- [x] Fix #1–#13
- [x] `tsc --noEmit` pass (sau khi `pnpm install` — repo không có node_modules + không có lockfile)
- [x] Commit + self-review

## Review Log

### Round 2
- Self-review diff sau commit: phát hiện (1) `computeProfileCompleteness(user as never)` cast lười → thay bằng object tường minh; (2) trạng thái "hoàn thiện" ở Profile tái dùng nhầm nhãn "Đã xác minh" → thêm key `completenessDone`; (3) nút reset filter dùng nhầm label "+20 km bán kính" (gây hiểu lầm) → bỏ; (4) edit đầu tiên làm rơi phần cuối của useEffect trong DiscoverClient + tạo `}` thừa trong profile/me — phát hiện nhờ `tsc` và sửa ngay. Sau self-review: tsc/build/test lại sạch, 1 commit `refactor:` bổ sung (aa55064).
- Smoke test runtime: `GET /` 200, `GET /discover` 307 (redirect về / khi chưa login — behavior có sẵn), `GET /api/usage/today` + `POST /api/users/:id/report` không session → 401 đúng.

### Vòng 1
- Self-review: `tsc --noEmit` sạch. Lỗi tự phát hiện trong bản fix: (1) edit đầu tiên dùng nhầm `asBoundedString` chưa định nghĩa + gọi `boundedLocation()` như hàm + làm mất dòng latitude/longitude/interests — viết lại toàn block; (2) lần đầu ghi `AdminAction` sai field name so với schema (dùng `targetUserId`/`details` thay `targetId`/`reason`) — đã đối chiếu `prisma/schema.prisma:335` và sửa. Kiểm tra `ProfileClient`/`OnboardingClient` không còn gửi `voiceUrl` vào PATCH.
- `distanceKm` xác nhận không client nào dùng trước khi bỏ.
