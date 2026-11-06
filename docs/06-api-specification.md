# 06. API Specification — BHX Customer Insight

Quy ước chung:
- Base path: `/api`.
- Auth nội bộ: JWT qua httpOnly cookie, gửi kèm CSRF token (double-submit) cho mọi request có side-effect.
- Public endpoints (`/api/public/*`): không yêu cầu đăng nhập, nhưng có rate limiting theo IP + theo `qr_token`.
- Mọi response lỗi: `{ "error": { "code": string, "message": string } }`.
- Mọi response danh sách có phân trang: `{ "data": [...], "page", "pageSize", "total" }`.
- RBAC: mỗi endpoint ghi rõ role tối thiểu; backend luôn kiểm tra phạm vi (shop/khu vực) của user, không chỉ role.

## 1. Auth

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | Public | `{email, password}` → set cookie JWT, trả `{user: {id, fullName, role, shopId, regionId}}` |
| POST | `/api/auth/logout` | User | Xoá cookie |
| GET | `/api/auth/me` | User | Trả thông tin user hiện tại |

## 2. Public — Khảo sát qua QR

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/public/qr/:token` | Public | Resolve token → `{shopId, shopCode, shopName, campaignId}` (không trả QLTP/region — không cần thiết cho khách). 404 nếu không tồn tại/đã revoke. |
| GET | `/api/public/shop-qr/:shopCode` | Public | Tra cứu QR **đang active** theo mã shop (không tạo mới) → `{shopId, shopCode, shopName, surveyUrl}`. 404 nếu mã shop không tồn tại hoặc shop chưa có QR active. |
| GET | `/api/public/shop-qr/:shopCode/image?format=png\|svg` | Public | Trả ảnh QR tương ứng, dùng cho màn hình "Lấy mã QR" không cần đăng nhập. |
| GET | `/api/public/survey-config` | Public | Trả cấu hình bộ câu hỏi + đáp án đang active (versioned) — dùng để render form động, bao gồm catalog brands/package_sizes/product_types theo nhóm hàng **và `gifts`** (danh mục quà tặng, thêm 2026-11-06). |
| POST | `/api/public/sessions` | Public | Body: `{qrToken, respondent: {fullName, phone}, consent: {given, textVersion}}`. Backend resolve `shopId`/`campaignId` từ `qrToken` (không nhận từ body). Trả `{sessionId, isDuplicate}`. |
| PATCH | `/api/public/sessions/:sessionId/answers` | Public | Body chứa câu trả lời tăng dần theo từng bước (câu 1→4) hoặc toàn bộ khi submit cuối — xem mục 4. Idempotent theo `sessionId` + `questionKey`. |
| POST | `/api/public/sessions/:sessionId/complete` | Public | Body: `{giftId}` (**bắt buộc** — thêm 2026-11-06). Đánh dấu `status=COMPLETED`, validate toàn vẹn phân nhánh + `giftId` hợp lệ/đang active trước khi chấp nhận. |

## 3. Khảo sát nhân viên (nội bộ)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/survey/survey-config` | STAFF+ | Giống `/api/public/survey-config` nhưng không cần token QR (shop lấy từ user). |
| POST | `/api/survey/sessions` | STAFF+ | Tạo session `source=STAFF`, `shopId` = shop của user hiện tại. |
| PATCH | `/api/survey/sessions/:sessionId/answers` | STAFF+ | Giống public nhưng yêu cầu `sessionId` thuộc về user đang đăng nhập. |
| POST | `/api/survey/sessions/:sessionId/complete` | STAFF+ | Body: `{giftId}` (bắt buộc), giống luồng public. |

## 4. Cấu trúc body câu trả lời (dùng chung cho cả 2 luồng)

```json
{
  "q1": { "productGroupIds": ["rice-id", "oil-id"], "exclusive": false },
  "q2": { "productGroupIds": ["rice-id"], "exclusive": false },
  "q3": {
    "rice-id": { "factors": ["PRICE", "PACKAGE_SIZE"] }
  },
  "q4": {
    "rice-id": {
      "PRICE": { "optionKey": "LOWER_5_10" },
      "PACKAGE_SIZE": { "optionKeys": ["5KG", "10KG"] }
    }
  }
}
```
Backend validate: mọi `productGroupId` ở `q2` phải có trong `q1`; mọi key ở `q3` phải có trong `q2`; mọi (group, factor) ở `q4` phải có trong `q3` (trừ factor `NONE`/`OTHER` không có khối 4 tương ứng).

## 5. Quản trị Shop / Region / User

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET/POST | `/api/regions` | ADMIN | CRUD khu vực |
| GET/POST/PATCH | `/api/shops` | ADMIN (toàn bộ) / REGION_MANAGER (đọc trong khu vực) | CRUD siêu thị |
| GET/POST/PATCH | `/api/users` | ADMIN | CRUD người dùng + gán role/scope |

## 6. QR

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/qr/check-shop` | SHOP_MANAGER+ | Body `{shopCode}` → kiểm tra tồn tại + quyền, trả thông tin shop. |
| POST | `/api/qr` | SHOP_MANAGER+ (trong phạm vi) | Tạo QR mới cho shop (tự revoke QR active cũ của shop đó). |
| PATCH | `/api/qr/:id/revoke` | SHOP_MANAGER+ | Vô hiệu hoá QR. |
| GET | `/api/qr/:id/export?format=png|svg|poster` | SHOP_MANAGER+ | Trả file. |
| GET | `/api/qr` | SHOP_MANAGER+ | Danh sách QR trong phạm vi quyền. |

## 7. Chiến dịch

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET/POST/PATCH | `/api/campaigns` | ADMIN | CRUD chiến dịch; chỉ 1 campaign `isActive=true` cùng lúc (set active mới → tự tắt active cũ). |

## 8. Bộ câu hỏi & danh mục

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/questions` | ADMIN | Danh sách `question_key` + version hiện tại + lịch sử. |
| POST | `/api/questions/:questionKey/versions` | ADMIN | Tạo version mới (label + options), set active, giữ version cũ cho dữ liệu lịch sử. |
| GET/POST/PATCH | `/api/catalog/brands` | ADMIN | CRUD nhãn hiệu theo nhóm hàng. |
| GET/POST/PATCH | `/api/catalog/package-sizes` | ADMIN | CRUD quy cách. |
| GET/POST/PATCH | `/api/catalog/product-types` | ADMIN | CRUD loại sản phẩm. |
| GET/POST/PATCH | `/api/catalog/gifts` | ADMIN | CRUD danh mục quà tặng (thêm 2026-11-06) — `{name, packageInfo, priceVnd, note?, imageUrl, displayOrder, isActive}`. Chưa có UI admin tương ứng trên web, chỉ có API. |

## 9. Analytics / Dashboard

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/analytics/shop/:shopId/summary` | SHOP_MANAGER+ (phạm vi) | Số liệu Phần IX mục 12. |
| GET | `/api/analytics/region/:regionId/summary` | REGION_MANAGER+ (phạm vi) | Số liệu Phần IX mục 13. |
| GET | `/api/analytics/system/summary` | ADMIN | Số liệu Phần IX mục 14, nhận query filter: `from,to,regionId,shopId,productGroupId,source,campaignId`. |
| GET | `/api/analytics/export?scope=shop|region|system&format=csv|xlsx` | theo scope | Xuất dữ liệu đã lọc. |

Mọi response analytics kèm `sampleSize` cho từng số liệu/biểu đồ.

## 10. Cơ hội cải thiện

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/action-items` | SHOP_MANAGER+ (phạm vi) | Lọc theo status/priority/shop/region. |
| PATCH | `/api/action-items/:id` | REGION_MANAGER+ | Cập nhật `status`, `notes`. |

Job định kỳ (hoặc endpoint `POST /api/action-items/recompute`, ADMIN-only) tổng hợp lại `request_count`/`request_ratio`/`priority` từ dữ liệu khảo sát — không tự suy luận doanh thu.

## 11. Audit

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/audit-logs` | ADMIN | Xem lịch sử truy cập dữ liệu nhạy cảm, lọc theo user/action/thời gian. |

Mọi lần đọc PII (ví dụ xem chi tiết respondent) phải tự động ghi `audit_logs` ở backend, không cần FE gọi riêng.


## 12. Quản trị & báo cáo (ADMIN, thêm 2026-11-06)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/admin/report-filters` | Danh sách QLTP + chiến dịch cho bộ lọc |
| GET | `/api/admin/reports/summary?from&to&regionId&shopCode&source&campaignId` | Tổng hợp báo cáo (kèm cơ hội cải thiện, theo QLTP, theo ngày, quà đã chọn) |
| GET | `/api/admin/reports/sessions?...&page&pageSize` | Danh sách phản hồi (có tên khách + 4 số cuối SĐT → ghi `audit_logs`) |
| GET | `/api/admin/reports/sessions/:id` | Chi tiết một phản hồi (ghi `audit_logs`) |
| GET | `/api/admin/reports/export.csv?...` | CSV theo bộ lọc, không chứa tên/SĐT khách (ghi `audit_logs`) |
| GET | `/api/questions` | Phiên bản hiện tại + lịch sử của 8 câu hỏi |
| POST | `/api/questions/:questionKey/versions` | Tạo phiên bản mới `{labelText, options[]}`; câu có đáp án cố định chỉ được đổi chữ |
| PATCH | `/api/catalog/product-groups/:id` | Đổi tên nhóm hàng |
