# HANDOVER — BHX Customer Insight

Bàn giao ngày **2026-11-06**. Người nhận chỉ cần clone repo, làm theo [README.md](README.md), mở Claude Code (tài khoản riêng) ở thư mục gốc — Claude sẽ tự nạp [CLAUDE.md](CLAUDE.md). Mọi bối cảnh cần thiết nằm trong repo; **không cần** lịch sử hội thoại cũ (và nó cũng không được chuyển giao).

## 1. Mục tiêu dự án

Trả lời câu hỏi kinh doanh: **"BHX cần thay đổi điều gì để khách đang mua Gạo – Mì ăn liền – Dầu ăn – Nước mắm ở nơi khác chuyển sang mua tại BHX?"** — qua khảo sát ngắn tại siêu thị về 5 yếu tố BHX tác động được (giá, khuyến mãi, nhãn hiệu, quy cách, loại sản phẩm), rồi biến kết quả thành **danh sách cơ hội cải thiện**.

Hai nguồn thu thập, dùng chung bộ câu hỏi: (a) khách tự làm qua **QR riêng của từng siêu thị** (nhập họ tên + SĐT, chọn 1 quà cảm ơn); (b) **nhân viên** đăng nhập khảo sát trực tiếp (không thu thông tin khách). Ràng buộc diễn giải dữ liệu: mẫu chỉ gồm khách đến/quét QR tại BHX → **không đại diện thị trường, không gọi là thị phần**, không suy luận doanh thu.

Đặc tả đầy đủ: [CLAUDE.md](CLAUDE.md) §1–§10 và [docs/00-master-prompt-goc.md](docs/00-master-prompt-goc.md) (prompt gốc, nguyên văn).

## 2. Chức năng đã hoàn thành (đã chạy thử thật)

| Nhóm | Nội dung | Bằng chứng |
|---|---|---|
| Dữ liệu thật | 364 siêu thị + 18 QLTP nhập từ `DS shop.xlsx`; nhập mã ST ra tên shop + QLTP | smoke test; thử UI |
| QR | Trang chủ "nhập mã ST → Lấy QR" **không cần đăng nhập** (chỉ tra QR có sẵn); tạo/vô hiệu hoá QR + tải PNG/SVG/poster A4 (cần đăng nhập, đúng phạm vi) | smoke + thử UI |
| Khảo sát khách (QR) | Chào mừng → nhập tên/SĐT (1 dòng thông báo quà, không còn checkbox đồng ý) → Câu 1–4 phân nhánh, sửa/quay lại được → chọn 1 quà → cảm ơn | thử UI đầy đủ + smoke |
| Khảo sát nhân viên | Đăng nhập STAFF, shop lấy từ tài khoản, không thu PII khách | thử UI + smoke |
| Backend nghiệp vụ | Validate phân nhánh/độc quyền ở server, lưu idempotent, hoàn tất bắt buộc `giftId`, chống trùng (SĐT chuẩn hóa + HMAC), không tin `shopId` từ client | smoke 34/34 |
| Phân quyền | 4 vai trò kiểm ở backend, CSRF double-submit, phạm vi shop/khu vực | smoke (RBAC, CSRF) |
| Dashboard shop | `/app/dashboard` (ADMIN/REGION/SHOP_MANAGER) | thử UI |
| **Trang quản trị ADMIN** `/admin` | Báo cáo (bộ lọc ngày/QLTP/shop/nguồn/chiến dịch, cơ hội cải thiện, biểu đồ, so sánh QLTP, quà đã chọn, CSV); danh sách + chi tiết từng phản hồi (có audit log); sửa câu hỏi/đáp án theo **phiên bản**, sửa tên nhóm hàng/nhãn hiệu/quy cách/loại SP | smoke + thử UI |
| Quà tặng | 6 quà (ảnh thật), chọn 1 / khảo sát, lưu `gift_id` + snapshot tên; UI chỉ hiện ảnh + tên | thử UI |
| Hạ tầng | Docker Compose chạy được toàn stack (đã sửa lỗi image API — xem mục 6) | chạy cô lập 34/34 |

## 3. Đang làm dở

Không có thay đổi code dang dở hay file nửa chừng. Các hạng mục **làm một nửa**:
- **Quà tặng**: có API CRUD (`/api/catalog/gifts`) nhưng **chưa có màn hình quản trị**. Giá/quy cách/ghi chú vẫn trong DB (UI cố ý ẩn theo yêu cầu).
- **Thử trên điện thoại thật qua QR (LAN)**: đã chuẩn bị (đổi `.env` sang IP LAN) nhưng chủ dự án hoãn, **chưa test**. Chưa test responsive trên máy thật.
- **Tài liệu `docs/`**: đã vá bằng ghi chú ngày 2026-11-06 nhưng vẫn viết theo thiết kế ban đầu ở vài chỗ (vd. `docs/02` nói Express/Fastify; `docs/08` các test case #8 đã đánh dấu không áp dụng). CLAUDE.md + code là nguồn đúng.
- **Seed demo** trộn dữ liệu giả với dữ liệu thật (364 shop thật + 180 khảo sát giả) — cần tách khi lên thật.

## 4. Chưa triển khai

- Quản trị shop / QLTP (region) / người dùng / chiến dịch **bằng giao diện** (một phần có API: shops, regions, users, campaigns; **không có UI**).
- Dashboard **khu vực** riêng cho REGION_MANAGER; xuất **Excel (.xlsx)** (mới có CSV).
- **Cơ hội cải thiện có vòng đời** (`action_items`: 6 trạng thái, ghi chú, người cập nhật): bảng có trong schema nhưng chưa có API/UI; báo cáo mới tính bảng "nhóm hàng × yếu tố" tức thời.
- Đánh dấu khảo sát bỏ dở `ABANDONED` theo thời gian (hiện chỉ seed tạo trạng thái này; session thật không hoàn tất giữ `IN_PROGRESS` mãi).
- Chính sách chống trùng **cấu hình được** (đang cố định: SĐT + shop + chiến dịch).
- Cơ chế **xoá/ẩn danh** dữ liệu cá nhân theo yêu cầu; audit log mới ghi truy cập báo cáo/phản hồi/sửa câu hỏi (chưa ghi tạo/huỷ QR, đăng nhập).
- Nginx/HTTPS, sao lưu tự động, logging tập trung, PWA, test tự động đầy đủ (Giai đoạn 4).

## 5. Quyết định kỹ thuật (và lý do)

| Quyết định | Lý do / hệ quả |
|---|---|
| Monolith: Express + Prisma + Postgres; React + Vite | Theo đặc tả; đơn giản, một repo hai app **không dùng npm workspaces** (mỗi app có `package.json`/lockfile riêng, build Docker đơn giản) |
| **QLTP = bảng `regions`** (name = tên QLTP) | Tái dùng mô hình RBAC/khu vực sẵn có, không thêm bảng. Hệ quả: tên người (QLTP) nằm trong DB và **không** lộ ra màn hình công khai |
| Danh mục (nhãn hiệu/quy cách/loại SP/quà) là bảng, **không versioned**; câu trả lời lưu `label_snapshot` | Đổi danh mục không làm sai dữ liệu cũ; ẩn (`isActive=false`) thay vì xoá |
| Câu hỏi/đáp án cố định lưu trong `survey_option_configs` theo **version** | Sửa chữ tạo version mới, khảo sát cũ giữ nguyên. Đáp án có **mã cố định** (7 yếu tố Câu 3, "Không có…", "Khác/Không quan trọng" Câu 4C) chỉ cho sửa chữ vì mã gắn với logic; Q4A/Q4B thêm/bớt tự do |
| Lưu câu trả lời kiểu **thay thế toàn bộ** (delete+insert trong 1 transaction, theo session) | Idempotent, retry an toàn khi mất mạng; FE giữ state, gửi snapshot cuối |
| Luồng câu hỏi FE là **state machine thuần** (`surveyEngine.ts`), sửa câu trước ⇒ reset toàn bộ phần phụ thuộc phía sau; "Quay lại" khôi phục cả state | Đã từng có 2 lỗi chỉ lộ khi test động (`groupIndex` không lưu, Back không khôi phục state) → có self-test bao phủ |
| SĐT: chuẩn hóa → **HMAC-SHA256** (`PHONE_HASH_SECRET`) + lưu 4 số cuối; **không lưu SĐT đầy đủ** | Bảo vệ dữ liệu; hệ quả: **không thể liên hệ khách để gửi quà** (xem Rủi ro #1) |
| Auth: JWT trong cookie httpOnly `SameSite=Strict` + CSRF double-submit | Tránh XSS đánh cắp token; hệ quả: web và API phải **cùng site** |
| Tra cứu QR có sẵn là **công khai**, tạo/huỷ QR vẫn cần quyền | Yêu cầu của chủ dự án (nhân viên khỏi đăng nhập); QR vốn được dán công khai. Ghi ở CLAUDE.md §3 |
| Bỏ khối quyền riêng tư + checkbox đồng ý; thay 1 dòng thông báo quà | **Yêu cầu của chủ dự án**, trái yêu cầu gốc và có rủi ro pháp lý (Rủi ro #2). `privacy_consents.consentGiven` vẫn tự ghi `true` + `consentTextVersion` để còn dấu vết |
| CSV xuất **không chứa tên/SĐT**; danh sách phản hồi có tên + 4 số cuối và ghi audit | Giảm rò rỉ PII qua file |
| Ảnh quà ở `apps/web/public/gifts/` (tĩnh, cắt từ ảnh chủ dự án gửi) | Đơn giản; cần xác nhận quyền dùng ảnh nếu repo công khai |

## 6. Lỗi còn tồn tại / hạn chế đã biết

1. **Khảo sát trùng vẫn được hoàn tất và vẫn nhận quà** (chỉ bị gắn `isDuplicate` và loại khỏi mẫu hợp lệ) ⇒ một người có thể nhận nhiều quà. Chống trùng còn có **race** (hai request đồng thời cùng thấy "chưa trùng").
2. Đăng nhập **không có rate limit** (rate limit chỉ áp cho `/api/public`) ⇒ có thể dò mật khẩu.
3. Session khách không hoàn tất giữ `IN_PROGRESS` mãi (chưa có job); sửa/xoá câu hỏi giữa lúc khách đang làm có thể làm lần gửi cuối bị từ chối (400) — cần tải lại.
4. Dev/StrictMode: trang nhân viên tạo thừa 1 session `IN_PROGRESS` mỗi lần mở (không xảy ra ở build production).
5. `GET /api/admin/reports/*` đọc toàn bộ session theo bộ lọc vào bộ nhớ — đủ cho Pilot (hàng nghìn), sẽ chậm khi hàng trăm nghìn; CSV giới hạn 50.000 dòng. Bundle web > 500 kB (cảnh báo Vite).
6. `QrAdminPage` chỉ liệt kê 20 QR mới nhất (tìm theo mã); không phân trang. `ShopDashboardPage` còn bản sao biểu đồ cục bộ (trùng `components/charts.tsx`).
7. `docs/` còn vài chỗ lệch so với code (mục 3).
8. **Đã sửa trong lúc bàn giao** (commit riêng): `apps/api/Dockerfile` trước đó **làm API container crash** (`node:22-slim` thiếu OpenSSL ⇒ Prisma không nạp engine) và không chạy migration; nay cài `openssl`, chạy `prisma migrate deploy` khi khởi động và giữ `src/` để seed được trong container. Đây là thay đổi hạ tầng, không đụng logic nghiệp vụ.
9. Dependency audit (`npm audit`): API 8 cảnh báo (4 high: `express`/`body-parser`/`path-to-regexp` — cần nâng Express 4.22+, `zod` — nâng 4.x là breaking; moderate: `tsx`/`esbuild`/`uuid`); Web 6 cảnh báo (high: `vite`, `postcss`, `react-router(-dom)`). Chưa nâng vì cần kiểm thử hồi quy; xem PROGRESS.md.

## 7. Rủi ro

| # | Rủi ro | Mức | Gợi ý |
|---|---|---|---|
| 1 | **Không có SĐT đầy đủ để gửi quà** dù thông báo hứa gửi quà — vận hành sẽ vướng | Cao (nghiệp vụ) | Quyết định: lưu SĐT mã hoá 2 chiều (AES-GCM, khoá riêng) chỉ ADMIN xem + audit; hoặc phát quà tại quầy bằng mã/phiếu; hoặc bỏ lời hứa gửi quà |
| 2 | Thu họ tên + SĐT **không có đồng ý rõ ràng** — rủi ro với Nghị định 13/2023/NĐ-CP | Cao (pháp lý) | Rà soát với pháp chế **trước khi dùng với khách thật**; tối thiểu khôi phục checkbox/thông báo mục đích-thời hạn-liên hệ. Không phải kết luận pháp lý |
| 3 | Dữ liệu cá nhân: tên khách lưu rõ; chưa có xoá/ẩn danh theo yêu cầu, chưa có chính sách lưu trữ | Cao | Làm API ẩn danh + job xoá theo thời hạn |
| 4 | Lạm dụng quà (trùng/giả mạo SĐT, không OTP) — xem lỗi #1 | Trung bình | Chặn quà cho session trùng; cân nhắc OTP |
| 5 | Triển khai thô: HTTP, DB publish cổng 5434, mật khẩu demo `Password123!` trong seed, JWT mặc định | Cao nếu đưa lên mạng | Làm đủ danh sách "Triển khai thật" trong README |
| 6 | Cookie `SameSite=Strict`: web/API khác site không đăng nhập được | Trung bình | Reverse proxy cùng domain |
| 7 | `PHONE_HASH_SECRET` mất/đổi ⇒ không nhận diện được trùng cũ | Trung bình | Lưu vào kho bí mật + sao lưu |
| 8 | Nội dung nhạy cảm trong repo: `shops.json` (danh sách shop + **tên QLTP**) là dữ liệu nội bộ BHX; ảnh quà cắt từ ảnh sản phẩm của nhãn hàng | Thấp–TB | Giữ repo **riêng tư**; xác nhận quyền dùng |
| 9 | Chưa có test tự động thật sự (chỉ type-check + self-test engine + smoke script) | Trung bình | Thêm Vitest/Jest + CI |
| 10 | Dependency có cảnh báo `high` | Trung bình | Nâng có kiểm thử (PROGRESS #3) |

## 8. Kết quả kiểm tra thực tế khi bàn giao (2026-11-06)

| Kiểm tra | Kết quả |
|---|---|
| `tsc --noEmit` API | PASS |
| `tsc -b` Web | PASS |
| `tsc` build API / `vite build` Web | PASS (Vite cảnh báo chunk > 500 kB) |
| Self-test state machine (`surveyEngine.selftest.ts`) | **23/23 PASS** |
| Smoke test API trên stack chạy local | **34/34 PASS** |
| Smoke test trên **stack Docker Compose cô lập** (DB mới → migrate tự động → seed trong container → smoke) | **34/34 PASS** |
| `docker compose config` | hợp lệ |
| Quét bí mật trong file sẽ commit | Không có secret thật; chỉ `.env.example` placeholder. `.env` (giá trị dev) bị ignore |
| `npm audit` | API 8, Web 6 cảnh báo (mục 6.9) |

Chưa kiểm tra: responsive trên điện thoại thật, quét QR thật bằng camera, tải đồng thời, mất mạng thật khi gửi, trình duyệt khác Chromium, `docs/08` test #5 (QR bị vô hiệu), #17, #20.

## 9. Git & dữ liệu

- Trước bàn giao thư mục **chưa phải Git repo**. Đã `git init` cục bộ, tạo nhánh `handover/2026-11-06` và commit — **chưa push, chưa có remote**. Người nhận/chủ dự án tự tạo remote **riêng tư** rồi push khi sẵn sàng.
- Không có secret/PII thật trong lịch sử Git. Dữ liệu cá nhân duy nhất trong repo là **tên QLTP** (`shops.json`); khảo sát/khách trong seed đều là dữ liệu giả ngẫu nhiên.
- `.env` thật của máy cũ không đi theo repo — người nhận tự tạo từ `.env.example` với secret mới.

## 10. Bắt đầu nhanh cho người nhận

1. README → cài đặt, chạy, chạy `node scripts/smoke-test.mjs` để chắc môi trường đúng.
2. Đọc `CLAUDE.md` §11–§14 (kiến trúc, quy ước, bẫy) và [PROGRESS.md](PROGRESS.md).
3. Trước khi sửa luồng câu hỏi: đọc `apps/web/src/components/survey/surveyEngine.ts` + chạy self-test. Trước khi sửa lưu/validate: đọc `apps/api/src/services/survey.ts`.
4. Việc nên làm đầu tiên: 3 nhiệm vụ cuối PROGRESS.md.
