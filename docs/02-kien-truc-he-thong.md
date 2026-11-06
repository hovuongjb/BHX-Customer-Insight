# 02. Kiến trúc hệ thống — BHX Customer Insight

## 1. Nguyên tắc kiến trúc

- Monolith có cấu trúc rõ (modular monolith), không microservices, không Kubernetes.
- Một lệnh `docker compose up` khởi động toàn bộ hệ thống (db + api + web + reverse proxy).
- Tách rõ 3 phân hệ (Khảo sát / Dashboard / Quản trị) theo module ở cả API và frontend, dùng chung data layer.
- Mọi quyết định "shop nào nhận kết quả" và "ai được xem gì" nằm ở backend, không tin dữ liệu client.

## 2. Thành phần hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                        Reverse Proxy (Nginx)              │
│                    HTTPS termination, routing             │
└───────────────┬─────────────────────────────┬─────────────┘
                │                             │
        ┌───────▼────────┐           ┌────────▼────────┐
        │   Web (React)   │           │  API (Node.js)   │
        │  Vite build,    │  REST/    │  Express/Fastify  │
        │  static serve   │  JSON     │  + Prisma ORM     │
        └─────────────────┘           └────────┬──────────┘
                                                │
                                       ┌────────▼──────────┐
                                       │   PostgreSQL        │
                                       └─────────────────────┘
```

**Frontend (React + TS + Vite + Tailwind)** — 3 app surfaces trong 1 SPA, route theo role:
- `/s/:qrToken` — luồng khảo sát khách (public, không cần đăng nhập).
- `/app/survey` — luồng khảo sát nhân viên (cần đăng nhập, role STAFF+).
- `/app/dashboard/*` — dashboard shop/khu vực/hệ thống (role SHOP_MANAGER+).
- `/app/admin/*` — quản trị (role ADMIN, một phần REGION_MANAGER/SHOP_MANAGER).

**Backend (Node.js + REST + Prisma)** — chia module theo domain:
- `auth` — đăng nhập, JWT/session, RBAC middleware.
- `shops` — CRUD shop/khu vực.
- `qr` — tạo/vô hiệu hoá QR, resolve token → shop.
- `campaigns` — chiến dịch khảo sát.
- `survey` — survey_question_configs (versioned), nộp câu trả lời, chống trùng.
- `catalog` — brands/package_sizes/product_types (CRUD danh mục).
- `analytics` — truy vấn tổng hợp cho dashboard (đọc, không ghi nghiệp vụ).
- `action-items` — cơ hội cải thiện và trạng thái xử lý.
- `export` — xuất Excel/CSV.
- `audit` — ghi log truy cập dữ liệu nhạy cảm.

**Database**: PostgreSQL, truy cập qua Prisma; migration versioned trong repo.

## 3. Luồng dữ liệu chính

### 3.1. Khách quét QR khảo sát
1. Khách quét QR → mở `/s/{qr_token}`.
2. FE gọi `GET /api/public/qr/:token` → BE resolve token → trả `shop_id`, tên shop, khu vực, `campaign_id` hiện active (snapshot ngay tại đây), **không** trả thông tin nội bộ khác.
3. Nếu token không hợp lệ/bị revoke → FE hiển thị lỗi rõ ràng, không tạo session.
4. FE tạo `survey_session` nháp ở local state; khi khách nhập tên/SĐT + đồng ý → `POST /api/public/sessions` (BE tạo `survey_respondents` + `privacy_consents` + `survey_sessions`, gắn `shop_id`/`campaign_id` đã resolve ở bước 2 — **không** nhận `shop_id` từ body).
5. BE kiểm tra chống trùng (SĐT chuẩn hoá + shop + campaign) → nếu trùng, trả cờ `duplicate: true`, FE hiển thị thông báo, không chặn hoàn toàn (theo chính sách cấu hình) nhưng đánh dấu `is_duplicate`.
6. Khách trả lời từng câu → FE giữ state cục bộ, submit toàn bộ khi hoàn tất (hoặc submit từng câu — xem `06-api-specification.md`) → BE validate business rules (độc quyền, phân nhánh hợp lệ theo version câu hỏi) trước khi lưu.
7. Hoàn tất → `survey_sessions.status = COMPLETED`, hiển thị màn hình cảm ơn.

### 3.2. Nhân viên khảo sát trực tiếp
1. Nhân viên đăng nhập (`POST /api/auth/login`) → BE trả JWT gắn `user_id`, `role`, `shop_id`.
2. FE vào `/app/survey`, không hỏi tên/SĐT khách, tạo `survey_sessions` với `source = STAFF`, `shop_id` lấy từ **user đang đăng nhập**, không cho chọn shop khác ngoài quyền.
3. Trả lời 4 câu tương tự luồng QR, submit, lưu.

### 3.3. Dashboard & phân tích
- API `analytics/*` chỉ đọc (aggregation queries), áp RBAC theo phạm vi (shop/khu vực) của user gọi.
- Mọi số liệu trả kèm `sample_size` (N) để FE hiển thị mẫu số, tránh hiểu sai là "thị phần".

### 3.4. Quản trị danh mục & versioning
- Khi admin đổi danh sách nhãn hiệu/quy cách/loại sản phẩm hoặc nội dung câu hỏi → tạo bản ghi version mới trong `survey_question_configs`/`survey_option_configs`, không sửa đè bản ghi cũ đã được tham chiếu bởi câu trả lời đã lưu.

## 4. Bảo mật theo lớp

| Lớp | Biện pháp |
|---|---|
| Network | HTTPS bắt buộc (reverse proxy), không chạy HTTP ra ngoài |
| API | Input validation (schema validation mọi endpoint), rate limiting theo IP/token cho endpoint public (`/api/public/*`) |
| Auth | JWT/session cho user nội bộ; endpoint public không cần auth nhưng giới hạn field trả về |
| Data | Chống SQL injection (Prisma parameterized), chống XSS (escape output, CSP header), chống CSRF nếu dùng cookie session |
| PII | SĐT hash có khóa (HMAC) để chống trùng, không log PII, không PII trong URL/query string |
| Audit | Ghi `audit_logs` cho mọi truy cập/đọc dữ liệu nhạy cảm (ví dụ admin xem danh sách respondents) |

## 5. Triển khai

- `docker-compose.yml`: service `db` (postgres), `api`, `web`, `proxy` (nginx, HTTPS).
- `.env.example` liệt kê mọi biến môi trường cần thiết (DB URL, JWT secret, HMAC key cho SĐT, base URL cho QR).
- Migration + seed script chạy tự động khi container `api` khởi động lần đầu (hoặc qua lệnh riêng — quyết định cụ thể ở giai đoạn code).
- Backup/restore: hướng dẫn `pg_dump`/`pg_restore` trong README triển khai.

## 6. Giả định kỹ thuật (ghi nhận, sẽ nêu lại ở tài liệu tổng hợp giả định)

- Backend dùng Express + Prisma (đơn giản, phổ biến, dễ bảo trì) thay vì framework phức tạp hơn — chọn vì đây là lựa chọn ổn định, nhiều tài liệu, đúng với yêu cầu "không hardcode, dễ bảo trì".
- Auth dùng JWT lưu trong httpOnly cookie (giảm rủi ro XSS đánh cắp token so với localStorage); do đó cần chống CSRF (double-submit cookie hoặc SameSite=Strict).
