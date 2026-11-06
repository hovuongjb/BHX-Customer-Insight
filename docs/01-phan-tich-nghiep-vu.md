# 01. Phân tích nghiệp vụ — BHX Customer Insight

## 1. Bối cảnh & mục tiêu

BHX muốn tăng tỷ lệ khách hàng chọn mua tại BHX cho 4 nhóm hàng thiết yếu: **Gạo, Mì ăn liền, Dầu ăn, Nước mắm** — những nhóm khách hàng hiện vẫn thường mua ở nơi khác dù hay đến BHX.

BHX chỉ chủ động thay đổi được 5 yếu tố: **Giá bán, Khuyến mãi, Nhãn hiệu, Dung tích/quy cách, Loại sản phẩm**. Khảo sát chỉ xoay quanh 5 yếu tố này.

**Câu hỏi cốt lõi:** "BHX cần thay đổi điều gì để khách đang mua Gạo–Mì–Dầu–Mắm ở nơi khác chuyển sang mua tại BHX?"

**Giới hạn diễn giải dữ liệu (bắt buộc tuân thủ ở mọi tầng — UI, dashboard, báo cáo xuất):**
- Mẫu khảo sát chỉ gồm khách đã đến BHX hoặc quét QR tại BHX → không đại diện cho toàn bộ dân cư/thị trường.
- Không gọi tỷ lệ khảo sát là "thị phần thị trường thực tế".
- Không suy luận doanh thu tăng thêm nếu chưa có dữ liệu bán hàng thực tế đối chiếu.
- Với câu hỏi multi-select, tổng tỷ lệ % có thể vượt 100% — mọi biểu đồ phải hiển thị rõ mẫu số (N) và cách tính.

## 2. Ba phân hệ

### Phân hệ A — Khảo sát khách hàng
Hai phương thức thu thập, **dùng chung bộ câu hỏi và cấu trúc dữ liệu**, phân biệt bằng trường `source`:

| | Phương thức 1: Nhân viên khảo sát trực tiếp | Phương thức 2: Khách tự khảo sát qua QR |
|---|---|---|
| Người thực hiện | Nhân viên (đã đăng nhập) | Khách hàng (không tài khoản) |
| Xác định shop | Theo shop gán cho nhân viên đăng nhập | Theo `qr_token` trong URL |
| Thu thập PII khách | Không | Có: họ tên + SĐT (bắt buộc) |
| Đồng ý xử lý dữ liệu | Không áp dụng | Bắt buộc, chủ động tick |
| `source` | `STAFF` | `QR` |

### Phân hệ B — Dashboard phân tích
- Dashboard theo shop.
- Dashboard theo khu vực (so sánh các shop).
- Dashboard toàn hệ thống (xu hướng, xếp hạng, bộ lọc: thời gian/khu vực/shop/nhóm hàng/nguồn/chiến dịch).
- Xuất dữ liệu (Excel/CSV).

### Phân hệ C — Quản trị
Quản lý: shop, khu vực, user & phân quyền, mã QR, chiến dịch khảo sát, bộ câu hỏi (versioned), danh mục (nhãn hiệu / dung tích/quy cách / loại sản phẩm), cơ hội cải thiện (action items).

## 3. QR & Shop — quy tắc nghiệp vụ

1. Người có quyền (SHOP_MANAGER cho shop của mình, hoặc ADMIN/REGION_MANAGER) nhập mã shop → hệ thống kiểm tra tồn tại và phạm vi quyền → hiển thị tên + khu vực → xác nhận → tạo QR.
2. Từ chối tạo QR nếu: mã shop không tồn tại, hoặc shop ngoài phạm vi phân quyền người tạo.
3. `qr_token` là chuỗi ngẫu nhiên (không tuần tự, không suy đoán được, không chứa PII). URL dạng `/s/{qr_token}`.
4. Backend luôn xác định `shop_id` từ `qr_token` tra trong DB — **không bao giờ** nhận `shop_id` từ dữ liệu client gửi lên để quyết định nơi lưu kết quả khảo sát.
5. Mỗi shop có một QR "cố định" đang active tại một thời điểm; có thể vô hiệu hóa (revoke) và phát hành QR mới (token mới) — khi đó QR cũ không còn dùng được.
6. QR có thể gắn với chiến dịch (`campaign`) đang active. Khi chiến dịch đổi, QR cố định (token) vẫn hoạt động; hệ thống ghi nhận `campaign_id` áp dụng **tại thời điểm khách bắt đầu session khảo sát**, không phải tại thời điểm tạo QR.
7. Xuất được PNG/SVG và poster A4 (gồm logo, tên shop, QR, khẩu hiệu).

## 4. Bộ 4 câu hỏi khảo sát (đầy đủ)

Nguyên tắc chung:
- Chỉ 4 câu hỏi nghiệp vụ chính; không nhập chữ/số trong câu trả lời (chọn từ danh sách có sẵn).
- Phân nhánh tự động — chỉ hiển thị đáp án/câu hỏi phù hợp với lựa chọn trước.
- Cho quay lại sửa đáp án; khi sửa câu trước, **tự động xoá các câu trả lời phụ thuộc không còn hợp lệ** (ví dụ: bỏ chọn "Gạo" ở câu 1 → xoá toàn bộ câu 2/3/4 liên quan đến Gạo).
- Danh mục nhãn hiệu / dung tích / loại sản phẩm phải lấy từ DB (bảng cấu hình), không hardcode UI.
- Thiết kế một tay trên điện thoại; không hiển thị quá nhiều đáp án cùng lúc; có thanh tiến trình, nút quay lại/tiếp tục; tự cuộn lên đầu khi chuyển câu.

### Câu 1 — Nhóm hàng mua bên ngoài
> "Trong 4 nhóm hàng sau, nhóm nào anh/chị thường mua ở nơi khác thay vì BHX?"

Checkbox (multi-select):
- Gạo / Mì ăn liền / Dầu ăn / Nước mắm
- **Không có – tôi thường mua cả 4 nhóm tại BHX** (độc quyền)

Quy tắc: chọn "Không có" → kết thúc khảo sát ngay (trạng thái `COMPLETED`, không cải thiện gì được ghi nhận). Chọn ≥1 nhóm hàng → sang câu 2 với đúng các nhóm đã chọn.

### Câu 2 — Nhóm hàng muốn BHX cải thiện
> "Trong những nhóm hàng vừa chọn, anh/chị muốn BHX cải thiện nhóm nào để chuyển sang mua tại đây?"

Chỉ hiển thị các nhóm đã chọn ở câu 1, cộng thêm:
- **Chưa muốn chuyển nhóm nào** (độc quyền → kết thúc khảo sát)

### Câu 3 — Yếu tố BHX cần thay đổi (lặp theo từng nhóm hàng đã chọn ở câu 2)
> "BHX cần thay đổi những điều gì để anh/chị chuyển sang mua nhóm hàng này tại BHX?"

Với **mỗi** nhóm hàng ở câu 2, hiển thị riêng (multi-select):
- Giá bán tốt hơn
- Khuyến mãi hấp dẫn hơn
- Có nhãn hiệu quen dùng
- Có dung tích/quy cách phù hợp
- Có đúng loại sản phẩm cần mua
- Yếu tố khác
- **Không có thay đổi nào khiến tôi chuyển sang BHX** (độc quyền trong nhóm hàng đó)

Dữ liệu lưu riêng theo từng nhóm hàng (ví dụ Gạo: [Giá, Dung tích]; Dầu ăn: [Nhãn hiệu, Khuyến mãi]).

### Câu 4 — Mong muốn cụ thể (phân nhánh theo nhóm hàng × yếu tố đã chọn ở câu 3)

**4A. Giá bán** (chọn một)
> "Giá tại BHX cần như thế nào so với nơi anh/chị đang mua?"
- Bằng giá nơi đang mua / Thấp hơn dưới 5% / Thấp hơn 5–10% / Thấp hơn trên 10% / Không rõ

**4B. Khuyến mãi** (chọn nhiều)
> "Anh/chị thích hình thức khuyến mãi nào?"
- Giảm giá trực tiếp / Mua nhiều giảm giá / Mua hàng tặng hàng / Tặng voucher / Tích điểm đổi quà

**4C. Nhãn hiệu** (chọn nhiều, trừ lựa chọn độc quyền) — Top 5 theo nhóm hàng, **cấu hình từ DB**, kèm 2 lựa chọn cố định: "Nhãn hiệu khác", "Không quan trọng nhãn hiệu" (độc quyền).

Danh sách khởi tạo (seed, không phải bảng xếp hạng thị phần chính thức):
| Gạo | Mì ăn liền | Dầu ăn | Nước mắm |
|---|---|---|---|
| A An | Hảo Hảo | Neptune | Nam Ngư |
| Vua Gạo | Omachi | Simply | CHIN-SU |
| Lộc Trời | 3 Miền | Tường An | Đệ Nhị |
| Ông Cua | Kokomi | Meizan | Liên Thành |
| Cỏ May | Cung Đình | Cái Lân | Hạnh Phúc |

**4D. Dung tích/quy cách** (chọn nhiều)
> "Gói/chai/bao có quy cách nào phù hợp với anh/chị?"
| Gạo | Mì ăn liền | Dầu ăn | Nước mắm |
|---|---|---|---|
| 2kg | Gói lẻ | 400–500ml | 500ml |
| 5kg | Lốc | 1 lít | 750–900ml |
| 10kg | Thùng | 2 lít | 1 lít |
| 25kg | Ly/tô | 5 lít | Trên 1 lít |
| Khác | Khác | Khác | Khác |

**4E. Loại sản phẩm** (chọn nhiều)
> "Anh/chị muốn BHX có thêm loại sản phẩm nào?"
| Gạo | Mì ăn liền | Dầu ăn | Nước mắm |
|---|---|---|---|
| Gạo dẻo thơm | Mì tôm chua cay | Dầu đậu nành | Nước mắm truyền thống |
| Gạo mềm | Mì không cay | Dầu hướng dương | Nước mắm pha chế |
| Gạo khô/xốp | Mì trộn | Dầu gạo | Nước mắm độ đạm cao |
| Gạo lứt | Mì khoai tây | Dầu ô liu | Nước mắm ít mặn |
| Gạo cao cấp | Mì ly/tô | Dầu thực vật pha trộn | Nước mắm phổ thông giá tốt |
| Gạo giá tiết kiệm | Mì cao cấp | | |

Tất cả danh sách đáp án ở 4C/4D/4E phải quản trị được (CRUD qua Admin), không sửa code để đổi.

### 4.1. Chọn quà tặng (thêm 2026-11-06)

Sau khi trả lời xong Câu 1–4 (hoặc kết thúc sớm do chọn lựa chọn độc quyền ở Câu 1/2), hệ thống hiện màn hình **chọn 1 quà tặng cảm ơn** trong danh mục quà (`gifts`, quản trị qua DB/API, không hardcode). Áp dụng cho cả hai nguồn khảo sát (QR và nhân viên). Khảo sát chỉ thực sự `COMPLETED` sau khi đã chọn quà — không có bước chọn quà thì chưa tính là hoàn tất.

## 5. Chống khảo sát trùng

- Mặc định: một SĐT (đã chuẩn hóa theo định dạng VN) chỉ tính **một khảo sát hợp lệ** / shop / campaign.
- Chính sách phải cấu hình được (ví dụ có thể đổi phạm vi trùng theo campaign thay vì shop+campaign).
- Không xoá khảo sát trùng — lưu lại, gắn cờ `is_duplicate`.
- Hiển thị thông báo rõ cho khách khi phát hiện đã khảo sát rồi.
- Không dùng IP làm tiêu chí duy nhất để chặn.
- SĐT chưa xác thực OTP không được coi là danh tính đã xác minh (chỉ dùng để chống trùng tương đối, không dùng để khẳng định nhân thân).

## 6. Phân quyền (RBAC)

| Role | Phạm vi |
|---|---|
| ADMIN | Toàn quyền hệ thống |
| REGION_MANAGER | Xem/quản lý dữ liệu trong khu vực được giao |
| SHOP_MANAGER | Xem dữ liệu shop được giao, tạo QR cho shop đó, theo dõi khảo sát |
| STAFF | Thực hiện khảo sát trực tiếp; không xem PII khách ngoài phạm vi cần thiết |
| CUSTOMER | Không tài khoản; chỉ truy cập trang khảo sát qua QR hợp lệ |

Toàn bộ kiểm tra quyền thực hiện ở backend (middleware), không chỉ ẩn/hiện ở UI.

## 7. Cấu hình & versioning khảo sát

- Admin chỉnh được: nội dung câu hỏi, bật/tắt câu hỏi, danh sách đáp án, Top 5 nhãn hiệu, quy cách, loại sản phẩm — theo khu vực/shop nếu cần.
- Mỗi lần thay đổi cấu hình câu hỏi tạo một **version** mới (`survey_question_configs.version`); câu trả lời cũ giữ nguyên gắn với version đã dùng tại thời điểm trả lời — đổi danh mục không làm sai lệch dữ liệu lịch sử.

## 8. User stories (tóm tắt theo role)

**CUSTOMER (qua QR)**
- Quét QR thấy đúng tên/mã shop.
- Nhập họ tên + SĐT hợp lệ (kèm thông báo ngắn "BHX xin thông tin để gửi quà cảm ơn" — xem cập nhật 2026-11-06 ở `CLAUDE.md` §7, không còn khối thông báo quyền riêng tư đầy đủ/checkbox đồng ý riêng), thực hiện khảo sát 4 câu, có thể quay lại sửa câu trước.
- Nếu mua cả 4 nhóm tại BHX hoặc không muốn cải thiện gì → khảo sát kết thúc sớm, vẫn thấy màn hình cảm ơn.
- Nếu đã khảo sát rồi (trùng SĐT/shop/campaign) → được báo rõ, không bị khảo sát lại vô ích.

**STAFF**
- Đăng nhập, hệ thống tự biết shop của mình, thực hiện khảo sát nhanh không cần hỏi tên/SĐT khách.

**SHOP_MANAGER**
- Tạo/vô hiệu hoá QR cho shop mình quản lý, xem dashboard shop, theo dõi số lượt khảo sát theo nguồn.

**REGION_MANAGER**
- So sánh các shop trong khu vực, xem xếp hạng nhu cầu cải thiện theo khu vực.

**ADMIN**
- Quản lý user/phân quyền/shop/khu vực/chiến dịch/danh mục, xem dashboard toàn hệ thống, duyệt trạng thái các cơ hội cải thiện (action items), xuất báo cáo.
