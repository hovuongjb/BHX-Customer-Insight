# 07. Kế hoạch triển khai — BHX Customer Insight

## Giai đoạn 1 — Thiết kế (hiện tại)

| Tài liệu | Trạng thái |
|---|---|
| `01-phan-tich-nghiep-vu.md` | Hoàn thành |
| `02-kien-truc-he-thong.md` | Hoàn thành |
| `03-thiet-ke-database.md` | Hoàn thành |
| `04-luong-khao-sat.md` | Hoàn thành |
| `05-thiet-ke-giao-dien.md` | Hoàn thành |
| `06-api-specification.md` | Hoàn thành |
| `07-ke-hoach-trien-khai.md` (tài liệu này) | Hoàn thành |
| `08-tieu-chi-nghiem-thu.md` | Hoàn thành |

**Gate:** Không viết feature code trước khi cả 8 tài liệu trên được xác nhận nhất quán với nhau (xem mục "Kiểm tra nhất quán" ở cuối tài liệu này) và được người dùng duyệt tiếp tục.

## Giai đoạn 2 — MVP

Thứ tự ưu tiên:

1. **Khởi tạo dự án**: cấu trúc source code (frontend/backend), Docker Compose (db/api/web/proxy), `.env.example`, Prisma schema + migration đầu tiên theo `03-thiet-ke-database.md`.
2. **Quản lý shop + Auth + RBAC**: `regions`, `shops`, `users`, đăng nhập, middleware phân quyền.
3. **Tạo QR**: check-shop, generate token, export PNG/SVG/poster.
4. **Khách nhập tên/SĐT**: màn hình chào mừng + consent + form, `survey_respondents`/`privacy_consents`/`survey_sessions` khởi tạo.
5. **Bộ 4 câu hỏi**: `survey_question_configs`/`survey_option_configs` seed v1, catalog brands/package_sizes/product_types seed, FE flow phân nhánh đầy đủ (Câu 1→4), BE validate + lưu `survey_group_choices`/`survey_change_factors`/`survey_detail_choices`.
6. **Kiểm soát trùng**: chuẩn hoá SĐT, hash HMAC, kiểm tra trùng theo shop+campaign.
7. **Dashboard shop**: `/api/analytics/shop/:id/summary` + màn hình tương ứng.
8. **Cấu hình nhãn hiệu**: CRUD catalog ở admin.

**Tiêu chí hoàn thành MVP**: một khách thật quét QR demo, hoàn thành khảo sát trên điện thoại, dữ liệu xuất hiện đúng trên dashboard shop.

## Giai đoạn 3 — Quản trị và phân tích

1. Dashboard khu vực + toàn hệ thống + bộ lọc đầy đủ.
2. Dashboard hành động (`action_items`) + job tổng hợp.
3. Quản lý chiến dịch (`survey_campaigns`) + gắn với QR.
4. Phân quyền nâng cao (REGION_MANAGER phạm vi khu vực, kiểm tra scope đầy đủ mọi endpoint).
5. Xuất báo cáo Excel/CSV cho cả 3 cấp dashboard.
6. Quản lý bộ câu hỏi (versioning qua UI admin) thay vì chỉ seed.

## Giai đoạn 4 — Production

1. Chạy đủ bộ test ở `08-tieu-chi-nghiem-thu.md`.
2. Rate limiting + hardening bảo mật (CSRF, CSP, input validation rà soát lại toàn bộ endpoint public).
3. Docker Compose production profile + Nginx HTTPS (hướng dẫn gắn chứng chỉ, ví dụ Let's Encrypt hoặc Cloudflare).
4. Logging tập trung (ít nhất log file có rotate) + `audit_logs` đầy đủ cho truy cập PII/export.
5. Tài liệu: README triển khai VPS, hướng dẫn backup/restore (`pg_dump`/`pg_restore`), user manual (nhân viên/khách), admin manual.
6. Rà soát yêu cầu pháp luật VN về bảo vệ dữ liệu cá nhân trước khi go-live thật (việc cần làm với bộ phận pháp lý, ngoài phạm vi kỹ thuật của đội phát triển).

## Kiểm tra nhất quán giữa các tài liệu (đã thực hiện khi soạn Giai đoạn 1)

- Danh sách bảng ở `03` khớp với thực thể nêu trong `01`/`02`/`06`.
- Luồng ở `04` khớp với các endpoint ở `06` (mỗi bước trong luồng có endpoint tương ứng).
- Màn hình ở `05` khớp với sitemap suy ra từ role ở `01` mục 6 và route ở `06`.
- Quy tắc nghiệp vụ (chống trùng, phân quyền, QR, versioning) được lặp lại nhất quán ở `01`, `02`, `03`, `04` — không có mâu thuẫn giữa các tài liệu.

## Giả định đã sử dụng (tổng hợp)

1. Backend: Node.js + Express/Fastify + Prisma (đơn giản, một hướng, dễ bảo trì) — không dùng FastAPI vì không có lý do rõ ràng cần tách backend khác stack.
2. Auth lưu JWT trong httpOnly cookie, chống CSRF bằng double-submit token.
3. Không lưu SĐT plaintext trong DB nghiệp vụ, chỉ lưu hash HMAC dùng để chống trùng + 4 số cuối để hỗ trợ hiển thị; việc liên hệ lại khách (nếu cần trong tương lai) nằm ngoài phạm vi V2.0 hiện tại.
4. Danh mục brands/package_sizes/product_types không versioned theo thời gian; câu trả lời Câu 4 lưu kèm `label_snapshot` để không bị sai lệch khi danh mục đổi sau này.
5. Mỗi shop chỉ có một QR `active` tại một thời điểm; phát hành QR mới tự động revoke QR cũ.
6. Chỉ một `survey_campaigns` active toàn hệ thống tại một thời điểm.
7. Luồng STAFF không áp dụng chống trùng theo SĐT (vì không thu thập PII ở luồng này).
8. Session khảo sát bị bỏ giữa đường (không hoàn tất) được đánh dấu `ABANDONED` sau một khoảng thời gian không hoạt động — ngưỡng cụ thể (ví dụ 30 phút) sẽ chốt khi code, có thể cấu hình.
9. Danh sách siêu thị thực tế (364 shop) nhập từ `DS shop.xlsx` (2026-11-06) dùng **QLTP làm Region**: mỗi QLTP (người giám sát trực tiếp một cụm shop) ánh xạ 1-1 vào một bản ghi `regions`, `regions.name` chính là tên QLTP — tái dùng mô hình RBAC/dashboard-theo-khu-vực sẵn có thay vì thêm bảng/trường mới. Tên QLTP **không hiển thị** ở màn hình khảo sát công khai (chỉ hiển thị tên + mã siêu thị); chỉ hiển thị ở công cụ quản trị nội bộ (tạo QR) với nhãn rõ "QLTP". File nguồn gốc được chuyển thành `apps/api/prisma/data/shops.json` (đã commit) để seed không phụ thuộc đường dẫn Google Drive của máy cá nhân.
