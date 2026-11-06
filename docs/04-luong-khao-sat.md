# 04. Luồng khảo sát — BHX Customer Insight

## 1. Luồng tạo QR (SHOP_MANAGER / ADMIN / REGION_MANAGER)

```
Nhập mã siêu thị
      │
      ▼
[Kiểm tra siêu thị] ──► Không tồn tại ──► Hiển thị lỗi, dừng
      │ Hợp lệ
      ▼
Hiển thị tên + khu vực siêu thị
      │
      ▼
Kiểm tra phạm vi quyền của người tạo
      │ Ngoài quyền ──► Từ chối, hiển thị lỗi
      │ Trong quyền
      ▼
Xác nhận tạo QR
      │
      ▼
Hệ thống sinh token ngẫu nhiên, lưu shop_qr_codes
(nếu shop đã có QR active khác → tự revoke QR cũ)
      │
      ▼
Hiển thị QR + nút: Tải PNG/SVG, In poster A4, Sao chép liên kết
```

## 2. Luồng khách tự khảo sát qua QR

```
Quét QR → mở /s/{token}
      │
      ▼
GET /api/public/qr/:token
      │
      ├─ Token không hợp lệ/đã revoke ──► Màn hình lỗi, dừng
      │
      ▼ Hợp lệ
Màn hình chào mừng: tên + mã shop, khẩu hiệu, lý do khảo sát
      │
      ▼
Form: Họ tên + SĐT + dòng thông báo ngắn "BHX xin thông tin để gửi quà cảm ơn sau khảo sát"
(cập nhật 2026-11-06: không còn khối thông báo quyền riêng tư đầy đủ / checkbox đồng ý riêng —
tiếp tục điền form coi như đồng ý; xem ghi chú rủi ro pháp lý ở CLAUDE.md §7)
      │
      ├─ SĐT sai định dạng VN ──► Báo lỗi inline, không cho tiếp tục
      │
      ▼ Hợp lệ
POST /api/public/sessions (tạo respondent + consent[given=true, tự động] + session)
      │
      ├─ Phát hiện trùng (SĐT+shop+campaign) ──► Thông báo "đã khảo sát", đánh dấu is_duplicate,
      │                                           vẫn cho tiếp tục theo chính sách hiện hành (ghi nhận, không tính hợp lệ)
      ▼
┌──────────────── Câu 1 ────────────────┐
│ Chọn nhóm hàng mua bên ngoài            │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴────────┐
   Chọn "Không có"    Chọn ≥1 nhóm hàng
        │                    │
        ▼                    ▼
  Chọn quà tặng          ┌──────────────── Câu 2 ────────────────┐
        │                │ Chỉ hiện nhóm đã chọn ở câu 1 + "Chưa  │
        │                │ muốn chuyển nhóm nào"                  │
        │                └───────────────┬─────────────────────────┘
        │                        ┌────────┴─────────┐
        │             Chọn "Chưa muốn..."     Chọn ≥1 nhóm hàng
        │                        │                    │
        │                        ▼                    ▼
        │                  Chọn quà tặng      Câu 3 — lặp cho từng nhóm đã chọn ở câu 2
        │                        │                    │
        │                        │            Với mỗi nhóm: chọn yếu tố cần thay đổi
        │                        │            ("Không có thay đổi nào" độc quyền trong nhóm đó)
        │                        │                    │
        │                        │                    ▼
        │                        │            Câu 4 — với mỗi (nhóm × yếu tố ≠ NONE) đã chọn ở câu 3:
        │                        │            hiển thị đúng khối 4A/4B/4C/4D/4E tương ứng
        │                        │                    │
        │                        │                    ▼
        │                        └──────────────  Chọn quà tặng (chọn đúng 1 quà, thêm 2026-11-06)
        ▼                                             │
        └─────────────────────────┬───────────────────┘
                                   ▼
                    Hoàn tất → PATCH câu trả lời (nếu có) + POST complete kèm giftId
                                   │
                                   ▼
                          Màn hình cảm ơn (status=COMPLETED)
```

Nếu khách thoát giữa khảo sát (đóng tab/mất mạng) → `survey_sessions.status` giữ `IN_PROGRESS`; job định kỳ (hoặc truy vấn dashboard) có thể đánh dấu `ABANDONED` sau một khoảng thời gian không hoạt động (ví dụ 30 phút) — xem `08-tieu-chi-nghiem-thu.md` test case #17/#19.

## 3. Luồng nhân viên khảo sát trực tiếp

```
Đăng nhập (email/password)
      │
      ▼
Hệ thống xác định shop_id từ user đang đăng nhập
      │
      ▼
Vào /app/survey → bắt đầu session mới (source=STAFF, respondent_id=NULL, staff_user_id=user hiện tại)
      │
      ▼
Câu 1 → Câu 2 → Câu 3 → Câu 4 (logic phân nhánh giống luồng QR,
chỉ khác: không có bước nhập PII/đồng ý ở đầu)
      │
      ▼
Chọn quà tặng (chọn đúng 1 quà, giống luồng QR)
      │
      ▼
Hoàn tất → status=COMPLETED
```

Lưu ý: luồng STAFF **không áp dụng chống trùng theo SĐT** (vì không thu thập PII khách ở luồng này) — mỗi lượt khảo sát của nhân viên được tính là một lượt hợp lệ riêng; không có cơ chế chặn nhân viên nhập nhiều lượt liên tiếp trong Pilot (ghi nhận là giả định, có thể bổ sung giám sát định kỳ qua `audit_logs`/dashboard nếu phát hiện bất thường).

## 4. Quy tắc sửa câu trả lời (quay lại)

Khi khách/nhân viên bấm "Quay lại" và đổi đáp án ở một câu, hệ thống phải:

1. Giữ nguyên các đáp án **không phụ thuộc** vào lựa chọn vừa đổi.
2. Xoá các đáp án **phụ thuộc không còn hợp lệ**:
   - Bỏ chọn nhóm hàng X ở Câu 1 → xoá toàn bộ Câu 2/3/4 liên quan đến nhóm X.
   - Bỏ chọn nhóm hàng X ở Câu 2 (nhưng X vẫn còn ở Câu 1) → xoá toàn bộ Câu 3/4 liên quan đến nhóm X, Câu 1 giữ nguyên.
   - Bỏ chọn yếu tố Y của nhóm X ở Câu 3 → xoá khối Câu 4 tương ứng (X, Y).
3. Tính toán lại danh sách câu/khối cần hiển thị tiếp theo dựa trên state hiện tại (không dựa vào lịch sử đã xoá).

Implement ở FE (state machine) khi khảo sát chưa submit cuối, và validate lại ở BE khi nhận submit cuối cùng (BE là nguồn sự thật — từ chối nếu dữ liệu gửi lên vi phạm quan hệ phân nhánh so với version câu hỏi đang dùng).

## 5. Xử lý đồng thời & mất mạng

- Hai khách khảo sát đồng thời tại cùng shop: mỗi session độc lập (uuid riêng), không có tài nguyên chia sẻ cần lock trừ kiểm tra trùng SĐT (dùng unique constraint ở DB level cho cặp active-trong-khung-thời-gian nếu cần, hoặc kiểm tra tại thời điểm submit cuối).
- Mất mạng khi gửi kết quả: FE phải giữ state khảo sát (ví dụ sessionStorage) và cho retry submit; BE submit cuối cùng nên **idempotent** theo `session_id` (gửi lại không tạo trùng bản ghi câu trả lời — dùng upsert theo unique constraint đã định nghĩa ở `03-thiet-ke-database.md`).
