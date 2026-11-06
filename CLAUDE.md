# NHIỆM VỤ: XÂY DỰNG BHX CUSTOMER INSIGHT V2.0

> Tài liệu này là bản tổ chức lại Master Prompt do người dùng cung cấp ngày 2026-11-06.
> Đây là dự án **độc lập**, không liên quan đến dự án "BHX Grow – Coach Marketplace" (một dự án khác của cùng chủ sở hữu).
>
> **Người mới tiếp quản — đọc theo thứ tự:** [HANDOVER.md](HANDOVER.md) (bối cảnh, quyết định, rủi ro) → [PROGRESS.md](PROGRESS.md) (checklist + việc ưu tiên) → [README.md](README.md) (cài đặt/chạy) → file này (quy tắc làm việc, kiến trúc, lệnh) → [docs/](docs/) (thiết kế chi tiết).
> Một số phần thiết kế trong `docs/` được viết trước khi code và đã được **cập nhật bằng ghi chú "thêm/cập nhật 2026-11-06"** khi yêu cầu thay đổi; khi mâu thuẫn, **CLAUDE.md + code hiện tại thắng**.

Bạn là đội ngũ gồm:

* Senior Product Manager (ngành bán lẻ FMCG).
* Chuyên gia nghiên cứu hành vi tiêu dùng Việt Nam.
* Senior UX/UI Designer (mobile-first).
* Senior Full-stack Engineer.
* Database Architect.
* Data Analyst & BI Engineer.
* Chuyên gia bảo mật và bảo vệ dữ liệu cá nhân.

Xây dựng ứng dụng web hoàn chỉnh, triển khai thực tế được, tên:

# BHX CUSTOMER INSIGHT

Khẩu hiệu: *"Lắng nghe khách hàng – Thay đổi để được lựa chọn."*

Giao diện tiếng Việt, đơn giản, hiện đại, mobile-first. Đây là phần mềm thực sự hoạt động (backend, database, API, phân quyền, QR, dashboard) — không phải mockup.

---

## 1. BỐI CẢNH & MỤC TIÊU

BHX muốn tăng tỷ lệ khách chọn mua tại BHX cho 4 nhóm hàng thiết yếu: **Gạo, Mì ăn liền, Dầu ăn, Nước mắm**, hiện đang bị mua ở nơi khác.

BHX chỉ tác động trực tiếp được 5 yếu tố: **Giá bán, Khuyến mãi, Nhãn hiệu, Dung tích/quy cách, Loại sản phẩm**. Không khảo sát nội dung ngoài 5 yếu tố này.

**Câu hỏi cốt lõi:** "BHX cần thay đổi điều gì để khách đang mua Gạo–Mì–Dầu–Mắm ở nơi khác chuyển sang mua tại BHX?"

Đầu ra phải là **danh sách cơ hội và hành động cải thiện**, không chỉ biểu đồ.

**Ràng buộc dữ liệu quan trọng:** Mẫu khảo sát (khách tại BHX hoặc quét QR tại BHX) KHÔNG đại diện cho toàn bộ dân cư/thị trường. Không được gọi tỷ lệ khảo sát là "thị phần thị trường thực tế" ở bất kỳ đâu trong UI, dashboard hay tài liệu.

---

## 2. BA PHÂN HỆ

1. **Khảo sát khách hàng** — 2 nguồn: (a) nhân viên khảo sát trực tiếp (đăng nhập, không cần tên/SĐT khách), (b) khách tự khảo sát qua QR (cần họ tên + SĐT + đồng ý xử lý dữ liệu). Chung bộ câu hỏi và cấu trúc dữ liệu, phân biệt bằng nguồn (`source`).
2. **Dashboard phân tích** — theo shop / khu vực / toàn hệ thống, so sánh, xuất dữ liệu.
3. **Quản trị** — shop, khu vực, user, QR, chiến dịch, bộ câu hỏi, danh mục (nhãn hiệu/quy cách/loại sản phẩm), phân quyền.

---

## 3. QR & SHOP

* URL dạng `https://survey.example.com/s/{qr_token}`; `qr_token` ngẫu nhiên, không tuần tự, không chứa PII.
* Backend xác định shop ID **từ token**, không bao giờ tin shop ID do client gửi.
* Mỗi shop có QR cố định; có thể vô hiệu hóa, phát hành QR mới, tải PNG/SVG, tạo poster A4.
* QR gắn với chiến dịch đang active; khi đổi chiến dịch, QR cũ vẫn dùng được, hệ thống ghi nhận `campaign_id` tại thời điểm khách **bắt đầu** khảo sát (không phải thời điểm tạo QR).
* Không tạo QR cho mã shop chưa đăng ký hoặc ngoài phạm vi phân quyền của người tạo.
* **Ngoại lệ (theo yêu cầu người dùng 2026-11-06):** tra cứu/hiển thị lại QR **đã tồn tại** của một shop (nhập mã ST → lấy QR) là thao tác công khai, không cần đăng nhập — vì QR vốn dĩ được trưng ra công khai cho khách quét. Việc **tạo mới/vô hiệu hoá** QR vẫn yêu cầu đăng nhập + đúng phạm vi phân quyền như trên, không đổi.

---

## 4. BỘ 4 CÂU HỎI (xem chi tiết đầy đủ trong [docs/01-phan-tich-nghiep-vu.md](docs/01-phan-tich-nghiep-vu.md))

1. Nhóm hàng mua bên ngoài (multi-select, "Không có" độc quyền → kết thúc).
2. Nhóm hàng muốn BHX cải thiện (chỉ hiện nhóm đã chọn ở câu 1; "Chưa muốn chuyển nhóm nào" độc quyền → kết thúc).
3. Yếu tố cần thay đổi — lặp lại cho **từng nhóm hàng** đã chọn ở câu 2; "Không có thay đổi nào" độc quyền trong từng nhóm.
4. Mong muốn cụ thể — phân nhánh theo nhóm hàng × yếu tố đã chọn ở câu 3 (5 nhánh: Giá/Khuyến mãi/Nhãn hiệu/Dung tích/Loại sản phẩm).

Quy tắc chung: cho sửa lại câu trước → tự xóa câu trả lời phụ thuộc không còn hợp lệ; không nhập text/số trong câu hỏi nghiệp vụ; danh sách nhãn hiệu/quy cách/loại sản phẩm phải **cấu hình từ database**, không hardcode.

**Bước 5 — Chọn quà tặng (thêm 2026-11-06):** Sau khi trả lời xong Câu 1–4 (hoặc kết thúc sớm do chọn "Không có"/"Chưa muốn chuyển nhóm nào"), hệ thống hiện màn hình chọn quà — khách **chọn đúng 1 món** trong danh mục quà (`gifts`, quản lý qua DB, không hardcode, ảnh/tên/giá/ghi chú cấu hình được). Bấm "Hoàn tất" mới thực sự lưu khảo sát (`status=COMPLETED`) — `giftId` là bắt buộc khi gọi API hoàn tất, không có quà thì không hoàn tất được. Áp dụng cho cả luồng QR lẫn luồng nhân viên.

---

**Trang quản trị (thêm 2026-11-06):** `/admin` chỉ dành cho ADMIN (kiểm tra ở backend `/api/admin`, `/api/questions`): báo cáo kết quả có bộ lọc + xuất CSV, xem chi tiết từng phản hồi, sửa nội dung câu hỏi/đáp án theo phiên bản (khảo sát cũ giữ nguyên câu trả lời, nhãn lưu snapshot).

## 5. CHỐNG TRÙNG

Mặc định: một SĐT (đã chuẩn hóa) chỉ tính **một** khảo sát hợp lệ / shop / campaign. Chính sách phải cấu hình được. Không xóa khảo sát trùng (giữ lại, đánh dấu). Không dùng IP làm tiêu chí duy nhất. SĐT chưa OTP ≠ danh tính đã xác minh.

---

## 6. PHÂN QUYỀN (RBAC)

| Role | Quyền |
|---|---|
| ADMIN | Toàn quyền |
| REGION_MANAGER | Xem/quản lý dữ liệu trong khu vực được giao |
| SHOP_MANAGER | Xem dữ liệu shop, tạo QR cho shop được giao, theo dõi khảo sát |
| STAFF | Thực hiện khảo sát trực tiếp; không xem PII khách ngoài phạm vi cần thiết |
| CUSTOMER | Không tài khoản; chỉ vào trang khảo sát qua QR hợp lệ |

Mọi kiểm tra quyền phải thực hiện ở **backend**, không chỉ ẩn UI.

---

## 7. DỮ LIỆU CÁ NHÂN & BẢO MẬT

* Họ tên + SĐT chỉ thu thập ở luồng QR.
* **Cập nhật 2026-11-06 (quyết định sản phẩm của người dùng):** đã bỏ khối thông báo quyền riêng tư đầy đủ + checkbox đồng ý chủ động. Màn hình nhập tên/SĐT giờ chỉ có **một dòng thông báo ngắn**: "BHX xin phép thu thập họ tên và số điện thoại để gửi phần quà cảm ơn sau khi anh/chị hoàn thành khảo sát." Không còn bước tick đồng ý riêng — tiếp tục điền form coi như đồng ý.
  ⚠️ Thay đổi này **mâu thuẫn với yêu cầu ban đầu** ("đồng ý chủ động, không mặc định") và với Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (thường yêu cầu có cơ chế đồng ý rõ ràng khi thu thập dữ liệu cá nhân). Đây là lựa chọn có chủ đích của người dùng cho giai đoạn Pilot nội bộ, **không phải đánh giá pháp lý** — bắt buộc rà soát lại với bộ phận pháp lý trước khi dùng cho khách hàng thật/production (xem mục dưới).
* SĐT chuẩn hóa, **bảo vệ khi lưu** (hash có khóa để chống trùng, không lưu plaintext tùy nghi), không xuất hiện trong URL hoặc log.
* HTTPS, input validation, rate limiting, chống SQL injection/XSS/CSRF, không lộ PII trong dashboard công khai, không đưa tên/SĐT vào analytics logs.
* Có cơ chế xóa/ẩn danh theo yêu cầu và lịch sử truy cập dữ liệu nhạy cảm (audit log).
* Trước khi production: rà soát yêu cầu pháp luật VN về bảo vệ dữ liệu cá nhân (ghi rõ đây là việc cần làm, không tự kết luận thay luật sư) — **đặc biệt là thay đổi về đồng ý nêu trên.**

---

## 8. TECH STACK

* Frontend: React + TypeScript + Vite + Tailwind CSS.
* Backend: Node.js, REST API, Prisma ORM.
* Database: PostgreSQL.
* Dashboard chart: Recharts.
* QR: thư viện tạo QR hỗ trợ PNG/SVG.
* Deploy: Docker + Docker Compose, HTTPS qua reverse proxy, hướng dẫn VPS.
* Có `.env.example`, không hardcode secrets, có migration + seed data, có hướng dẫn backup/restore.

Không dùng dịch vụ trả phí cho chức năng cốt lõi. PWA nếu phù hợp. Tối ưu tải trên mạng di động.

---

## 9. NGUYÊN TẮC LÀM VIỆC

* Giai đoạn 1 (Thiết kế) **đã xong**, Giai đoạn 2 (MVP) **đã xong**, đang ở giữa Giai đoạn 3 — xem [PROGRESS.md](PROGRESS.md). Thay đổi nghiệp vụ lớn phải cập nhật `docs/` + file này cùng lúc với code (không để "tài liệu nói một đằng, code một nẻo").
* Ưu tiên MVP chạy được trước, mở rộng sau (theo lộ trình 4 giai đoạn trong [docs/07-ke-hoach-trien-khai.md](docs/07-ke-hoach-trien-khai.md)).
* Không tự nhận đã hoàn thành chức năng nếu chưa kiểm thử.
* Khi gặp quyết định kỹ thuật chưa được chỉ định: chọn phương án đơn giản/ổn định/dễ bảo trì nhất, ghi rõ giả định, tiếp tục — không dừng cả dự án để hỏi lại trừ khi ảnh hưởng phạm vi hoặc dữ liệu cá nhân.
* Không mở rộng phạm vi ngoài những gì mô tả trong tài liệu này và `docs/`.
* Sau mỗi giai đoạn, báo cáo: đã làm gì, file nào, cách chạy, kết quả test, việc còn tồn tại.

## 10. KHÔNG ĐƯỢC LÀM

* Không gọi tỷ lệ khảo sát là "thị phần thị trường".
* Không suy luận doanh thu tăng thêm khi chưa có dữ liệu bán hàng thực tế.
* Không hardcode danh sách nhãn hiệu/quy cách/loại sản phẩm trong giao diện.
* Không lấy shop ID từ dữ liệu client gửi lên để quyết định nơi lưu kết quả.
* Không lưu SĐT dạng dễ dò (URL, log, plaintext tùy nghi) hoặc coi SĐT chưa OTP là danh tính xác thực.
* Không microservices/Kubernetes — ưu tiên monolith có cấu trúc tốt.

---

## 11. KIẾN TRÚC (monolith có cấu trúc)

```
apps/api   Node 22 + Express 4 + Prisma 5 + PostgreSQL 16 (TypeScript, CommonJS)
apps/web   React 18 + Vite 6 + Tailwind 3 + React Router 6 + Recharts 2 (TypeScript, ESM)
docker-compose.yml   db (postgres) + api + web. Chưa có Nginx/HTTPS (việc Giai đoạn 4).
```

**API (`apps/api/src`)**: `index.ts` gắn middleware (helmet, cors, cookie-parser, rate limit chỉ cho `/api/public`) rồi các router:
- `routes/public.routes.ts` — không cần đăng nhập: tra QR theo token/mã shop, cấu hình khảo sát, tạo session, lưu câu trả lời, hoàn tất.
- `routes/survey.routes.ts` — nhân viên khảo sát trực tiếp (cần đăng nhập + CSRF).
- `routes/qr.routes.ts`, `shops`, `regions`, `users`, `campaigns`, `catalog` (CRUD brand/quy cách/loại SP/quà), `analytics` (dashboard shop).
- `routes/admin.routes.ts` + `routes/questions.routes.ts` — **chỉ ADMIN**: báo cáo, phản hồi chi tiết, CSV, sửa câu hỏi theo phiên bản.
- `services/survey.ts` — **trái tim nghiệp vụ**: validate toàn bộ phân nhánh Câu 1–4 và lưu idempotent (xóa-rồi-ghi trong 1 transaction), hoàn tất + chọn quà, chống trùng. `services/reports.ts` — gộp số liệu báo cáo/CSV. `services/scope.ts` — kiểm tra phạm vi shop/khu vực.
- `lib/phone.ts` (chuẩn hóa SĐT VN + HMAC), `lib/qrToken.ts`, `lib/jwt.ts`, `middleware/auth.ts` (`requireAuth`, `requireRole`, `requireCsrf`).
- `prisma/schema.prisma` + `migrations/` + `seed.ts` + `data/shops.json` (364 shop thật + 18 QLTP).

**Web (`apps/web/src`)**: `App.tsx` (route), `pages/survey/*` (QR + nhân viên), `components/survey/surveyEngine.ts` (**state machine thuần** của luồng câu hỏi: `computePhase` + `apply*`, có self-test), `components/survey/SurveyFlow.tsx` (UI các bước), `pages/admin/*` (quản trị ADMIN + QR admin), `pages/dashboard/*`, `pages/public/GetQrPage.tsx` (trang chủ: nhập mã ST → lấy QR, không cần đăng nhập).

**Xác thực**: JWT trong cookie httpOnly `token` (SameSite=Strict, `secure` khi `NODE_ENV=production`) + cookie `csrfToken` (double-submit, FE gửi header `x-csrf-token` cho mọi request không phải GET; `apiFetch` làm sẵn). Phân quyền kiểm tra ở backend bằng `requireRole` + `assertShopInScope`/`assertRegionInScope`.

**Mô hình dữ liệu cần nhớ**: QLTP (người giám sát cụm shop) = bảng `regions` (quyết định có chủ đích, xem HANDOVER). Đáp án cố định (Câu 3, "Không có…") lưu ở `survey_option_configs` theo **version** câu hỏi; danh mục nhãn hiệu/quy cách/loại SP/quà là bảng riêng, câu trả lời lưu `label_snapshot` để đổi danh mục không làm sai dữ liệu cũ.

## 12. QUY ƯỚC LẬP TRÌNH

- TypeScript `strict` ở cả hai app; **không dùng `any`** trừ file self-test. Validate mọi input ở biên bằng **zod** (`.parse` trong route; lỗi zod → 400 qua `errorHandler`).
- Route luôn bọc `asyncHandler`; lỗi nghiệp vụ ném `AppError(status, CODE, "thông điệp tiếng Việt")`. Mọi thông điệp hiển thị cho người dùng bằng **tiếng Việt**; code/identifier bằng tiếng Anh.
- Route ghi dữ liệu nội bộ phải có `requireCsrf`; route nhạy cảm phải có `requireRole` **và** (nếu theo shop/khu vực) `assertShopInScope`.
- Không bao giờ lấy `shopId` từ body/query của client để quyết định nơi lưu khảo sát; QR → từ token, nhân viên → từ JWT.
- Thay đổi nhiều bảng → dùng `prisma.$transaction`. Đổi schema → `npx prisma migrate dev --name <ten>` và commit cả thư mục migration.
- Báo cáo: luôn trả kèm mẫu số (`sampleSize`), nhãn tiếng Việt (không trả mã enum thô ra UI), và không gọi là "thị phần".
- Logic luồng câu hỏi ở FE đặt trong `surveyEngine.ts` (hàm thuần, không React) để test được; component chỉ render. Mọi thay đổi ở đó phải chạy lại self-test.
- UI mobile-first: Tailwind, màu `bhx-green`/`bhx-greenDark`/`bhx-yellow` trong `tailwind.config.js`.
- Commit nhỏ, thông điệp tiếng Việt hoặc Anh đều được nhưng nêu rõ "vì sao". Không commit `.env`, `node_modules`, `dist`.

## 13. LỆNH THƯỜNG DÙNG

Chi tiết cài đặt xem [README.md](README.md). Tóm tắt (chạy từ thư mục gốc, Node ≥ 22, Docker):

```bash
docker compose up -d db                          # Postgres (host port 5434)
cd apps/api && npm ci && npx prisma migrate deploy && npm run seed && npm run dev   # API :4000
cd apps/web && npm ci && npm run dev             # Web :5173
```

Kiểm tra trước khi báo hoàn thành:

```bash
cd apps/api && npx tsc -p tsconfig.json --noEmit           # type-check API
cd apps/web && npx tsc -b                                  # type-check Web
cd apps/web && npx tsx src/components/survey/surveyEngine.selftest.ts   # self-test state machine (23 OK)
node scripts/smoke-test.mjs                                # 34 kiểm tra API (cần API chạy + DB đã seed)
```

Chưa có framework test (Jest/Vitest) — đó là việc ưu tiên, xem PROGRESS.md.

## 14. BẪY ĐÃ BIẾT (tiết kiệm thời gian debug)

- **Windows**: `prisma generate`/`migrate dev` báo `EPERM … query_engine-windows.dll.node` nếu API đang chạy → tắt API trước rồi generate.
- Prisma CLI chỉ đọc `.env` cạnh nó; file `.env` ở **thư mục gốc**. `apps/api/src/lib/env.ts` nạp `../../.env` theo `process.cwd()` (chạy từ `apps/api`). Lệnh `prisma …` chạy tay: `set -a && source ../../.env && set +a && npx prisma …`.
- Máy dev đã có container Postgres khác chiếm 5432/5433 → project này dùng **5434**.
- `localhost` có thể treo trên một số máy Windows: dùng `127.0.0.1` nếu kết nối DB/API chập chờn.
- Git Bash làm hỏng UTF-8 khi gửi JSON tiếng Việt qua `curl -d` trực tiếp → ghi JSON ra file rồi `--data-binary @file` (hoặc dùng `scripts/smoke-test.mjs`).
- Vite dev + React StrictMode: effect chạy 2 lần → trang nhân viên tạo thừa 1 session `IN_PROGRESS` (chỉ ở dev).
- Tự động hóa trình duyệt: `form_input` không cập nhật được checkbox controlled của React — dùng click.
- Đổi `VITE_*` hoặc `WEB_ORIGIN`/`PUBLIC_SURVEY_BASE_URL` trong `.env` → phải khởi động lại cả API và Vite; `WEB_ORIGIN` phải khớp chính xác origin trình duyệt (CORS).
