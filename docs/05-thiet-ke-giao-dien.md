# 05. Thiết kế giao diện — BHX Customer Insight

## 1. Sitemap

```
Public (không cần đăng nhập)
  /                              Lấy mã QR theo mã siêu thị (tra cứu QR đã có, không tạo mới)
  /lay-qr                        Alias của "/"
  /s/:token                      Khảo sát khách qua QR (toàn bộ flow 1 route, nhiều step)
  /s/:token/thank-you            Màn hình cảm ơn

Nội bộ (cần đăng nhập)
  /login                         Đăng nhập
  /app/survey                    Khảo sát nhân viên trực tiếp
  /app/dashboard/shop            Dashboard shop
  /app/dashboard/region          Dashboard khu vực
  /app/dashboard/system          Dashboard toàn hệ thống
  /app/dashboard/opportunities   Cơ hội cải thiện (action items)
  /admin                         Trang quản trị (chỉ ADMIN) — mặc định vào Báo cáo
  /admin/reports                 Báo cáo kết quả: bộ lọc (ngày/QLTP/shop/nguồn/chiến dịch), cơ hội cải thiện, biểu đồ, so sánh QLTP, xuất CSV
  /admin/sessions                Danh sách phản hồi + xem chi tiết từng bài làm (ghi audit log)
  /admin/questions               Sửa nội dung câu hỏi/đáp án (tạo phiên bản mới), tên nhóm hàng, nhãn hiệu/quy cách/loại sản phẩm
  /app/admin/shops               Quản lý siêu thị
  /app/admin/regions             Quản lý khu vực
  /app/admin/users               Quản lý người dùng
  /app/admin/qr                  Tạo & quản lý mã QR
  /app/admin/campaigns           Quản lý chiến dịch
  /app/admin/questions           Quản lý bộ câu hỏi (versioned)
  /app/admin/catalog             Quản lý nhãn hiệu / quy cách / loại sản phẩm
```

Điều hướng theo role: STAFF chỉ thấy `/app/survey`; SHOP_MANAGER thấy survey + dashboard shop + QR (phạm vi shop mình); REGION_MANAGER thêm dashboard khu vực; ADMIN thấy toàn bộ menu admin.

## 2. Mô tả màn hình chính (mobile-first — layout mô tả cho khung 375–414px, desktop chỉ mở rộng khoảng trống)

### 2.1. Màn hình chào mừng (`/s/:token`)
- Header: logo BHX, tên "BHX" màu xanh lá/vàng.
- Tiêu đề: "KHẢO SÁT Ý KIẾN KHÁCH HÀNG".
- Khẩu hiệu in nghiêng nhỏ dưới tiêu đề.
- Đoạn text ngắn giải thích mục đích (nguyên văn Phần IV mục 7).
- Badge hiển thị tên siêu thị + mã siêu thị.
- Nút lớn full-width: "BẮT ĐẦU KHẢO SÁT".

### 2.2. Form thông tin (cập nhật 2026-11-06 — xem CLAUDE.md §7)
- Một dòng thông báo ngắn: "BHX xin phép thu thập họ tên và số điện thoại để gửi phần quà cảm ơn sau khi anh/chị hoàn thành khảo sát."
- Input "Họ và tên" (text, bắt buộc).
- Input "Số điện thoại" (tel, bắt buộc, validate định dạng VN khi blur).
- Không còn khối thông báo quyền riêng tư đầy đủ hay checkbox đồng ý riêng.
- Nút "Tiếp tục" enable khi họ tên + SĐT hợp lệ.

### 2.3. Màn hình câu hỏi (dùng chung layout cho Câu 1/2/3/4)
- Thanh tiến trình trên cùng (ví dụ "Câu 2/4" hoặc theo số bước thực tế do phân nhánh).
- Tiêu đề câu hỏi rõ, cỡ chữ lớn.
- Với Câu 3/4 đang xử lý theo từng nhóm hàng: hiển thị thêm sub-header tên nhóm hàng (ví dụ "Gạo — yếu tố cần thay đổi") để khách biết đang ở khối nào.
- Đáp án dạng "thẻ" (card) có icon/checkbox, trạng thái đã chọn đổi màu nền + viền xanh lá.
- Lựa chọn độc quyền (vd "Không có…") có đường phân cách hoặc style khác để phân biệt với nhóm lựa chọn thường.
- Footer cố định: nút "Quay lại" (trái, outline) + nút "Tiếp tục" (phải, primary, disabled khi chưa chọn gì).
- Tự động cuộn lên đầu khi chuyển sang câu/khối mới.

### 2.3b. Chọn quà tặng (thêm 2026-11-06)
- Hiện ngay sau khi trả lời xong Câu 1–4 (hoặc kết thúc sớm), trước màn hình cảm ơn.
- Lưới thẻ quà 2 cột: ảnh sản phẩm, tên, quy cách, giá, ghi chú khuyến mãi nếu có.
- Chọn đúng 1 (click lại để đổi lựa chọn, không cho bỏ chọn hết).
- Nút "Hoàn tất" (thay cho "Tiếp tục") chỉ enable khi đã chọn quà — bấm mới thực sự gửi khảo sát lên server.
- Danh mục quà lấy từ DB (`gifts`), không hardcode trong giao diện. **Chưa có màn hình quản trị CRUD quà trên web** — hiện chỉ quản lý qua seed/API (`/api/catalog/gifts`), cần bổ sung UI admin ở Giai đoạn 3 nếu cần đổi danh mục thường xuyên.

### 2.4. Màn hình cảm ơn
- Icon check lớn, màu xanh lá.
- Text cảm ơn (nguyên văn Phần VI).
- Không có nút điều hướng tiếp (kết thúc phiên).

### 2.5. Khảo sát nhân viên (`/app/survey`)
- Giống layout câu hỏi ở trên nhưng không có bước nhập PII; header hiển thị tên shop hiện tại của nhân viên (không cho đổi).

### 2.6. Tạo mã QR khảo sát (`/app/admin/qr`)
- Ô nhập mã siêu thị + nút "Kiểm tra siêu thị".
- Kết quả kiểm tra: tên siêu thị + khu vực (hoặc thông báo lỗi "Mã siêu thị không tồn tại").
- Nút "Tạo mã QR" (chỉ hiện sau khi kiểm tra hợp lệ).
- Sau khi tạo: hiển thị ảnh QR, nút "Tải PNG", "Tải SVG", "In poster A4", "Sao chép liên kết".
- Danh sách QR đã tạo của các shop trong quyền, có trạng thái Active/Revoked, nút "Vô hiệu hoá" / "Phát hành QR mới".

### 2.7. Dashboard shop/khu vực/hệ thống
- Thanh bộ lọc trên cùng: Thời gian, Khu vực, Shop, Nhóm hàng, Nguồn khảo sát, Chiến dịch (ẩn bộ lọc không áp dụng theo role/màn hình).
- Dải thẻ số liệu tổng quan (tổng khảo sát, hợp lệ, QR/STAFF, tỷ lệ hoàn tất…).
- Biểu đồ cột/tròn cho: tỷ lệ mua ngoài theo nhóm hàng, top yếu tố cần thay đổi, top nhãn hiệu/quy cách/loại sản phẩm được yêu cầu.
- Mọi biểu đồ đa lựa chọn hiển thị chú thích nhỏ: "N = số khảo sát hợp lệ, có thể chọn nhiều nên tổng > 100%".
- Dashboard khu vực/hệ thống có thêm bảng so sánh giữa các shop/khu vực và biểu đồ xu hướng theo thời gian.

### 2.8. Cơ hội cải thiện (`/app/dashboard/opportunities`)
- Bảng/list card mỗi dòng: Khu vực, Siêu thị, Nhóm hàng, Yếu tố, Mong muốn cụ thể (tổng hợp), Số lượt/% yêu cầu, Mức ưu tiên, Trạng thái (dropdown 6 trạng thái), ghi chú (textarea), người cập nhật.
- Lọc theo trạng thái/mức ưu tiên/shop/khu vực.

### 2.9. Quản trị (shops/regions/users/campaigns/questions/catalog)
- Dạng danh sách (table) + form tạo/sửa (modal hoặc trang riêng) theo mẫu CRUD tiêu chuẩn.
- Trang `questions`: chọn `question_key`, xem version hiện tại + lịch sử version, tạo version mới (không sửa đè version cũ).
- Trang `catalog`: 3 tab (Nhãn hiệu / Quy cách / Loại sản phẩm), lọc theo nhóm hàng, kéo-thả hoặc nhập số để đổi `display_order`.

## 3. Nguyên tắc UI chung

- Màu chủ đạo: xanh lá BHX (primary), vàng (accent/CTA phụ), trắng (nền). Không lạm dụng hiệu ứng chuyển động.
- Nút hành động chính luôn full-width trên mobile, cỡ chữ ≥16px để tránh zoom tự động trên iOS.
- Không hiển thị quá 6–8 đáp án cùng lúc trên một màn — nếu danh sách dài (vd loại sản phẩm), cho cuộn trong khối, không nhồi tất cả ngoài màn hình.
- Toàn bộ text giao diện khách hàng bằng tiếng Việt, giọng văn lịch sự, ngắn gọn.
