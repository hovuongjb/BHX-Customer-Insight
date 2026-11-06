# PROGRESS — BHX Customer Insight

Cập nhật: **2026-11-06**. Giai đoạn theo [docs/07](docs/07-ke-hoach-trien-khai.md): G1 Thiết kế ✅ · G2 MVP ✅ · **G3 Quản trị & phân tích: đang dở (~55%)** · G4 Production ❌ (~15%).
Mức hoàn thành là đánh giá của người bàn giao dựa trên đặc tả + những gì đã chạy thử; "kiểm thử" = tự động/chạy tay (xem HANDOVER mục 8).

## Checklist theo module

| # | Module | % | Trạng thái | File chính | Kiểm thử |
|---|---|---|---|---|---|
| 1 | Bộ 4 câu hỏi + phân nhánh + quay lại/sửa (FE state machine) | 100 | ✅ | `apps/web/src/components/survey/surveyEngine.ts`, `SurveyFlow.tsx` | self-test 23 |
| 2 | Validate/lưu câu trả lời phía server (độc quyền, phân nhánh, idempotent) | 95 | ✅ | `apps/api/src/services/survey.ts`, `surveyAnswers.schema.ts` | smoke |
| 3 | Khảo sát khách qua QR (chào mừng → tên/SĐT → câu hỏi → quà → cảm ơn) | 95 | ✅ (chưa test điện thoại thật) | `pages/survey/QrSurveyPage.tsx`, `routes/public.routes.ts` | UI + smoke |
| 4 | Khảo sát nhân viên trực tiếp | 90 | ✅ | `pages/survey/StaffSurveyPage.tsx`, `routes/survey.routes.ts` | UI + smoke |
| 5 | Chọn quà cuối khảo sát | 85 | ⚠️ thiếu UI admin; thiếu cách liên hệ khách | `SurveyFlow.tsx` (GiftStep), `catalog.routes.ts`, bảng `gifts` | UI + smoke |
| 6 | QR: lấy QR công khai theo mã ST; tạo/huỷ/xuất (PNG/SVG/poster) | 85 | ✅ | `pages/public/GetQrPage.tsx`, `routes/qr.routes.ts`, `pages/admin/QrAdminPage.tsx` | smoke (một phần) |
| 7 | Dữ liệu shop/QLTP thật (364/18) | 100 | ✅ | `prisma/data/shops.json`, `prisma/seed.ts` | smoke |
| 8 | Xác thực + RBAC + CSRF | 85 | ⚠️ thiếu rate-limit đăng nhập | `middleware/auth.ts`, `routes/auth.routes.ts`, `services/scope.ts` | smoke |
| 9 | Chống trùng SĐT | 60 | ⚠️ chỉ gắn cờ; quà vẫn phát; có race; chính sách cố định | `services/survey.ts` (`checkDuplicateRespondent`) | smoke (case cơ bản) |
| 10 | Dashboard shop | 80 | ✅ | `pages/dashboard/ShopDashboardPage.tsx`, `routes/analytics.routes.ts` | UI |
| 11 | **Admin: báo cáo kết quả + CSV** | 85 | ✅ | `pages/admin/AdminReportsPage.tsx`, `services/reports.ts`, `routes/admin.routes.ts` | UI + smoke |
| 12 | **Admin: phản hồi chi tiết (+audit)** | 85 | ✅ | `pages/admin/AdminSessionsPage.tsx` | UI + smoke |
| 13 | **Admin: sửa câu hỏi/đáp án theo phiên bản + danh mục** | 90 | ✅ | `pages/admin/AdminQuestionsPage.tsx`, `routes/questions.routes.ts`, `catalog.routes.ts` | UI + smoke |
| 14 | Dashboard khu vực / REGION_MANAGER; xuất Excel .xlsx | 30 | ❌ gần như chưa | (admin reports đã có so sánh QLTP, chỉ ADMIN) | — |
| 15 | Cơ hội cải thiện có vòng đời (`action_items`, 6 trạng thái, ghi chú) | 15 | ❌ chỉ có bảng "nhóm × yếu tố" tính tức thời | schema `ActionItem` (chưa có route/UI) | — |
| 16 | Quản trị shop/QLTP/user/chiến dịch bằng UI | 10 | ❌ chỉ có API thô | `routes/shops|regions|users|campaigns.routes.ts` | — |
| 17 | Dữ liệu cá nhân: SĐT mã hóa + ADMIN xem rõ ✅; ẩn danh/xoá theo yêu cầu, retention, theo dõi "đã gửi quà" ❌ | 50 | ⚠️ | `lib/phone.ts`, `services/reports.ts`, `survey_respondents.phone_encrypted` | smoke |
| 18 | Test tự động | 35 | ⚠️ chưa có framework; có self-test + smoke script | `surveyEngine.selftest.ts`, `scripts/smoke-test.mjs` | — |
| 19 | Docker/triển khai | 55 | ⚠️ Compose chạy được; thiếu HTTPS/Nginx/backup/CI | `docker-compose.yml`, `apps/*/Dockerfile` | chạy cô lập 37/37 |
| 20 | Tài liệu | 85 | ✅ (một số chỗ `docs/` lệch nhẹ) | `CLAUDE.md`, `HANDOVER.md`, `README.md`, `docs/` | — |

## Độ phủ 25 test case của [docs/08](docs/08-tieu-chi-nghiem-thu.md)

Tự động (self-test/smoke): #3 ngoài quyền · #4 mở đúng shop · #6 hợp lệ · #7 SĐT sai · #9 mua cả 4 nhóm · #15 không muốn chuyển · #16 quay lại sửa · #18 trùng SĐT · #19 gửi lại không nhân đôi (idempotent) · #21 lọc shop · #23 phân quyền · #24 CSV.
Đã thử tay, **chưa tự động**: #1 tạo QR · #2 mã không tồn tại (qr/check-shop) · #10–#14 các nhánh trả lời · #22 lọc khu vực · #25 đổi danh mục không sai dữ liệu cũ.
**Chưa kiểm tra**: #5 QR bị vô hiệu · #17 thoát giữa chừng · #20 hai khách đồng thời · #19 mất mạng thật ở trình duyệt. #8 không còn áp dụng.

## Công việc ưu tiên tiếp theo

**P0 — chặn việc dùng với khách thật**
1. ~~Chốt cách gửi quà~~ **Đã làm (2026-11-06)**: SĐT lưu mã hóa, ADMIN xem rõ + CSV. Còn lại: **theo dõi trạng thái "đã gửi quà"** (cột + nút trong `/admin/sessions`), cơ chế ẩn danh/xoá SĐT sau thời hạn; chủ dự án đã chấp nhận rủi ro phần đồng ý (Rủi ro #2) — vẫn nên có pháp chế rà soát trước khi mở rộng.
2. **Chống lạm dụng quà**: không cho session `isDuplicate` nhận/ghi quà, xử lý race (ràng buộc duy nhất hoặc khoá khi tạo session); thêm rate-limit đăng nhập (`express-rate-limit` trên `/api/auth/login`).
3. **Nâng dependency có cảnh báo high** (Express 4.22+, Vite, react-router-dom, postcss; cân nhắc zod 4 riêng) — làm từng nhóm, chạy lại type-check + self-test + smoke sau mỗi bước.

**P1 — hoàn thiện Giai đoạn 3**
4. UI quản trị quà tặng; UI shop/QLTP/user/chiến dịch (API đã có).
5. `action_items`: API + màn hình "Cơ hội cải thiện" với 6 trạng thái/ghi chú; dashboard khu vực cho REGION_MANAGER; xuất .xlsx.
6. Job đánh dấu `ABANDONED` (30 phút không hoạt động); chính sách chống trùng cấu hình được.

**P2 — Giai đoạn 4 Production**
7. Thêm Vitest/Jest (đưa `surveyEngine.selftest.ts` và `scripts/smoke-test.mjs` vào test runner) + GitHub Actions CI (type-check + test + build).
8. Nginx/Caddy HTTPS cùng site, backup `pg_dump` định kỳ, logging, `NODE_ENV=production` + secret mới, tách seed demo khỏi dữ liệu thật.
9. Test điện thoại thật qua QR (iOS/Android), responsive 375/414px, tải đồng thời; PWA nếu cần.
10. Đồng bộ lại `docs/` với code (xoá chỗ lệch).

## 3 nhiệm vụ nên làm ngay (theo thứ tự)

1. **Theo dõi "đã gửi quà" + ẩn danh/xoá SĐT theo thời hạn** (P0-1 còn lại) — hoàn thiện quy trình quà sau khi SĐT đã xem được.
2. **Chặn quà cho khảo sát trùng + rate-limit đăng nhập** (P0-2) — vá hai lỗ hổng nhỏ, nhanh, có thể thêm test vào `scripts/smoke-test.mjs`.
3. **Dựng Vitest + CI rồi nâng dependency có cảnh báo high** (P0-3 + P2-7) — tạo lưới an toàn trước khi mở rộng tính năng.
