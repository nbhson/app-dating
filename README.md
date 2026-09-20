# Lumen — Letters, not swipes

> **20 bưu thiếp mỗi ngày. Đọc chậm, trả lời bằng một dòng thật lòng.**

Dating tối giản, intentional, khác biệt hoàn toàn với Tinder/Bumble: không swipe, không thả tim trống. Mỗi profile là một **bưu thiếp giấy** — ảnh mờ phải mở, lời tự sự, voice 15s, và câu hỏi chung của ngày. Muốn “thích”, bạn phải viết 6–140 ký tự và chọn một chi tiết để làm chủ đề.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind 4 + Prisma (SQLite dev / Postgres prod) + Auth.js v5 (NextAuth) + Framer Motion

**Design:** `parchment #FDF8F4 / ink #1A1A1E / terracotta #C96442 / sage #8A9A8E` + `Newsreader` (display serif) + `Inter` + `JetBrains Mono` + grain paper texture. Không còn gradient hồng.

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
│  └────┬────────────────────────────────────────────┘  │
│       │ API Routes (src/app/api)                      │
│  ┌────▼────────────────────────────────────────────┐  │
│  │ /api/discover/*  /api/matches/*  /api/profile/* │  │
│  │ /api/prompts  /api/daily-*  /api/admin/*        │  │
│  └────┬────────────────────────────────────────────┘  │
│       │ Lib layer (src/lib)                            │
│  ┌────▼────────────────────────────────────────────┐  │
│  │ prisma.ts  auth.ts  recommendation.ts           │  │
│  │ daily.ts  dailyQuestion.ts  utils.ts            │  │
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
    layout.tsx              # Newsreader + Inter + Mono, metadata "Letters, not swipes"
    globals.css             # Design tokens --background --primary --paper --border + grain + .paper-card
    page.tsx                # Landing /
    discover/page.tsx       # Bảo vệ auth + redirect /onboarding
    matches/page.tsx        # Danh sách hòm thư
    matches/[matchId]/page.tsx # Thread thư
    profile/page.tsx        # Hồ sơ bưu thiếp
    onboarding/page.tsx     # 5 bước onboarding (include promptAnswers)
    admin/page.tsx
    api/
      discover/next/route.ts    # Lấy bưu thiếp kế tiếp + increment + dailyQuestion
      discover/like/route.ts    # Yêu cầu comment 6-140, tạo Like + Match + intro Message
      discover/pass/route.ts
      matches/route.ts          # List matches + intent + lastMessage
      matches/[matchId]/messages/route.ts # GET (slow info + starter) + POST (slow-limit 5/ngày)
      profile/me/route.ts       # GET/PATCH (kèm promptAnswers, intent, voiceUrl)
      profile/photos/route.ts   # Upload ảnh
      profile/photos/[id]/route.ts
      profile/voice/route.ts    # Upload/delete voice 15s (public/uploads/voices)
      prompts/route.ts          # CRUD PromptAnswer (tối đa 3)
      daily-question/route.ts   # GET câu hỏi hôm nay (deterministic theo date)
      daily-answer/route.ts     # GET/POST trả lời câu hỏi ngày
      usage/today/route.ts
      users/[id]/block|report
      admin/stats/route.ts
  components/
    DiscoverClient.tsx      # Editorial bưu thiếp: ảnh mờ reveal + prompts + composer
    ChatClient.tsx          # Thư chậm: starter block + slow counter 5/ngày
    MatchesClient.tsx       # Tabs Tất cả/Mới/Đang trò chuyện
    OnboardingClient.tsx    # 5 bước: Basic → Preferences(intent) → Prompts → Photos+Voice → Preview
    ProfileClient.tsx       # Sửa ảnh/voice/prompts/dailyAnswer/intent
    LandingClient.tsx       # Hero "Tình cảm viết chậm" + 3 bước
    Nav.tsx                 # Sidebar editorial (desktop) + pill đen (mobile)
  lib/
    prisma.ts               # PrismaClient singleton
    auth.ts                 # NextAuth: Google/Apple/Credentials demo, JWT id
    recommendation.ts       # RecommendationEngine interface
    daily.ts                # DAILY_LIMIT=20 + incrementView
    dailyQuestion.ts        # 10 câu hỏi luân phiên theo hash(date)
    utils.ts                # cn, getAge, todayKey
  modules/                  # (dự phòng) domain modules tương lai

prisma/
  schema.prisma             # Xem Data Model bên dưới
  seed.ts                   # 35 users + photos + prompts + daily Q/A

public/
  uploads/voices/           # Voice files (MVP local, prod → R2/S3)
  uploads/                  # Ảnh
```

---

## Data Model (Prisma)

```prisma
User { id, email, name, avatarUrl, status(ACTIVE|SUSPENDED|DELETED), isAdmin, lastActiveAt,
       profile, photos, preferences, likesSent/Received, passes, matches, blocks, reports, messages,
       dailyUsage, promptAnswers, dailyAnswers }

Profile { userId, firstName, dob, gender, location, bio, occupation, education, interests(JSON),
          voiceUrl, voiceDuration }

Preference { userId, interestedIn(MEN|WOMEN|EVERYONE), minAge, maxAge, maxDistance,
             intent(LONG_TERM|SHORT_TERM|FRIENDSHIP|EXPLORING|UNSURE) }

ProfilePhoto { userId, url, position }
PromptAnswer { userId, question, answer }  // 1-3 / user, dùng làm anchor để like
DailyQuestion { date(unique), question }   // 1 / ngày, deterministic
DailyAnswer { userId, date, answer }       // trả lời câu hỏi ngày, hiện trong bưu thiếp

Like { fromUserId, toUserId, comment(6-140), promptId(anchor string) }
Pass { fromUserId, toUserId }
Match { userAId, userBId, messages }
Message { matchId, senderId, content, read, createdAt }
Block / Report / DailyUsage { userId, date, profilesViewed, likes, passes }
```

**Indexes:** `User.status/lastActiveAt`, `Profile.gender/dob`, `Like/Pass/Match/Block/Report/Message/DailyUsage` và `PromptAnswer.userId`, `DailyAnswer.date`.

**Postgres prod:** đổi `provider = "postgresql"` trong `schema.prisma`, set `DATABASE_URL`, chạy `prisma db push`.

---

## Tính năng hiện tại

| Nhóm | Chi tiết |
|------|----------|
| **Auth** | Google / Apple OAuth (Auth.js) + Credentials demo — nhập bất kỳ email là tạo ngay (`demo@lumen.app`) |
| **Onboarding 5 bước** | 1) Basic (tên, dob, gender, bio dạng bưu thiếp) → 2) Preferences (quan tâm + **intent** + tuổi) → 3) **Prompts** (1–3 câu, chọn từ 6 câu hỏi) → 4) **Photos 1–6 + Voice 15s** (MediaRecorder → `/api/profile/voice`) → 5) Preview bưu thiếp |
| **Discovery editorial** | Không swipe. Ảnh blur 18px, bấm “Mở bưu thiếp” mới rõ. Layout giấy `paper-card`, serif lớn. Hiển thị bio, occupation/education, **dailyAnswer**, **compatibility** (% + shared interests), prompts, interests như nút chọn anchor. |
| **Like = bưu thiếp kèm lời** | Không có like trống. `POST /api/discover/like` bắt buộc `comment 6–140` + `anchor`. Tạo `Like` + nếu mutual → `Match` + 2 intro `Message` dạng `“...” — bưu thiếp mở lời`. |
| **Daily limit** | 20 bưu thiếp/ngày, enforce server `DailyUsage.profilesViewed` trên `GET /api/discover/next`. Không bypass được bằng refresh/multi-tab. Header hiện `07/20`. |
| **Daily Question** | Mỗi ngày 1 câu chung (hash(date) % 10). User trả lời ở Profile/Onboarding, hiện trong bưu thiếp người khác như block đen + khi khám phá như banner đen đầu trang. |
| **Recommendation** | `SimpleRecommendationEngine` lọc `gender/age/block/like/pass/report` rồi score: completeness (bio+photos+interests+prompts+voice) + recency (<7d +0.2, <1d +0.15) + **interest overlap 0.12/shared** + **prompt overlap 0.08/shared** + **intent match 0.1** + random 0.35. |
| **Matches / Hòm thư** | `GET /api/matches` trả intent + lastMessage. Tabs Tất cả/Mới/Đang trò chuyện. |
| **Chat chậm (Slow chat)** | `GET/POST /api/matches/:id/messages` — với match <48h tuổi, giới hạn **5 tin / 24h / người**. Trả `slow.remaining`. Composer disable khi hết. Poll 3s (sẵn sàng thay bằng Supabase Realtime). |
| **Safety** | Report 6 lý do + Block (xóa khỏi discovery, chặn chat, xóa match). |
| **Profile** | Sửa ảnh/voice/prompts/dailyAnswer/intent, xóa tài khoản soft `DELETED`, logout. |
| **Admin** | `/admin` stats + suspend/activate, xem reports (cần `isAdmin=true`). |
| **Privacy** | Chỉ hiện `~ km away`, không lộ email/OAuth. |

---

## API Reference

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/discover/next` | Bưu thiếp kế tiếp + `dailyQuestion` + `usage`; 429 nếu `DAILY_LIMIT_REACHED`; 403 nếu `PROFILE_INCOMPLETE` |
| `POST` | `/api/discover/like` | `{toUserId, comment(6-140), anchor}` → `LIKE_CREATED` hoặc `MATCH_CREATED` + `matchId` |
| `POST` | `/api/discover/pass` | `{toUserId}` |
| `GET` | `/api/matches` | List matches (intent, lastMessage, unread) |
| `GET` | `/api/matches/:id/messages` | `{messages, other, slow{remaining,limit}, starter}` |
| `POST` | `/api/matches/:id/messages` | `{content}` — check slow-limit, block |
| `GET/PATCH/DELETE` | `/api/profile/me` | PATCH hỗ trợ `firstName/dob/.../interests, preferences{intent,...}, promptAnswers[], voiceUrl` |
| `POST` | `/api/profile/photos` | FormData `file` |
| `DELETE` | `/api/profile/photos/:id` |  |
| `POST/DELETE` | `/api/profile/voice` | FormData `file + duration` → `/uploads/voices/...` |
| `GET/POST/DELETE` | `/api/prompts` | `?id=` cho DELETE, body `{question, answer}` |
| `GET` | `/api/daily-question` | `{question, date}` |
| `GET/POST` | `/api/daily-answer` | `{answer}` |
| `GET` | `/api/usage/today` | `{viewed, limit}` |
| `POST` | `/api/users/:id/block` `/report` |  |
| `GET/POST` | `/api/admin/stats` |  |

**Domain rules (server-enforced):** 20/ngày, chỉ match mới chat, block loại khỏi discovery & chat, no self-like, owner-only edit, match-participant-only chat, comment bắt buộc, slow-chat 5/ngày.

---

## Luồng chính

**Onboarding:** `Landing demo login` → `auth.ts Credentials` tạo User → `OnboardingClient` 5 bước → `PATCH /api/profile/me` + `POST /api/profile/photos` + `POST /api/profile/voice` + `POST /api/prompts` + `POST /api/daily-answer`.

**Discover:** `GET /api/discover/next` → `recommendation.ts` → `incrementView` atomic → trả `profile{prompts, voice, intent, compatibility, dailyAnswer}` + `dailyQuestion`. User chọn anchor → nhập comment → `POST /like` → nếu mutual → `Match` + intro messages → modal “Đã kết nối”.

**Chat:** `GET messages` → hiện starter intro + slow counter → `POST message` check `count >=5` trong 24h nếu match mới.

---

## Design System

* **Tokens** `globals.css:2`: `--paper #FFFCF8`, `--background #FDF8F4`, `--primary #C96442`, `--border #E8DDD3`, `--ink #1A1A1E`. `.paper-card` + grain `body::before`.
* **Fonts** `layout.tsx:2`: `Newsreader` (display, italic), `Inter` (sans), `JetBrains Mono` (mono).
* **Không dùng:** gradient hồng, rounded-[28px] bóng lớn, icon ♡/✦ generic.

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

**Admin đêm:** `nbhson43@gmail.com` / `Lumen123!`. Seed tự tạo/nâng quyền `nbhson43@gmail.com` làm admin và hạ quyền email cũ `admin@admin.admin`. Muốn đặt admin khác: `npx prisma studio` hoặc `UPDATE User SET isAdmin=1 WHERE email='you@...';`

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
* **Storage MVP:** `public/uploads` (ảnh + voices). Prod thay bằng Supabase Storage / R2: thay `POST /api/profile/photos` và `/voice` bằng S3 upload.
* **Realtime:** đang poll 3s; thay bằng Supabase Realtime subscribe `messages`.

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
Legal placeholder: `/privacy` `/terms` `/community-guidelines` `/account-deletion`.
