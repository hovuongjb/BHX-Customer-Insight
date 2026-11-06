# 08. Tiêu chí nghiệm thu — BHX Customer Insight

## 1. Tiêu chí nghiệm thu tổng thể

Phần mềm được coi là hoàn thành khi:

1. Nhập mã siêu thị tạo được QR.
2. Khách quét QR mở đúng trang khảo sát của shop đó.
3. Khách nhập được tên và SĐT (có validate + consent bắt buộc).
4. Khách hoàn thành được 4 câu hỏi.
5. Có thể chọn nhiều đáp án ở các câu cho phép multi-select.
6. Câu 4 phân nhánh chính xác theo nhóm hàng × yếu tố đã chọn ở câu 3.
7. Top 5 nhãn hiệu hiển thị đúng theo từng nhóm hàng.
8. Dữ liệu tự động gắn đúng shop (resolve từ QR token hoặc từ user đăng nhập, không tin client).
9. Không ghi nhận khảo sát trùng ngoài chính sách đã cấu hình.
10. Dashboard hiển thị dữ liệu thật (không mock), kèm mẫu số N.
11. Quản lý xem được danh sách cơ hội cải thiện và cập nhật trạng thái.
12. Có thể xuất báo cáo (Excel/CSV).
13. Có phân quyền (RBAC) hoạt động đúng ở backend.
14. Có thể triển khai lên VPS qua Docker Compose + HTTPS.
15. Có hướng dẫn sử dụng (user manual + admin manual) và hướng dẫn triển khai.

## 2. Danh sách test case tối thiểu

| # | Test case | Loại |
|---|---|---|
| 1 | Tạo QR từ mã siêu thị hợp lệ | Integration |
| 2 | Từ chối mã siêu thị không tồn tại | Integration |
| 3 | Từ chối tạo QR ngoài phạm vi quyền | Integration / RBAC |
| 4 | Quét QR mở đúng siêu thị | E2E |
| 5 | QR bị vô hiệu hoá → không mở được khảo sát | Integration |
| 6 | Khách nhập thông tin hợp lệ → tạo session thành công | Integration |
| 7 | Khách nhập sai định dạng SĐT → bị chặn, báo lỗi rõ | Unit (validation) |
| 8 | ~~Khách không đồng ý xử lý dữ liệu → không cho bắt đầu khảo sát~~ — **không còn áp dụng** từ 2026-11-06 (đã bỏ checkbox đồng ý riêng, xem CLAUDE.md §7) | — |
| 9 | Khách chọn "mua cả 4 nhóm tại BHX" → kết thúc khảo sát ngay sau Câu 1 | Unit (business rule) |
| 10 | Khách chọn mua một nhóm bên ngoài → đi đúng nhánh | Unit |
| 11 | Khách chọn nhiều nhóm bên ngoài → Câu 2/3/4 lặp đúng cho từng nhóm | Unit |
| 12 | Khách chọn nhiều yếu tố cải thiện ở Câu 3 | Unit |
| 13 | Khách chọn nhiều nhãn hiệu ở Câu 4C | Unit |
| 14 | Khách chọn "Khác" (nhãn hiệu/quy cách/loại sản phẩm) | Unit |
| 15 | Khách chọn "Chưa muốn chuyển nhóm nào" ở Câu 2 → kết thúc khảo sát | Unit (business rule) |
| 16 | Khách quay lại sửa đáp án Câu 1 → các câu phụ thuộc bị xoá đúng | Unit (state machine) |
| 17 | Khách thoát giữa khảo sát → session ở trạng thái phù hợp (không COMPLETED giả) | Integration |
| 18 | Khách khảo sát trùng SĐT (cùng shop + campaign) → bị đánh dấu/thông báo trùng | Integration (business rule) |
| 19 | Mất mạng khi gửi kết quả → retry submit không tạo dữ liệu trùng (idempotent) | Integration |
| 20 | Hai khách khảo sát đồng thời tại cùng shop → không xung đột dữ liệu | Integration/concurrency |
| 21 | Dashboard lọc đúng theo shop | Integration |
| 22 | Dashboard lọc đúng theo khu vực | Integration |
| 23 | Phân quyền dữ liệu (SHOP_MANAGER không xem được shop ngoài phạm vi, REGION_MANAGER không xem được khu vực khác…) | Integration/RBAC |
| 24 | Xuất Excel/CSV đúng dữ liệu đã lọc | Integration |
| 25 | Thay đổi danh sách nhãn hiệu (version mới) không làm sai dữ liệu khảo sát cũ đã lưu | Integration (versioning) |

## 3. Phạm vi kiểm thử theo giai đoạn (Phần XV của master prompt)

- **Unit test**: business rules (độc quyền Câu 1/2/3, phân nhánh Câu 3→4, validate SĐT, chuẩn hoá/hash SĐT, tính `request_ratio`/`priority` cho action items).
- **Integration test**: Offer-tương-đương ở đây là luồng Session + Answers (tạo session → trả lời → complete), QR lifecycle, Dashboard theo filter, Export.
- **Test quyền truy cập**: toàn bộ endpoint nội bộ theo bảng RBAC ở `01-phan-tich-nghiep-vu.md` mục 6.
- **Test mobile responsive**: màn hình khảo sát khách ở khung 375px và 414px, kiểm tra không cần zoom, nút bấm đủ lớn.
- **Test đổi/không đổi coach** *(không áp dụng cho sản phẩm này — loại bỏ, không nhầm với dự án khác)*.
- **Test capacity** *(không áp dụng)*.
- **Test rating**: không áp dụng (sản phẩm này không có rating coach/mentee) — thay bằng test đúng/sai của toàn bộ business rule khảo sát ở mục 2.
- **Test đóng hợp đồng sớm** *(không áp dụng)*.

> Ghi chú: BHX Customer Insight không có khái niệm coach/mentee/hợp đồng/rating — các mục test tương ứng trong khung kiểm thử gốc không áp dụng, đã thay bằng test case tương đương về nghiệp vụ khảo sát (mục 2).
