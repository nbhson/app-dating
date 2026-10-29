# Migration SQLite → Postgres (app-dating)

> Chuẩn bị từ Round 3. Dev flow sqlite **không đổi**; tài liệu này dùng khi
> deploy production trên Postgres.

## Tóm tắt thay đổi đã chuẩn bị (Round 3)

| File | Vai trò |
|---|---|
| `prisma/schema.postgres.prisma` | Schema Postgres: `provider = "postgresql"` + **native enum** thay cho app-layer allowlist (`lib/domain.ts`) |
| `prisma/postgres/0001_check_constraints.sql` | CHECK constraint (range/self-relation/report-reason) — thứ Prisma DSL không diễn đạt được, áp bằng psql sau `db push` |
| `src/lib/ratelimit.ts` + model `RateLimitBucket` | Giữ nguyên 1:1 trên cả hai backend |

Tại sao không dùng enum cho `Report.reason`: Prisma 5 DSL không hỗ trợ enum
value chứa dấu cách (`"Fake profile"`) → allowlist 6 lý do report được enforce
bằng `CHECK "Report_reason_allowed_chk"` trong SQL thay vì enum.

## Các bước migration

1. **Provision Postgres** (14+). Set `DATABASE_URL` dạng `postgresql://…`.

2. **Đổi schema + generate client** (client generation gắn với provider —
   client sqlite hiện tại sẽ bị thay thế, đây là điều mong muốn trên deployment
   Postgres):
   ```bash
   DATABASE_URL="postgresql://…" npx prisma db push --schema prisma/schema.postgres.prisma
   npx prisma generate --schema prisma/schema.postgres.prisma
   ```
   Đã verify: `prisma validate` ✓, `db push` ✓, và **toàn bộ app type-check
   pass với client enum** (`tsc --noEmit` chạy với client sinh từ
   `schema.postgres.prisma` — 0 lỗi; app code truyền string literal nên
   tương thích cả hai).

3. **Áp CHECK constraints** (mirror của validate app-layer, xem header file):
   ```
   psql "$DATABASE_URL" -f prisma/postgres/0001_check_constraints.sql
   ```
   Đã test trên Postgres 16 thật: 19 constraint tạo OK; các vi phạm
   (lat 999, position 9, dob <18 tuổi, stamps âm, height 300, maxDistance
   9999, self-like/pass/favorite/match, reason không allowlist) đều bị chặn
   đúng tên constraint. Idempotent-friendly (mỗi constraint tên tường minh
   `*_chk` — chạy lại sẽ lỗi duplicate, muốn idempotent bọc DO block).

4. **Dọn data trước khi migrate** (đã xử lý trên dev.db Round 3):
   - `gender = 'NON_BINARY'` (3 row cũ từ seed) → remap MAN/WOMAN. Seed đã
     sửa để không sinh ra nữa; GENDERS allowlist chỉ MAN/WOMAN.
   - Kiểm tra không row nào vi phạm CHECK: chạy `0001_check_constraints.sql`
     với `ALTER TABLE ... NOT VALID` trước, `VALIDATE CONSTRAINT` sau nếu
     muốn migrate không khóa bảng lâu.

5. **Di chuyển data sqlite → Postgres**: script ETL nhỏ (tsx: đọc Prisma từ
   sqlite client, ghi vào PG client) hoặc `pgloader`. Round 3 chưa làm —
   SQLite chỉ có dev data.

## Lưu ý hoạt động

- **Rate limit**: bật backend dùng chung bằng `RATE_LIMIT_BACKEND=prisma`
  (mặc định `memory` — per-process). Trên Postgres, bảng `RateLimitBucket`
  hoạt động giống hệt sqlite (đã smoke test cả hai).
- **`@updatedAt`** do Prisma client set — raw SQL INSERT phải tự cung cấp
  (đã gặp khi test CHECK bằng psql tay).
- Khi thêm giá trị enum mới: sửa CẢ `src/lib/domain.ts` (sqlite dev) và
  `prisma/schema.postgres.prisma` (thêm enum value + migration `ALTER TYPE
  ... ADD VALUE`).
- Dev sqlite KHÔNG bị ảnh hưởng: `schema.prisma` + `npm run db:push` giữ
  nguyên flow; `prisma generate` mặc định đọc `schema.prisma` (sqlite).

## Đã verify (Round 3)

- `prisma validate --schema prisma/schema.postgres.prisma` ✓
- `prisma db push --schema prisma/schema.postgres.prisma` trên Postgres 16 thật ✓
- `0001_check_constraints.sql` áp sạch + 19 CHECK chặn đúng violation ✓
- Native enum chặn giá trị lạ (`smoking='SOMETIMES'` → rejected) ✓
- `tsc --noEmit` với client sinh từ PG schema ✓ (sau khi fix 4 điểm seed +
  admin/verification để tương thích cả hai client)
- Rate-limit Prisma backend smoke trên Postgres thật: allow→allow→deny,
  reset hoạt động ✓ (scripts/rl-smoke-pg.ts)
