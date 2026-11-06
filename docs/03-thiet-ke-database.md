# 03. Thiết kế Database — BHX Customer Insight

PostgreSQL. Quản lý qua Prisma migration. Tất cả khoá ngoại có ràng buộc tham chiếu (`ON DELETE RESTRICT` trừ khi ghi chú khác). Mọi bảng có `created_at timestamptz default now()`.

## 1. Danh mục tổ chức

### `regions`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | mã khu vực |
| name | text | |
| created_at | timestamptz | |

### `shops`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | mã siêu thị — dùng để tra khi tạo QR |
| name | text | |
| region_id | uuid FK → regions.id | |
| address | text NULL | |
| is_active | boolean default true | |
| created_at | timestamptz | |

Index: `(region_id)`.

### `users`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| email | text UNIQUE | |
| password_hash | text | bcrypt/argon2 |
| full_name | text | |
| role | enum(`ADMIN`,`REGION_MANAGER`,`SHOP_MANAGER`,`STAFF`) | CUSTOMER không có bản ghi user |
| region_id | uuid FK → regions.id NULL | bắt buộc nếu role=REGION_MANAGER |
| shop_id | uuid FK → shops.id NULL | bắt buộc nếu role ∈ {SHOP_MANAGER, STAFF} |
| is_active | boolean default true | |
| created_at | timestamptz | |

Check constraint (ở tầng ứng dụng + CHECK nếu khả thi): role-scope phải khớp (SHOP_MANAGER/STAFF có shop_id; REGION_MANAGER có region_id; ADMIN không yêu cầu).

## 2. Chiến dịch & QR

### `survey_campaigns`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| name | text | |
| start_date | date | |
| end_date | date NULL | |
| is_active | boolean default true | chỉ 1 campaign active toàn hệ thống tại 1 thời điểm (ràng buộc ứng dụng) |
| created_by | uuid FK → users.id | |
| created_at | timestamptz | |

### `shop_qr_codes`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| shop_id | uuid FK → shops.id | |
| token | text UNIQUE | chuỗi ngẫu nhiên ≥32 byte entropy, không tuần tự |
| is_active | boolean default true | |
| created_by | uuid FK → users.id | |
| created_at | timestamptz | |
| revoked_at | timestamptz NULL | |

Index: `(token)` unique, `(shop_id, is_active)`. Mỗi shop chỉ nên có **một** QR `is_active = true` tại một thời điểm (ràng buộc ứng dụng khi phát hành QR mới → tự revoke QR cũ).

## 3. Danh mục khảo sát (catalog)

### `product_groups`
| id uuid PK | code text UNIQUE (`RICE`,`NOODLE`,`OIL`,`FISH_SAUCE`) | name text | display_order int |

### `brands`
| id uuid PK | product_group_id FK | name text | display_order int | is_active boolean default true |

### `package_sizes`
| id uuid PK | product_group_id FK | label text | display_order int | is_active boolean default true |

### `product_types`
| id uuid PK | product_group_id FK | name text | display_order int | is_active boolean default true |

> Giả định: catalog không versioned theo thời gian (đơn giản cho Pilot). Để không làm sai dữ liệu lịch sử khi đổi danh mục, các bảng câu trả lời (`survey_detail_choices`) lưu **snapshot label** tại thời điểm trả lời, song song với FK — xem mục 5.

## 4. Cấu hình bộ câu hỏi (versioned)

### `survey_question_configs`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| question_key | enum(`Q1`,`Q2`,`Q3`,`Q4A`,`Q4B`,`Q4C`,`Q4D`,`Q4E`) | |
| version | int | tăng dần theo `question_key` |
| label_text | text | nội dung câu hỏi hiển thị |
| is_active | boolean default true | |
| effective_from | timestamptz | |
| created_by | uuid FK → users.id | |
| created_at | timestamptz | |

Unique: `(question_key, version)`.

### `survey_option_configs`
Dùng cho đáp án cố định (Q1, Q2, Q3-factor, Q4A, Q4B) — không áp dụng cho 4C/4D/4E (đã có bảng catalog riêng).
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| question_config_id | uuid FK → survey_question_configs.id | |
| option_key | text | ví dụ `RICE`, `NONE_ALL_AT_BHX`, `PRICE`, `OTHER`, `PRICE_LOWER_5_10` |
| label_text | text | |
| display_order | int | |
| is_exclusive | boolean default false | đáp án độc quyền (kết thúc khảo sát hoặc loại trừ lựa chọn khác) |
| is_active | boolean default true | |

## 5. Khảo sát — người trả lời & phiên

### `survey_respondents`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| full_name | text NULL | chỉ có khi `source=QR` |
| phone_normalized_hash | text NULL | HMAC-SHA256(SĐT chuẩn hoá, khoá bí mật) — dùng để chống trùng, **không lưu SĐT plaintext** |
| phone_last4 | text NULL | 4 số cuối, chỉ để hiển thị cho nhân viên hỗ trợ, không đủ để định danh |
| created_at | timestamptz | |

Index: `(phone_normalized_hash)`.

> Quyết định bảo mật: không lưu SĐT đầy đủ dạng plaintext trong DB nghiệp vụ. Nếu cần liên hệ lại khách (ngoài phạm vi Pilot hiện tại), sẽ cần giải pháp mã hoá hai chiều riêng có kiểm soát truy cập — ghi nhận là việc ngoài phạm vi V2.0 ban đầu, nêu rõ giả định.

### `privacy_consents`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| respondent_id | uuid FK → survey_respondents.id | |
| consent_given | boolean | |
| consent_text_version | text | phiên bản nội dung thông báo quyền riêng tư đã hiển thị |
| consented_at | timestamptz | |

### `survey_sessions`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| shop_id | uuid FK → shops.id | resolve từ QR token hoặc từ user đăng nhập — **không nhận từ client** |
| campaign_id | uuid FK → survey_campaigns.id NULL | snapshot tại thời điểm bắt đầu |
| source | enum(`QR`,`STAFF`) | |
| respondent_id | uuid FK → survey_respondents.id NULL | NULL khi source=STAFF |
| staff_user_id | uuid FK → users.id NULL | NULL khi source=QR |
| status | enum(`IN_PROGRESS`,`COMPLETED`,`ABANDONED`) default `IN_PROGRESS` | |
| is_duplicate | boolean default false | |
| question_version_snapshot | jsonb | map `question_key → version` dùng cho session này |
| gift_id | uuid FK → gifts.id NULL | bắt buộc khi `status=COMPLETED` (ứng dụng validate ở bước hoàn tất) |
| gift_name_snapshot | text NULL | tên quà tại thời điểm chọn — chống lệch nếu danh mục quà đổi tên sau này |
| started_at | timestamptz | |
| completed_at | timestamptz NULL | |

Index: `(shop_id, campaign_id)`, `(respondent_id)`, `(status)`.

### `gifts` (thêm 2026-11-06)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| name | text | |
| package_info | text | vd "Gói 250g" |
| price_vnd | int | giá tham khảo, chỉ để hiển thị |
| note | text NULL | vd "4 Tặng 1 Giá Trị Nhỏ Nhất" |
| image_url | text | đường dẫn ảnh (phục vụ tại `apps/web/public/gifts/`) |
| display_order | int | |
| is_active | boolean default true | |
| created_at | timestamptz | |

Khách chọn đúng 1 quà ở bước cuối khảo sát (sau Câu 1–4), lưu vào `survey_sessions.gift_id` tại thời điểm hoàn tất.

## 6. Câu trả lời

### `survey_group_choices` — Câu 1 & Câu 2
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → survey_sessions.id | |
| question_key | enum(`Q1`,`Q2`) | |
| product_group_id | uuid FK → product_groups.id NULL | NULL khi đáp án là lựa chọn độc quyền ("Không có"/"Chưa muốn chuyển") |
| is_exclusive_choice | boolean default false | |

Unique: `(session_id, question_key, product_group_id)`.

### `survey_change_factors` — Câu 3
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → survey_sessions.id | |
| product_group_id | uuid FK → product_groups.id | |
| factor_key | enum(`PRICE`,`PROMOTION`,`BRAND`,`PACKAGE_SIZE`,`PRODUCT_TYPE`,`OTHER`,`NONE`) | |

Unique: `(session_id, product_group_id, factor_key)`.

### `survey_detail_choices` — Câu 4 (4A–4E)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK → survey_sessions.id | |
| product_group_id | uuid FK → product_groups.id | |
| detail_type | enum(`PRICE`,`PROMOTION`,`BRAND`,`PACKAGE_SIZE`,`PRODUCT_TYPE`) | |
| option_key | text | ví dụ `LOWER_5_10`, `VOUCHER`, `OTHER`, `NOT_IMPORTANT` |
| brand_id | uuid FK → brands.id NULL | chỉ khi detail_type=BRAND và không phải "khác/không quan trọng" |
| package_size_id | uuid FK → package_sizes.id NULL | |
| product_type_id | uuid FK → product_types.id NULL | |
| label_snapshot | text | nhãn hiển thị tại thời điểm trả lời (chống lệch dữ liệu khi catalog đổi sau này) |

Index: `(session_id)`, `(product_group_id, detail_type)`.

## 7. Hành động & audit

### `action_items`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| region_id | uuid FK → regions.id NULL | |
| shop_id | uuid FK → shops.id NULL | |
| product_group_id | uuid FK → product_groups.id | |
| factor_key | enum như `survey_change_factors.factor_key` | |
| detail_summary | text | tổng hợp mong muốn cụ thể phổ biến nhất (tính toán định kỳ, không nhập tay) |
| request_count | int | |
| request_ratio | numeric(5,2) | |
| priority | enum(`LOW`,`MEDIUM`,`HIGH`) | |
| status | enum(`UNASSESSED`,`REVIEWING`,`APPROVED_PILOT`,`PILOTING`,`DEPLOYED`,`NOT_DEPLOYED`) default `UNASSESSED` | tương ứng 6 trạng thái Phần X |
| notes | text NULL | |
| updated_by | uuid FK → users.id NULL | |
| updated_at | timestamptz | |

### `audit_logs`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users.id NULL | NULL cho hành động hệ thống |
| action | text | ví dụ `VIEW_RESPONDENT_PII`, `EXPORT_DATA`, `CREATE_QR` |
| entity_type | text | |
| entity_id | uuid NULL | |
| metadata | jsonb NULL | |
| created_at | timestamptz | |

## 8. Ràng buộc toàn vẹn chính

1. `survey_sessions.shop_id` không thể bị thay đổi sau khi tạo (immutable ở tầng ứng dụng).
2. Một `survey_sessions` không thể có cả `respondent_id` và `staff_user_id` cùng NULL, và không thể có cả hai cùng khác NULL (CHECK: đúng 1 trong 2 theo `source`).
3. `survey_group_choices` với `question_key=Q1`: nếu tồn tại bản ghi `is_exclusive_choice=true`, không được có bản ghi khác cùng session/question_key.
4. Toàn vẹn phân nhánh (Q2 chỉ chứa nhóm đã có ở Q1, Q3/Q4 chỉ chứa nhóm đã có ở Q2…) kiểm tra ở tầng service khi ghi nhận câu trả lời, không chỉ dựa vào DB constraint.

## 9. Seed data tối thiểu để demo dashboard có số liệu

- 2–3 `regions`, 6–10 `shops`.
- 1 ADMIN, 1 REGION_MANAGER, vài SHOP_MANAGER/STAFF.
- 4 `product_groups` cố định (RICE/NOODLE/OIL/FISH_SAUCE).
- Brands/package_sizes/product_types theo danh sách ở `01-phan-tich-nghiep-vu.md`.
- 1 `survey_campaigns` active.
- Mỗi shop ≥1 `shop_qr_codes` active.
- ~100–200 `survey_sessions` giả lập (trộn QR/STAFF, có COMPLETED/ABANDONED, có is_duplicate) đủ để mọi dashboard ở `09` có số liệu.
