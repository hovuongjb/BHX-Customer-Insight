# BHX Customer Insight

Ứng dụng web khảo sát khách hàng của Bách Hóa Xanh: khách quét QR của siêu thị (hoặc nhân viên khảo sát trực tiếp) trả lời bộ 4 câu hỏi về **Gạo – Mì ăn liền – Dầu ăn – Nước mắm**, chọn 1 quà cảm ơn; quản trị viên xem báo cáo và chỉnh nội dung câu hỏi/đáp án.

> Người tiếp quản dự án: đọc [HANDOVER.md](HANDOVER.md) → [PROGRESS.md](PROGRESS.md) → [CLAUDE.md](CLAUDE.md) trước. Tài liệu thiết kế chi tiết nằm ở [docs/](docs/).

## 1. Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | **≥ 22** (image Docker dùng 22; đã chạy thử trên 26) | kèm npm ≥ 10 |
| Docker + Docker Compose v2 | bất kỳ bản gần đây | chạy PostgreSQL (và toàn stack nếu muốn) |
| Git | ≥ 2.30 | |

Hệ điều hành: phát triển trên Windows 11 (Git Bash); Linux/macOS cũng chạy được, các lệnh dưới đây dùng cú pháp bash.

## 2. Cài đặt

```bash
git clone <repo-url> bhx-customer-insight && cd bhx-customer-insight

# 1) Cấu hình môi trường
cp .env.example .env
# Sửa .env: đổi POSTGRES_PASSWORD (và cùng mật khẩu trong DATABASE_URL), JWT_SECRET, PHONE_HASH_SECRET
# Sinh chuỗi ngẫu nhiên:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 2) Cơ sở dữ liệu (PostgreSQL 16, publish ra cổng máy 5434)
docker compose up -d db

# 3) API
cd apps/api
npm ci
set -a && source ../../.env && set +a        # Prisma CLI chỉ đọc .env cạnh nó → nạp biến tay
npx prisma generate                          # sinh Prisma Client (nếu postinstall chưa chạy)
npx prisma migrate deploy                    # tạo bảng
npm run seed                                  # 364 shop thật + 18 QLTP + dữ liệu demo (xem mục 6)
npm run dev                                   # http://localhost:4000

# 4) Web (terminal khác)
cd apps/web
npm ci
npm run dev                                   # http://localhost:5173
```

Mở http://localhost:5173 → trang **Lấy mã QR** (nhập mã ST, ví dụ `30051`). Đăng nhập quản trị tại `/login`.

### Biến môi trường (`.env`, mẫu ở `.env.example`)

| Biến | Ý nghĩa |
|---|---|
| `POSTGRES_USER/PASSWORD/DB` | Tài khoản DB do `docker compose` tạo |
| `DATABASE_URL` | Chuỗi kết nối khi API chạy **trên máy** (host `localhost`, cổng `5434`). Trong Docker Compose, service `api` tự ghi đè bằng host `db` |
| `API_PORT` | Cổng API (mặc định 4000) |
| `JWT_SECRET` | Ký JWT đăng nhập — chuỗi dài ngẫu nhiên |
| `PHONE_HASH_SECRET` | Khóa HMAC băm SĐT (chống trùng) **và** là gốc dẫn xuất khóa mã hóa SĐT đầy đủ — đặt một lần, sao lưu, **đừng đổi** (đổi ⇒ hash cũ không khớp và SĐT đã mã hóa không đọc lại được) |
| `WEB_ORIGIN` | Origin chính xác của web (CORS), ví dụ `http://localhost:5173` |
| `PUBLIC_SURVEY_BASE_URL` | Gốc URL nhúng vào mã QR (`<gốc>/s/<token>`) — khi thật phải là domain HTTPS mà điện thoại khách truy cập được |
| `VITE_API_BASE_URL` | URL API mà trình duyệt gọi (nhúng lúc build/khởi động Vite) |

## 3. Tài khoản demo (chỉ do `seed` tạo — **đổi/xoá trước khi lên môi trường thật**)

Mật khẩu chung `Password123!`:

| Email | Vai trò |
|---|---|
| `admin@bhx.local` | ADMIN (vào `/admin`: báo cáo, phản hồi, sửa câu hỏi) |
| `qltp.anhtuan@bhx.local` (và 17 QLTP khác `qltp.<tên>@bhx.local`) | REGION_MANAGER |
| `manager.30051@bhx.local`, `manager.30264`, `28260`, `30037`, `30053` | SHOP_MANAGER |
| `staff.30051@bhx.local` (… cùng 5 mã ST trên) | STAFF (khảo sát trực tiếp) |

## 4. Chạy kiểm thử

Chưa có Jest/Vitest. Hiện có 3 lớp kiểm tra, tất cả đã chạy xanh (kết quả ghi trong [HANDOVER.md](HANDOVER.md)):

```bash
cd apps/api && npx tsc -p tsconfig.json --noEmit                    # type-check API
cd apps/web && npx tsc -b                                           # type-check Web
cd apps/web && npx tsx src/components/survey/surveyEngine.selftest.ts   # state machine câu hỏi (23 kiểm tra)
node scripts/smoke-test.mjs [http://localhost:4000/api]             # 37 kiểm tra API end-to-end
```

`smoke-test.mjs` cần API đang chạy **và DB đã seed**; nó ghi thêm vài bản ghi test (2 người trả lời + 2 session). Nó kiểm tra: đăng nhập/RBAC/CSRF, tra QR công khai, toàn bộ luồng khách (SĐT sai, phân nhánh sai, hoàn tất thiếu quà, trùng SĐT), báo cáo, SĐT đầy đủ chỉ ADMIN xem được (danh sách/chi tiết/CSV), sửa câu hỏi.

## 5. Build & triển khai

### Build thủ công

```bash
cd apps/api && npm run build && npm start      # chạy dist/index.js (cần DATABASE_URL, JWT_SECRET, PHONE_HASH_SECRET trong môi trường)
cd apps/web && npm run build                    # ra apps/web/dist (file tĩnh)
```

### Docker Compose (toàn stack)

```bash
cp .env.example .env   # rồi sửa secret như mục 2
docker compose up -d --build
docker compose exec api npx tsx prisma/seed.ts   # tuỳ chọn: nạp dữ liệu (365 shop + demo). KHÔNG chạy seed trên DB thật có dữ liệu
```

- API container tự chạy `prisma migrate deploy` khi khởi động. Web serve file tĩnh bằng `serve` ở cổng 5173, API ở `API_PORT`.
- `VITE_API_BASE_URL` được nhúng **lúc build** web (build-arg trong compose): đổi thì phải `docker compose build web`.
- Đã kiểm chứng: stack Docker khởi động, migrate, seed và qua 37/37 smoke test (xem HANDOVER).

### Triển khai thật (CHƯA làm — việc Giai đoạn 4)

Hiện **chưa** có Nginx/HTTPS, backup tự động, giám sát. Trước khi dùng với khách thật cần tối thiểu:
1. Reverse proxy HTTPS (Nginx/Caddy/Cloudflare) cho **cùng một site** web + API (cookie đăng nhập là `SameSite=Strict` — web và API khác site sẽ không đăng nhập được); đặt `NODE_ENV=production` (bật cookie `secure`).
2. Secret mạnh mới, đổi/xoá toàn bộ tài khoản demo, **không** publish cổng DB (5434) ra ngoài, không chạy seed.
3. `PUBLIC_SURVEY_BASE_URL` = domain HTTPS thật, in lại toàn bộ QR.
4. Rate-limit đăng nhập, sao lưu `pg_dump`, rà soát pháp lý dữ liệu cá nhân — danh sách đầy đủ ở HANDOVER.md mục "Rủi ro".

Sao lưu/khôi phục DB (thủ công):
```bash
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backup.sql   # vào DB trống
```

## 6. Dữ liệu seed

`npm run seed` (trong `apps/api`) **tạo mới toàn bộ dữ liệu và giả định DB trống** (lần chạy thứ hai sẽ lỗi trùng khoá). Để làm lại từ đầu trên máy dev: `npx prisma migrate reset --force` (**xoá sạch DB**, rồi tự seed).

Gồm: 18 QLTP + 364 shop thật (`apps/api/prisma/data/shops.json`, nguồn `DS shop.xlsx`), QR cho mọi shop, 4 nhóm hàng + nhãn hiệu/quy cách/loại SP, 8 câu hỏi (phiên bản 1), 6 quà tặng, 1 chiến dịch, tài khoản demo, và 180 khảo sát giả lập (SĐT/tên ngẫu nhiên, không phải dữ liệu thật).

## 7. Cấu trúc thư mục

```
apps/api/   API Express + Prisma (src/, prisma/, Dockerfile)
apps/web/   React + Vite (src/, public/gifts/ ảnh quà, Dockerfile)
docs/       Tài liệu thiết kế (00 prompt gốc … 08 tiêu chí nghiệm thu)
scripts/    smoke-test.mjs
docker-compose.yml, .env.example
CLAUDE.md (quy tắc + kiến trúc)  HANDOVER.md  PROGRESS.md  README.md
```
