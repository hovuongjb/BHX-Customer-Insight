# 00. Master Prompt gốc (nguyên văn, do người dùng cung cấp 2026-11-06)

> Lưu nguyên văn để đối chiếu khi cần. Các tài liệu 01–08 trong thư mục này là bản phân tích/thiết kế diễn giải từ nội dung dưới đây.

---

MASTER PROMPT – BHX CUSTOMER INSIGHT V2.0
XÂY DỰNG HỆ THỐNG KHẢO SÁT KHÁCH HÀNG & PHÂN TÍCH CƠ HỘI TĂNG THỊ PHẦN

## 1. VAI TRÒ CỦA BẠN
Bạn là một nhóm chuyên gia gồm:
* Senior Product Manager trong ngành bán lẻ FMCG.
* Chuyên gia nghiên cứu hành vi tiêu dùng Việt Nam.
* Senior UX/UI Designer chuyên thiết kế ứng dụng mobile-first.
* Senior Full-stack Engineer.
* Database Architect.
* Data Analyst & BI Engineer.
* Chuyên gia bảo mật và bảo vệ dữ liệu cá nhân.

Hãy xây dựng một ứng dụng web hoàn chỉnh, có thể triển khai thực tế, tên là: BHX CUSTOMER INSIGHT
Khẩu hiệu: "Lắng nghe khách hàng – Thay đổi để được lựa chọn."
Ứng dụng phải có giao diện tiếng Việt, đơn giản, hiện đại, dễ sử dụng trên điện thoại.
Không chỉ xây dựng mockup hoặc giao diện demo. Hãy viết phần mềm thực sự hoạt động, có backend, database, API, phân quyền, mã QR và dashboard.

## PHẦN I. BỐI CẢNH & MỤC TIÊU KINH DOANH

### 2. BỐI CẢNH
Bách Hóa Xanh muốn gia tăng tỷ lệ khách hàng lựa chọn mua 4 nhóm hàng thiết yếu: Gạo, Mì ăn liền, Dầu ăn, Nước mắm.

Đặc điểm thị trường:
* Đây là những nhóm hàng phổ biến trong tiêu dùng hộ gia đình Việt Nam.
* Khách hàng có thể thường xuyên đến BHX nhưng vẫn lựa chọn mua những nhóm hàng này ở nơi khác.
* BHX không có điều kiện khảo sát diện rộng bên ngoài siêu thị.
* Đối tượng khảo sát là khách hàng đang đến BHX hoặc khách được tiếp cận thông qua QR của siêu thị.
* Kết quả khảo sát cần giúp BHX đưa ra những thay đổi có thể thực hiện được.

BHX có thể tác động trực tiếp đến 5 yếu tố: Giá bán, Khuyến mãi, Nhãn hiệu, Dung tích/quy cách đóng gói, Loại sản phẩm.
Không khảo sát những nội dung không phục vụ trực tiếp cho 5 yếu tố trên.

### 3. MỤC TIÊU CỐT LÕI
Trả lời câu hỏi: "BHX cần thay đổi điều gì để khách hàng đang mua Gạo – Mì – Dầu – Mắm ở nơi khác chuyển sang lựa chọn mua tại BHX?"

Hệ thống phải xác định được: nhóm hàng khách đang mua bên ngoài; nhóm hàng khách muốn BHX cải thiện; những yếu tố BHX cần thay đổi; mong muốn cụ thể của khách hàng; mức độ phổ biến của từng yêu cầu; những hành động cần ưu tiên tại từng siêu thị, khu vực và toàn hệ thống.

Kết quả cuối cùng phải là danh sách cơ hội và hành động cải thiện, không chỉ là biểu đồ khảo sát.

Lưu ý quan trọng: Dữ liệu thu thập từ khách đến BHX hoặc quét QR không đại diện cho toàn bộ dân cư. Không được gọi tỷ lệ khảo sát là thị phần thị trường thực tế.

## PHẦN II. CẤU TRÚC HỆ THỐNG

### 4. BA PHÂN HỆ CHÍNH

**Phân hệ A – Khảo sát khách hàng**
Có 2 phương thức:

*Phương thức 1: Nhân viên khảo sát trực tiếp*
* Nhân viên đăng nhập hệ thống.
* Hệ thống tự xác định mã siêu thị.
* Nhân viên hỏi khách và chạm chọn câu trả lời.
* Không cần nhập họ tên hoặc số điện thoại.
* Kết quả tự động gắn với siêu thị.

*Phương thức 2: Khách tự khảo sát qua QR*
* Nhân viên hoặc quản lý nhập mã siêu thị.
* Hệ thống tạo QR riêng cho siêu thị.
* Khách quét QR bằng điện thoại.
* Trang khảo sát tự nhận diện siêu thị.
* Khách nhập họ tên và số điện thoại.
* Khách đồng ý thông báo xử lý dữ liệu cá nhân.
* Khách thực hiện khảo sát.
* Kết quả tự động lưu về đúng siêu thị.

Hai phương thức sử dụng chung bộ câu hỏi và cấu trúc dữ liệu, nhưng được phân biệt bằng nguồn khảo sát.

**Phân hệ B – Dashboard phân tích**
* Dashboard theo siêu thị. Dashboard theo khu vực. Dashboard toàn hệ thống.
* Phân tích nhóm hàng, yếu tố cải thiện và yêu cầu cụ thể.
* So sánh các siêu thị. Xuất dữ liệu.

**Phân hệ C – Quản trị**
* Quản lý siêu thị, khu vực, người dùng, mã QR, chiến dịch khảo sát, bộ câu hỏi, danh sách nhãn hiệu/dung tích/loại sản phẩm, quyền truy cập.

## PHẦN III. QUẢN LÝ SIÊU THỊ & MÃ QR

### 5. NHẬP MÃ SIÊU THỊ
Màn hình "TẠO MÃ QR KHẢO SÁT": ô nhập mã siêu thị, nút "Kiểm tra siêu thị", hiển thị tên/khu vực siêu thị, nút "Tạo mã QR", "Tải QR", "In poster", "Sao chép liên kết".

Quy trình: nhập mã → backend kiểm tra → hiển thị thông tin nếu hợp lệ → xác nhận → tạo QR → QR liên kết cố định với siêu thị.
Nếu mã không tồn tại, hiển thị thông báo rõ ràng. Không cho phép tạo QR cho mã siêu thị chưa đăng ký hoặc ngoài phạm vi phân quyền.

### 6. CƠ CHẾ QR
URL ví dụ: `https://survey.example.com/s/{qr_token}`. `qr_token` ngẫu nhiên khó đoán, không dùng số thứ tự tăng dần.
Backend phải xác định shop ID từ QR token. Không lấy shop ID từ dữ liệu khách tự gửi để quyết định siêu thị nhận kết quả.

Yêu cầu: mỗi siêu thị có QR cố định; có thể vô hiệu hoá; có thể phát hành QR mới; tải PNG/SVG; tạo poster A4; QR không chứa thông tin cá nhân; hoạt động Android/iPhone; hỗ trợ HTTPS; có thể gắn QR với chiến dịch khảo sát đang hoạt động; khi chuyển chiến dịch, QR cố định vẫn dùng được; hệ thống ghi nhận campaign ID tương ứng tại thời điểm khách bắt đầu khảo sát.

## PHẦN IV. GIAO DIỆN KHÁCH HÀNG

### 7. MÀN HÌNH CHÀO MỪNG
Sau khi quét QR, hiển thị: "BÁCH HÓA XANH — KHẢO SÁT Ý KIẾN KHÁCH HÀNG — Lắng nghe khách hàng – Thay đổi để được lựa chọn."
Nội dung: "BHX mong muốn cải thiện giá bán, khuyến mãi và sản phẩm để phục vụ anh/chị tốt hơn. Rất mong anh/chị dành ít phút chia sẻ ý kiến."
Hiển thị tên và mã siêu thị. Biểu mẫu: Họ và tên, Số điện thoại. Nút: "BẮT ĐẦU KHẢO SÁT".

Yêu cầu: họ tên/SĐT bắt buộc trong luồng QR; kiểm tra định dạng SĐT VN; không cần đăng ký tài khoản; không cần OTP trong phiên bản đầu; không yêu cầu nhập mã siêu thị; không yêu cầu nhập lại thông tin cá nhân trong quá trình khảo sát.

Phải có thông báo quyền riêng tư, mục đích thu thập, thời hạn lưu trữ, thông tin đơn vị xử lý dữ liệu và cách liên hệ yêu cầu xử lý dữ liệu. Khách phải chủ động đồng ý trước khi hệ thống thu thập thông tin. Không mặc định khách đồng ý nhận quảng cáo.

## PHẦN V. BỘ 4 CÂU HỎI KHẢO SÁT

### 8. NGUYÊN TẮC THIẾT KẾ
Chỉ có 4 câu hỏi nghiệp vụ chính; cho phép chọn nhiều đáp án; không nhập chữ/số trong phần câu hỏi; câu hỏi phân nhánh tự động, chỉ hiển thị đáp án phù hợp; không ép khách chọn một nhóm hàng/yếu tố duy nhất; cho phép quay lại sửa đáp án, khi sửa tự động xoá câu trả lời phụ thuộc không còn phù hợp; giao diện dễ dùng một tay trên điện thoại; mục tiêu khảo sát nhanh, thời gian thực tế phụ thuộc số nhóm/yếu tố được chọn.

**CÂU 1 – NHÓM HÀNG MUA BÊN NGOÀI**: "Trong 4 nhóm hàng sau, nhóm nào anh/chị thường mua ở nơi khác thay vì BHX?" Checkbox: Gạo / Mì ăn liền / Dầu ăn / Nước mắm / Không có – tôi thường mua cả 4 nhóm tại BHX. "Không có" độc quyền → kết thúc. Chọn nhóm hàng → sang câu 2.

**CÂU 2 – NHÓM HÀNG MUỐN BHX CẢI THIỆN**: "Trong những nhóm hàng vừa chọn, anh/chị muốn BHX cải thiện nhóm nào để chuyển sang mua tại đây?" Chỉ hiện nhóm đã chọn ở câu 1, chọn nhiều, thêm "Chưa muốn chuyển nhóm nào" → kết thúc nếu chọn.

**CÂU 3 – YẾU TỐ BHX CẦN THAY ĐỔI**: "BHX cần thay đổi những điều gì để anh/chị chuyển sang mua nhóm hàng này tại BHX?" Với mỗi nhóm hàng chọn ở câu 2: Giá bán tốt hơn / Khuyến mãi hấp dẫn hơn / Có nhãn hiệu quen dùng / Có dung tích/quy cách phù hợp / Có đúng loại sản phẩm cần mua / Yếu tố khác / Không có thay đổi nào khiến tôi chuyển sang BHX (độc quyền trong từng nhóm). Lưu dữ liệu riêng theo từng nhóm hàng.

**CÂU 4 – MONG MUỐN CỤ THỂ**: phân nhánh theo từng nhóm hàng và yếu tố được chọn.
- 4A. Giá bán (chọn một): Bằng giá nơi đang mua / Thấp hơn dưới 5% / Thấp hơn 5–10% / Thấp hơn trên 10% / Không rõ.
- 4B. Khuyến mãi (chọn nhiều): Giảm giá trực tiếp / Mua nhiều giảm giá / Mua hàng tặng hàng / Tặng voucher / Tích điểm đổi quà.
- 4C. Nhãn hiệu (5 nhãn hiệu/ngành hàng, xem chi tiết ở `01-phan-tich-nghiep-vu.md`) — danh sách khởi tạo, không phải bảng xếp hạng thị phần chính thức. Thêm "Nhãn hiệu khác"/"Không quan trọng nhãn hiệu". Cấu hình từ database, không hardcode.
- 4D. Dung tích/quy cách (chọn nhiều, theo nhóm hàng, xem chi tiết ở `01-phan-tich-nghiep-vu.md`).
- 4E. Loại sản phẩm (chọn nhiều, theo nhóm hàng, xem chi tiết ở `01-phan-tich-nghiep-vu.md`).

Tất cả đáp án phải quản trị được.

## PHẦN VI. TRẢI NGHIỆM KHẢO SÁT

### 9. UI/UX
Mobile-first; giao diện tiếng Việt; màu BHX; nút lớn; chữ dễ đọc; checkbox dạng thẻ có trạng thái đã chọn; thanh tiến trình; nút quay lại/tiếp tục; không hiển thị quá nhiều đáp án cùng lúc; tự cuộn lên đầu khi chuyển câu; có màn hình cảm ơn.
Câu 3/4: xử lý lần lượt từng nhóm hàng, tiêu đề nhóm hàng rõ ràng, chỉ hiển thị nội dung liên quan, không bỏ sót, không tạo quá nhiều trang không cần thiết.
Sau khi hoàn tất: "BHX cảm ơn anh/chị đã chia sẻ ý kiến. Chúng tôi sẽ nỗ lực cải thiện để phục vụ anh/chị tốt hơn."

## PHẦN VII. QUẢN LÝ DỮ LIỆU

### 10. DATABASE
PostgreSQL. Bảng tối thiểu: regions, shops, users, survey_campaigns, shop_qr_codes, survey_respondents, privacy_consents, survey_sessions, product_groups, brands, package_sizes, product_types, survey_question_configs, survey_option_configs, survey_group_choices, survey_change_factors, survey_detail_choices, action_items, audit_logs.

Yêu cầu: mỗi khảo sát ID duy nhất, gắn shop ID; phân biệt nguồn QR/nhân viên; lưu thời gian, phiên bản câu hỏi, toàn bộ lựa chọn, trạng thái hoàn thành; khóa ngoại/ràng buộc phù hợp; không cho một khảo sát ghi dữ liệu của shop khác.

PII: họ tên, SĐT chuẩn hoá, SĐT được bảo vệ khi lưu, hash có khóa chống trùng, trạng thái đồng ý. Không lưu SĐT trong URL/log.

## PHẦN VIII. KIỂM SOÁT TRÙNG

### 11. CHỐNG KHẢO SÁT TRÙNG
Mặc định: một SĐT chỉ tính một khảo sát hợp lệ tại một siêu thị trong một chiến dịch. Yêu cầu: chuẩn hoá SĐT VN; kiểm tra trùng theo shop+campaign; cấu hình được chính sách; không xoá khảo sát cũ; có thông báo khi đã khảo sát; phân biệt lượt trùng/hợp lệ; không dùng IP làm tiêu chí duy nhất; không coi SĐT chưa OTP là danh tính đã xác minh.

## PHẦN IX. DASHBOARD PHÂN TÍCH

### 12. DASHBOARD SHOP
Tổng số khảo sát, khảo sát hợp lệ, QR, nhân viên, tỷ lệ hoàn tất, thời gian trung bình, tỷ lệ mua từng nhóm bên ngoài, tỷ lệ muốn cải thiện từng nhóm, top yếu tố/nhãn hiệu/quy cách/loại sản phẩm/hình thức khuyến mãi.

### 13. DASHBOARD KHU VỰC
So sánh các siêu thị, phân tích khác biệt theo khu vực, xếp hạng nhóm hàng cần cải thiện, xác định nhu cầu phổ biến, tổng hợp yêu cầu điều chỉnh.

### 14. DASHBOARD TOÀN HỆ THỐNG
Tổng số khảo sát/siêu thị tham gia, phân tích theo ngành hàng/yếu tố, xếp hạng nhãn hiệu/dung tích/loại sản phẩm, xu hướng theo thời gian, so sánh khu vực.
Bộ lọc: thời gian, khu vực, siêu thị, nhóm hàng, nguồn khảo sát, chiến dịch.
Biểu đồ dùng dữ liệu thật. Câu hỏi nhiều lựa chọn có thể cộng vượt 100% — phải hiển thị rõ mẫu số và cách tính.

## PHẦN X. DASHBOARD HÀNH ĐỘNG

### 15. CƠ HỘI CẢI THIỆN NGÀNH HÀNG
Màn hình "CƠ HỘI TĂNG TỶ LỆ KHÁCH LỰA CHỌN BHX". Mỗi cơ hội gồm: khu vực, siêu thị, nhóm hàng, yếu tố, mong muốn cụ thể, số lượt/tỷ lệ yêu cầu, mức ưu tiên, trạng thái xử lý.
Trạng thái: 1. Chưa đánh giá 2. Đang xem xét 3. Đã duyệt thử nghiệm 4. Đang thử nghiệm 5. Đã triển khai 6. Không triển khai.
Cho phép cập nhật trạng thái và ghi chú. Không tự suy luận doanh thu tăng thêm nếu chưa có dữ liệu bán hàng.

## PHẦN XI. QUẢN TRỊ

### 16. PHÂN QUYỀN
ADMIN (toàn quyền), REGION_MANAGER (khu vực), SHOP_MANAGER (shop, tạo QR, theo dõi khảo sát), STAFF (thực hiện khảo sát, không xem PII ngoài phạm vi), CUSTOMER (không tài khoản, chỉ truy cập qua QR hợp lệ). Mọi phân quyền kiểm tra ở backend.

### 17. CẤU HÌNH KHẢO SÁT
Admin: đổi nội dung câu hỏi, bật/tắt câu hỏi, đổi danh sách đáp án, Top 5 nhãn hiệu, cấu hình theo khu vực/shop, đổi quy cách/loại sản phẩm, quản lý chiến dịch, xuất dữ liệu. Không cần sửa code khi đổi danh sách nhãn hiệu. Phải quản lý phiên bản khảo sát và giữ lịch sử câu trả lời.

## PHẦN XII. YÊU CẦU KỸ THUẬT

### 18. TECH STACK
Frontend: React, TypeScript, Vite, Tailwind CSS.
Backend: Node.js, REST API, Prisma ORM.
Database: PostgreSQL.
Dashboard: Recharts.
QR: thư viện tạo QR hỗ trợ PNG/SVG.
Deployment: Docker, Docker Compose, HTTPS qua reverse proxy.
Yêu cầu: responsive; PWA nếu phù hợp; tối ưu tải mạng di động; không phụ thuộc dịch vụ trả phí cho chức năng cốt lõi; `.env.example`; không hardcode secrets; migration; seed data; hướng dẫn backup/restore; hướng dẫn triển khai VPS.

### 19. BẢO MẬT
HTTPS; input validation; rate limiting; RBAC; chống SQL injection/XSS/CSRF (nếu cookie auth); mã hoá dữ liệu cá nhân; bảo vệ API; không lộ PII trong dashboard công khai; không lưu tên/SĐT trong analytics logs; cơ chế xoá/ẩn danh theo chính sách; lịch sử truy cập dữ liệu nhạy cảm; kiểm tra yêu cầu pháp luật VN về bảo vệ dữ liệu cá nhân trước production.

## PHẦN XIII. KIỂM THỬ

### 20. TEST CASES
(25 test case — xem đầy đủ ở `08-tieu-chi-nghiem-thu.md` mục 2, giữ nguyên nội dung và thứ tự từ bản gốc.)

## PHẦN XIV. LỘ TRÌNH TRIỂN KHAI
Giai đoạn 1 – Thiết kế: phân tích nghiệp vụ, kiến trúc, database, luồng khảo sát, giao diện, API.
Giai đoạn 2 – MVP: quản lý shop, tạo QR, nhập tên/SĐT, bộ 4 câu hỏi, lưu kết quả, kiểm soát trùng, dashboard shop, cấu hình nhãn hiệu.
Giai đoạn 3 – Quản trị và phân tích: dashboard khu vực/hệ thống/hành động, quản lý chiến dịch, phân quyền nâng cao, xuất báo cáo.
Giai đoạn 4 – Production: kiểm thử, tối ưu, Docker Compose, HTTPS, backup, logging, tài liệu triển khai.

## PHẦN XV. TIÊU CHÍ NGHIỆM THU
(15 tiêu chí — xem đầy đủ ở `08-tieu-chi-nghiem-thu.md` mục 1, giữ nguyên nội dung và thứ tự từ bản gốc.)

## PHẦN XVI. CHỈ ĐẠO CUỐI CÙNG CHO CLAUDE CODE
Hãy thực hiện như một dự án phần mềm production thực tế. Không chỉ giải thích lý thuyết/pseudocode/giao diện mẫu. Hãy: kiểm tra môi trường và thư mục dự án; đề xuất cấu trúc hệ thống phù hợp; tạo source code hoàn chỉnh; xây database và API; tạo giao diện khảo sát; tạo hệ thống QR; tạo dashboard; tạo quản trị; viết test; chạy thử; sửa lỗi; hướng dẫn triển khai.
Ưu tiên MVP chạy được trước, sau đó mở rộng. Không tự nhận đã hoàn thành chức năng nếu chưa kiểm thử. Khi cần quyết định kỹ thuật chưa được chỉ định: chọn phương án đơn giản/ổn định/dễ bảo trì, giải thích ngắn gọn.
Mục tiêu cuối cùng: xây dựng hệ thống giúp BHX lắng nghe khách hàng, xác định chính xác những thay đổi cần thiết và chuyển kết quả khảo sát thành hành động kinh doanh có thể đo lường.
