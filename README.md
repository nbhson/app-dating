# Lumen — Letters, not swipes

> **20 bưu thiếp mỗi ngày. Đọc chậm, trả lời bằng một dòng thật lòng.**

Dating tối giản, intentional, khác biệt hoàn toàn với Tinder/Bumble: không swipe, không thả tim trống. Mỗi profile là một **bưu thiếp giấy** — ảnh mờ phải mở, lời tự sự, voice 15s, và câu hỏi chung của ngày. Muốn “thích”, bạn phải viết 6–140 ký tự và chọn một chi tiết để làm chủ đề.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind 4 + Prisma (SQLite dev / Postgres prod) + Auth.js v5 (NextAuth) + Framer Motion

**Design:** `parchment #FFF7F5 / ink #2E1A22 / primary #FF4D6D` + `Fraunces` (display) + `Plus Jakarta Sans` + `JetBrains Mono` + mesh gradient + glass `backdrop-blur 20px` + popup `glass-strong rounded-[28px]`. Không dùng alert native.

---

## Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App Router (src/app)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Landing  │ │ Discover │ │ Matches  │ │ Profile  │  │
│  │    /     │ │/discover │ │/matches  │ │/profile  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │            │             │            │         │
│  ┌────▼────────────▼─────────────▼────────────▼────┐  │
│  │  Client Components (src/components)              │  │
│  │  DiscoverClient, ChatClient, MatchesClient,     │  │
│  │  OnboardingClient, ProfileClient, Nav, Landing  │  │
│  │  + ui/PopupProvider (toast/confirm/prompt)      │  │
│  └────┬────────────────────────────────────────────┘  │
│       │ API Routes (src/app/api)                      │
│  ┌────▼────────────────────────────────────────────┐  │
│  │ /api/discover/*  /api/matches/*  /api/profile/* │  │
│  │ /api/likes /favorites /notifications /verification│  │
│  │ /api/prompts  /api/daily-*  /api/admin/*        │  │
│  └────┬────────────────────────────────────────────┘  │
│       │ Lib layer (src/lib)                            │
│  ┌────▼────────────────────────────────────────────┐  │
│  │ prisma.ts  auth.ts  recommendation.ts           │  │
│  │ daily.ts  dailyQuestion.ts  utils.ts  i18n/*    │  │
│  └────┬────────────────────────────────────────────┘  │
│       │                                                │
│  ┌────▼────┐  ┌──────────┐  ┌──────────┐             │
│  │ Prisma  │  │ Auth.js  │  │ Storage  │             │
│  │ SQLite/ │  │ JWT +    │  │ public/  │             │
│  │ Postgres│  │ OAuth    │  │ uploads/ │             │
│  └─────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục chi tiết

```
src/
  app/
    layout.tsx              # Jakarta + Fraunces + Mono, metadata "Letters, not swipes"
    globals.css             # Design tokens --background --primary --paper --border + grain + .paper-card + mesh drift
    page.tsx                # Landing /
    discover/page.tsx       # Bảo vệ auth + redirect /onboarding
    matches/page.tsx        # Danh sách hòm thư (tabs All/New/Chatting/Liked/Favorites)
    matches/[matchId]/page.tsx # Thread thư (edit/delete/unmatch)
    profile/page.tsx        # Hồ sơ bưu thiếp (photos/voice/prompts + extended + verification + danger zone)
    onboarding/page.tsx     # 5 bước onboarding (include promptAnswers)
    admin/page.tsx          # Admin 10 tabs
    privacy/page.tsx        # h-[100dvh] overflow-y-auto, glass, 10 sections, vi/en
    terms/page.tsx          # 9 sections, vi/en
    community-guidelines/page.tsx # 5 rules, vi/en
    account-deletion/page.tsx # 3 bước xóa, vi/en
    api/
      discover/next/route.ts    # Bưu thiếp kế tiếp + increment + dailyQuestion + isFavorited/isVerified
      discover/like/route.ts    # Yêu cầu comment 6-140, tạo Like + Match + intro Message + stamps + notification
      discover/pass/route.ts
      discover/undo/route.ts    # Hoàn tác pass cuối trong 5 phút
      likes/route.ts            # GET sent/received (ai thích mình)
      favorites/route.ts        # GET/POST/DELETE favorite
      matches/route.ts          # List matches + intent + lastMessage + unread
      matches/[matchId]/messages/route.ts # GET (slow info + starter) + POST (slow-limit 5/ngày + notification)
      matches/[matchId]/messages/[messageId]/route.ts # PATCH (edit 15p) / DELETE (thu hồi)
      matches/[matchId]/unmatch/route.ts # POST unmatch
      notifications/route.ts    # GET (unread), POST broadcast, PATCH markAll
      verification/route.ts     # GET status + POST request (pending check)
      profile/me/route.ts       # GET/PATCH (kèm promptAnswers, intent, voiceUrl, isIncognito, height/languages/...) DELETE (block admin)
      profile/photos/route.ts   # Upload ảnh
      profile/photos/[id]/route.ts
      profile/voice/route.ts    # Upload/delete voice 15s (public/uploads/voices)
      prompts/route.ts          # CRUD PromptAnswer (tối đa 3)
      daily-question/route.ts   # GET câu hỏi hôm nay (deterministic theo date)
      daily-answer/route.ts     # GET/POST trả lời câu hỏi ngày
      usage/today/route.ts
      users/[id]/block|report
      admin/stats/route.ts
      admin/users/route.ts      # Search + pagination + filter verified
      admin/reports/route.ts    # PATCH resolve/dismiss + suspend
      admin/daily-questions/route.ts # CRUD daily Q
      admin/moderation/route.ts # photos/prompts/verification queue
      admin/verification/route.ts
      admin/analytics/route.ts  # totals + last7 + conversion
      admin/announcements/route.ts # broadcast → notifications
      admin/config/route.ts     # DAILY_LIMIT/SLOW_LIMIT/STAMPS_PER_WEEK
      admin/audit/route.ts      # AdminAction log
  components/
    DiscoverClient.tsx      # Editorial bưu thiếp: ảnh mờ reveal + prompts + composer + undo/favorite/priority stamp + popup
    ChatClient.tsx          # Thư chậm: starter block + slow counter 5/ngày + edit/delete/unmatch + popup
    MatchesClient.tsx       # Tabs Tất cả/Mới/Đang trò chuyện/Ai thích mình/Đã lưu + toast
    OnboardingClient.tsx    # 5 bước: Basic → Preferences(intent) → Prompts → Photos+Voice → Preview + toast
    ProfileClient.tsx       # Sửa ảnh/voice/prompts/dailyAnswer/intent + extended (height/languages/religion/wantKids/smoking/drinking) + incognito + stamps + verification + danger zone (admin disabled) + popup
    LandingClient.tsx       # Hero "Tình cảm viết chậm" + 3 bước
    Nav.tsx                 # Sidebar editorial (desktop) + pill đen (mobile) + admin distinct section (amber vs dark) + notifications popup + badges
    AdminClient.tsx         # 10 tabs: overview/users/reports/questions/moderation/verification/analytics/announcements/config/audit + i18n + popup
    ui/PopupProvider.tsx    # Toast (glass-strong, auto 3s) + Modal (confirm/prompt/alert) — thay toàn bộ native alert
    Providers.tsx           # SessionProvider → I18nProvider → PopupProvider
  lib/
    prisma.ts               # PrismaClient singleton
    auth.ts                 # NextAuth: Google/Apple/Credentials demo, JWT id, ADMIN_EMAIL=nbhson43@gmail.com
    recommendation.ts       # RecommendationEngine — lọc isIncognito/verifiedOnly/hasVoice/hasPhoto + score completeness/recency/interest/prompt/intent/verified/proximity + random
    daily.ts                # DAILY_LIMIT=20 + incrementView (sẵn sàng đọc SystemConfig)
    dailyQuestion.ts        # 10 câu hỏi luân phiên theo hash(date) + admin CRUD
    utils.ts                # cn, getAge, todayKey
    i18n/dictionaries.ts    # vi/en full: common/nav/notifications/discover/profile/matches/chat/onboarding/intent/admin/privacy/terms/guidelines
    i18n/context.tsx        # I18nProvider + useI18n + trans()

prisma/
  schema.prisma             # Xem Data Model bên dưới
  seed.ts                   # 35 users + photos + prompts + daily Q/A

public/
  uploads/voices/           # Voice files (MVP local, prod → R2/S3)
  uploads/                  # Ảnh + verification/
```

---

## Data Model (Prisma)

```prisma
User { id, email, name, avatarUrl, passwordHash, status(ACTIVE|SUSPENDED|DELETED), isAdmin, lastActiveAt,
       isVerified, verifiedAt, verificationStatus(NONE|PENDING|VERIFIED|REJECTED), isIncognito, premiumUntil, stamps, stampsResetAt,
       height, languages(JSON), religion, wantKids, smoking, drinking,
       profile, photos, preferences, likesSent/Received, passes, matches, blocks, reports, messages,
       dailyUsage, promptAnswers, dailyAnswers, favorites, notifications, verificationRequests, adminActions }

Profile { userId, firstName, dob, gender, location, latitude, longitude, bio, occupation, education, interests(JSON),
          voiceUrl, voiceDuration }

Preference { userId, interestedIn(MEN|WOMEN|EVERYONE), minAge, maxAge, maxDistance,
             intent(LONG_TERM|SHORT_TERM|FRIENDSHIP|EXPLORING|UNSURE),
             verifiedOnly, hasVoiceOnly, hasPhotoOnly, educationFilter }

ProfilePhoto { userId, url, position, status(PENDING|APPROVED|REJECTED), moderatedAt, moderatedBy }
PromptAnswer { userId, question, answer, status }
DailyQuestion { date(unique), question, createdBy, isActive }
DailyAnswer { userId, date, answer }

Like { fromUserId, toUserId, comment(6-140), promptId(anchor), isPriority }
Pass { fromUserId, toUserId }
Match { userAId, userBId, status(ACTIVE|UNMATCHED), messages }
Message { matchId, senderId, content, read, readAt, editedAt, deletedAt, isEdited }
Block / Report { reporterId, reportedId, reason, details, status(PENDING|RESOLVED|DISMISSED), reviewedAt, reviewedBy, actionTaken }
DailyUsage { userId, date, profilesViewed, likes, passes }

Favorite { userId, targetId }
Notification { userId, type(MATCH|MESSAGE|LIKE|SYSTEM|VERIFICATION), title, body, link, read }
AdminAction { adminId, targetId, action(SUSPEND|VERIFY_APPROVE|RESOLVE_REPORT...), reason, metadata }
SystemConfig { key, value } // DAILY_LIMIT, SLOW_LIMIT, STAMPS_PER_WEEK
Announcement { title, body, isActive }
VerificationRequest { userId, photoUrl, status(PENDING|APPROVED|REJECTED), note, reviewedBy }
```

**Indexes:** `User.status/lastActiveAt/isVerified/verificationStatus`, `Profile.gender/dob/lat_lng`, `Like/Pass/Match/Block/Report/Message/DailyUsage/PromptAnswer/DailyAnswer/Favorite/Notification/AdminAction/VerificationRequest`.

**Postgres prod:** đổi `provider = "postgresql"` trong `schema.prisma`, set `DATABASE_URL`, chạy `prisma db push`.

---

## Tính năng hiện tại

| Nhóm | Chi tiết |
|------|----------|
| **Auth** | Google / Apple OAuth (Auth.js) + Credentials demo — nhập bất kỳ email là tạo ngay (`demo@lumen.app`). Admin auto-promote `nbhson43@gmail.com`. |
| **Onboarding 5 bước** | 1) Basic (tên, dob, gender, bio) → 2) Preferences (quan tâm + **intent** + tuổi + khoảng cách) → 3) **Prompts** (1–3 câu) → 4) **Photos 1–6 + Voice 15s** → 5) Preview. Toast thay alert. |
| **Discovery editorial** | Không swipe. Ảnh blur 18px, bấm “Mở bưu thiếp” mới rõ. Hiển thị bio, occupation/education, **dailyAnswer**, **compatibility**, **verified ✓**, prompts, interests anchor. Nút `↩ Undo` (5 phút), `♡ Lưu` (favorite), `✦ Tem ưu tiên` (tốn 1 stamp). |
| **Like = bưu thiếp kèm lời** | `POST /api/discover/like` bắt buộc `comment 6–140` + `anchor` + `isPriority` (trừ stamps). Tạo `Like` + nếu mutual → `Match` + 2 intro `Message` + `Notification` cho cả hai. |
| **Daily limit** | 20/ngày, enforce server `DailyUsage.profilesViewed` trên `GET /api/discover/next`. Header `17/20`. Có `SystemConfig.DAILY_LIMIT` để admin đổi. |
| **Daily Question** | Mỗi ngày 1 câu chung. User trả lời ở Profile/Onboarding, hiện trong bưu thiếp người khác như block đen + banner. Admin CRUD tại `/admin` tab Câu hỏi ngày. |
| **Recommendation** | Lọc `gender/age/block/like/pass/report/isIncognito/verifiedOnly/hasVoice/hasPhoto` rồi score: completeness + recency + interest overlap + prompt overlap + intent match + verified boost + proximity + random. |
| **Matches / Hòm thư** | `GET /api/matches` trả intent + lastMessage. Tabs `Tất cả/Mới/Đang trò chuyện/Ai thích mình/Đã lưu`. Ai thích mình → `Đáp lại` tạo match ngay. |
| **Chat chậm (Slow chat)** | `GET/POST /api/matches/:id/messages` — match <48h giới hạn **5 tin / 24h / người**. Hiển thị `read`/`delivered`, `edited`/`deleted`. Edit trong 15 phút, thu hồi, `Hủy ghép` (unmatch), chặn/báo cáo. Poll 3s. |
| **Thông báo** | `Notification` cho like/match/message/verification/announcement. Bell ở Nav hiện `notifUnread`, bấm hiện popup glass (thay alert) + `markAll`. |
| **Safety** | Report 6 lý do + Block (xóa khỏi discovery, chặn chat, xóa match). Admin xử lý `PENDING → RESOLVED/DISMISSED` + auto suspend. |
| **Profile** | Sửa ảnh/voice/prompts/dailyAnswer/intent + **extended** (height/languages/religion/wantKids/smoking/drinking) + `isIncognito` + **stamps** + **verification** (gửi ảnh → tick xanh). `Advanced filters` (verifiedOnly/hasVoice/hasPhoto). **Admin không xóa được** — nút disabled + banner amber + API `403 ADMIN_CANNOT_DELETE`. |
| **Admin distinct menu** | `Nav.tsx` tách `adminItem` khỏi `items` user: desktop là section riêng `QUẢN TRỊ VIÊN · ADMIN` với divider, card `amber-50` (inactive) / `bg-[#1A1A1E]` (active) + badge `ADMIN`; mobile là pill nổi amber riêng trên pill chính. Không lẫn với Hòm thư/Hồ sơ. |
| **Admin 10 tabs** | `overview` stats + `users` search/pagination + `reports` workflow + `questions` CRUD + `moderation` (photos/prompts/verification) + `verification` + `analytics` (7 ngày + conversion) + `announcements` broadcast + `config` (DAILY_LIMIT/SLOW_LIMIT) + `audit` log. Full vi/en + popup confirm/prompt/toast. |
| **Popup thay alert** | `ui/PopupProvider.tsx` — `toast` (glass-strong, 3s) và `confirm`/`prompt`/`showAlert` (backdrop blur, card `rounded-[28px]`). Đã thay 27 chỗ `alert/confirm/prompt` native. |
| **Privacy/Terms/Guidelines/Account-deletion** | `h-[100dvh] overflow-y-auto overscroll-contain no-scrollbar` (fix không scroll do `body overflow-hidden`), `glass-strong rounded-[28px]`, 10 sections privacy + 9 terms + 5 guidelines + 3 bước xóa, full vi/en qua `dictionaries.ts`. |
| **i18n** | `dictionaries.ts` 700+ keys vi/en cho `common/nav/notifications/discover/profile/matches/chat/onboarding/intent/admin/privacy/terms/guidelines`. `I18nProvider` cookie `NEXT_LOCALE`. |
| **Privacy** | Chỉ hiện `~ km away` làm mờ Haversine, email không lộ, location `lat/lng` chỉ khi user cho phép. |

---

## API Reference

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/discover/next` | Bưu thiếp kế tiếp + `dailyQuestion` + `usage` + `isFavorited/isVerified`; 429 nếu `DAILY_LIMIT_REACHED`; 403 nếu `PROFILE_INCOMPLETE`; 200 `NO_PROFILES` nếu hết |
| `POST` | `/api/discover/like` | `{toUserId, comment(6-140), anchor, isPriority}` → `LIKE_CREATED` hoặc `MATCH_CREATED` + `matchId` + trừ stamps + notification |
| `POST` | `/api/discover/pass` | `{toUserId}` |
| `POST` | `/api/discover/undo` | Hoàn tác pass cuối trong 5 phút |
| `GET` | `/api/likes?type=received\|sent` | Ai thích mình / đã gửi |
| `GET/POST/DELETE` | `/api/favorites` | Lưu/bỏ lưu bưu thiếp |
| `GET` | `/api/matches` | List matches (intent, lastMessage, unread) |
| `GET` | `/api/matches/:id/messages` | `{messages, other, slow{remaining,limit}, starter}` |
| `POST` | `/api/matches/:id/messages` | `{content}` — check slow-limit, block, tạo notification |
| `PATCH/DELETE` | `/api/matches/:id/messages/:messageId` | Sửa (15p) / thu hồi |
| `POST` | `/api/matches/:id/unmatch` | Hủy ghép |
| `GET/PATCH` | `/api/notifications` | List + markAllRead; POST broadcast (admin) |
| `GET/PATCH/DELETE` | `/api/profile/me` | PATCH hỗ trợ `firstName/dob/.../interests, preferences{verifiedOnly,...}, isIncognito, height/languages/... , promptAnswers[], voiceUrl`; DELETE block admin |
| `POST` | `/api/profile/photos` | FormData `file` |
| `DELETE` | `/api/profile/photos/:id` |  |
| `POST/DELETE` | `/api/profile/voice` | FormData `file + duration` → `/uploads/voices/...` |
| `GET/POST/DELETE` | `/api/prompts` | `?id=` cho DELETE, body `{question, answer}` |
| `GET/POST` | `/api/verification` | Gửi yêu cầu xác minh |
| `GET` | `/api/daily-question` | `{question, date}` |
| `GET/POST` | `/api/daily-answer` | `{answer}` |
| `GET` | `/api/usage/today` | `{viewed, limit}` |
| `POST` | `/api/users/:id/block` `/report` |  |
| `GET` | `/api/admin/stats` | Tổng quan |
| `GET` | `/api/admin/users?q=&status=&page=` | Search + pagination |
| `GET/PATCH` | `/api/admin/reports` | Workflow |
| `GET/POST/DELETE` | `/api/admin/daily-questions` | CRUD |
| `GET/POST` | `/api/admin/moderation` | Duyệt ảnh/prompt/verification |
| `GET/POST` | `/api/admin/verification` | Duyệt tick xanh |
| `GET` | `/api/admin/analytics` | totals + last7 + conversion |
| `GET/POST/PATCH` | `/api/admin/announcements` | Broadcast |
| `GET/POST` | `/api/admin/config` | DAILY_LIMIT/SLOW_LIMIT |
| `GET` | `/api/admin/audit` | AdminAction log |

**Domain rules (server-enforced):** 20/ngày, chỉ match mới chat, block loại khỏi discovery & chat, no self-like, owner-only edit, match-participant-only chat, comment bắt buộc, slow-chat 5/ngày, edit 15p, admin không xóa.

---

## Luồng chính

**Onboarding:** `Landing demo login` → `auth.ts Credentials` tạo User → `OnboardingClient` 5 bước → `PATCH /api/profile/me` + `POST /api/profile/photos` + `POST /api/profile/voice` + `POST /api/prompts` + `POST /api/daily-answer`.

**Discover:** `GET /api/discover/next` → `recommendation.ts` → `incrementView` atomic → trả `profile{prompts, voice, intent, compatibility, dailyAnswer, isVerified/isFavorited}` + `dailyQuestion`. Chọn anchor → nhập comment → chọn `Tem ưu tiên` nếu có → `POST /like` → nếu mutual → `Match` + intro messages + `Notification` → modal “Đã kết nối” + `toast`.

**Chat:** `GET messages` → hiện starter intro + slow counter + read/edited → `POST message` check `count >=5` trong 24h nếu match mới → `PATCH` edit / `DELETE` thu hồi / `POST /unmatch`.

---

## Design System

* **Tokens** `globals.css:2`: `--background #FFF7F5`, `--primary #FF4D6D`, `--border #FCE8EC`, `--ink #2E1A22`. `.paper-card` + grain `body::before` + `dating-mesh-drift 25s`.
* **Glass** `glass`/`glass-strong` + `Popup` `rounded-[28px]` + `Toast` `rounded-[20px]` + `btn-primary` gradient.
* **Fonts** `layout.tsx:2`: `Fraunces` (display), `Plus Jakarta Sans` (sans), `JetBrains Mono` (mono).
* **Không dùng:** `alert` native — thay bằng `PopupProvider`.

---

## Quick Start

```bash
npm install
cp .env.example .env  # điền DATABASE_URL, AUTH_SECRET, GOOGLE_*, APPLE_*
npx prisma db push
npx tsx prisma/seed.ts
npm run dev  # http://localhost:3000
```

**Demo không OAuth:** Nhập bất kỳ email ở landing (vd `demo1@lumen.app` khi SEED_DEMO=1).

**Admin:** `nbhson43@gmail.com` / `Lumen123!`. Seed tự tạo/nâng quyền `nbhson43@gmail.com` làm admin và hạ quyền email cũ `admin@admin.admin`. Muốn đặt admin khác: `npx prisma studio` hoặc `UPDATE User SET isAdmin=1 WHERE email='you@...';`

### Env

```
DATABASE_URL="file:./dev.db" # hoặc postgresql://...
AUTH_SECRET="openssl rand -hex 32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""  GOOGLE_CLIENT_SECRET=""
APPLE_CLIENT_ID=""   APPLE_CLIENT_SECRET=""
```

Tạo Google OAuth: https://console.cloud.google.com/apis/credentials → Authorized redirect: `http://localhost:3000/api/auth/callback/google`

---

## Database & Storage

* **Indexes** xem `schema.prisma`.
* **Postgres prod:** đổi provider, set `DATABASE_URL` (Supabase/Neon/Railway), `prisma db push`.
* **Storage MVP:** `public/uploads` (ảnh + voices + verification). Prod thay bằng Supabase Storage / R2.
* **Realtime:** đang poll 3s; thay bằng Supabase Realtime subscribe `messages`.
* **Scroll fix:** `privacy/terms/guidelines/account-deletion` đã đổi `h-[100dvh] overflow-y-auto overscroll-contain no-scrollbar` để cuộn được dù `body overflow-hidden`.

## Scripts

* `npm run dev / build / start`
* `npx prisma db push` — sync schema
* `npx tsx prisma/seed.ts` — reseed 35 users + prompts + daily Q/A
* `npx tsx tests/run.mjs` — test daily limit, like→match, block, authz

## Deployment (Free-tier)

* **Frontend:** Vercel (import repo, set env, deploy)
* **DB:** Supabase Postgres free 500MB
* **Auth:** set `AUTH_SECRET` + `NEXTAUTH_URL=https://your.domain`

Tránh: K8s, server riêng, vector DB, AI trả phí — có thể thêm sau qua interface.

## Roadmap

* `RecommendationEngine` → embedding / ML (đã có interface)
* `ModerationEngine` (ảnh/voice auto-check), `NotificationEngine` (Web Push khi có thư), `SubscriptionEngine` (Boost/Super Like dạng “đóng tem ưu tiên” thay vì pay-to-win)
* Khám phá theo “bưu cục” địa lý, thư tay viết thật (canvas), vườn chung (cặp đôi trồng cây khi chat đều).

---
Legal: `/privacy` `/terms` `/community-guidelines` `/account-deletion` — full vi/en, glass, scrollable, lastUpdated 2026-09-20.
