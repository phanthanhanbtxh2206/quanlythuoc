# Kế Hoạch Triển Khai: Hệ Thống Quản Lý Thuốc, Kho Dược & Cấp Phát Đối Tượng - TT Bảo Trợ Xã Hội Đà Nẵng

## Tóm Tắt Dự Án
Xây dựng WebApp chuyên nghiệp, chuẩn mực phục vụ quản lý thuốc và kho dược tại Trung tâm Bảo trợ xã hội Đà Nẵng (Phòng Y tế - PHCN, Mã QHNS: 1041008). Ứng dụng tích hợp quy trình khép kín từ danh mục thuốc, quản lý lô - hạn dùng, hồ sơ đối tượng BHYT, nhập kho, lập đơn thuốc, xác nhận cấp phát, xuất kho đến tự động lập "BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ", in ấn biểu mẫu chuẩn khổ A4 và đồng bộ Google Sheets / Google Drive.

---

## Phản Hồi Người Dùng & Các Quyết Định Then Chốt (Critical Decisions)

> [!IMPORTANT]
> Dựa trên nghiên cứu chi tiết 3 biểu mẫu nghiệp vụ (Nhập kho, Xuất kho, Báo cáo tổng hợp đối tượng BHYT) và đặc thù quản lý tại cơ sở bảo trợ xã hội, các nguyên tắc nền tảng được xác định như sau:

1. **Cơ chế lưu trữ & tính toàn vẹn (Transactional Core + Bi-directional Sheets Sync)**:
   - Sử dụng cơ sở dữ liệu quan hệ giao dịch (Express backend với SQLite / transactional store) làm nguồn dữ liệu nghiệp vụ chính để đảm bảo giao dịch nguyên tử (ACID), chống ghi trùng (duplicate submit), khóa tồn kho chính xác khi nhiều nhân viên thao tác đồng thời.
   - Kết nối hai chiều với Google Sheets: tự động ghi nhận dữ liệu giao dịch sang các bảng tính chuẩn để lưu trữ báo cáo định kỳ, sao lưu và chia sẻ liên phòng ban.
2. **Phương pháp quản lý lô và đơn giá xuất kho / tồn kho (Specific Identification by Lot & Expiry)**:
   - Mỗi lần nhập thuốc đều quản lý chi tiết theo **Số lô (Lot Number)** và **Hạn dùng (Expiry Date)** kèm đơn giá nhập thực tế của lô đó.
   - Khi cấp phát / xuất kho cho đối tượng, thủ kho/y sĩ chọn trực tiếp lô thuốc cụ thể (hỗ trợ gợi ý theo nguyên tắc FEFO - Hết hạn trước xuất trước). Giá trị xuất và giá trị tồn kho phản ánh chính xác theo đơn giá đích danh của từng lô, loại bỏ hoàn toàn sai lệch số liệu so với chứng từ gốc.
3. **Định nghĩa chỉ tiêu "Tổng nhập" trên Biểu mẫu Báo cáo BHYT**:
   - Theo thông lệ biểu mẫu tổng hợp kho hành chính sự nghiệp Việt Nam, cột **Tổng nhập = Tồn đầu kỳ + Lũy kế Nhập trong kỳ**. Cột này phản ánh tổng lượng thuốc sẵn sàng phục vụ cho đối tượng trong kỳ.
   - Lượng **Tồn cuối kỳ = Tổng nhập - Xuất trong kỳ** (phù hợp tuyệt đối với bảng cân đối số lượng và thành tiền).

---

## 1. Tổng Quan & Nghiệp Vụ Cốt Lõi

- **Mục tiêu**: Loại bỏ việc nhập liệu trùng lặp trên sổ sách và Excel rời rạc; nhân viên nhập liệu một lần, dữ liệu tự động kế thừa xuyên suốt các khâu: Kê đơn -> Duyệt cấp phát -> Xuất kho -> Báo cáo tổng hợp đối tượng.
- **Đối tượng sử dụng**:
  - *Bác sĩ / Y sĩ kê đơn*: Quản lý hồ sơ đối tượng bảo trợ, lập đơn thuốc điều trị theo ngày/tháng, theo dõi liều lượng và tiến độ dùng thuốc.
  - *Thủ kho / Dược sĩ*: Quản lý danh mục thuốc, tiếp nhận phiếu nhập kho theo hóa đơn, kiểm tra hạn dùng, xuất kho theo phiếu cấp phát, theo dõi tồn kho theo lô.
  - *Lãnh đạo Phòng Y tế - Kế toán - Thủ trưởng*: Phê duyệt chứng từ, theo dõi cảnh báo thuốc cận date/hết hàng, ký duyệt biểu mẫu in và báo cáo quyết toán thuốc BHYT.

---

## 2. Trải Nghiệm Người Dùng (UX) & Thiết Kế Giao Diện

- **Phong cách thị giác (Visual Direction)**: 
  - Phong cách công vụ y tế chuyên nghiệp (Clinical & Clean Administrative), kết hợp giữa tính trang trọng của cơ quan nhà nước và sự tinh gọn, hiện đại của SaaS dashboard y tế.
  - Bảng màu: Nền trắng sạch (`#FFFFFF`), bề mặt xám nhạt trung tính (`#F8FAFC`, `#F1F5F9`), màu nhấn xanh ngọc y tế đậm (`#0D9488` / `#0F766E`) và xanh hải quân công vụ (`#1E293B`).
  - Font chữ: `Plus Jakarta Sans` cho tiêu đề và giao diện làm việc, kết hợp `JetBrains Mono / tabular-nums` cho toàn bộ số lượng, đơn giá, thành tiền và mã chứng từ.
  - **Zero-Pill Discipline**: Không dùng huy hiệu bong bóng tròn màu mè (pill badges) trên bảng dữ liệu. Thông tin trạng thái (Đã nhập, Chờ duyệt, Đã xuất) thể hiện bằng chữ thanh lịch kèm ký hiệu chấm tròn nhỏ hoặc viền mảnh tinh tế.
- **Bố cục làm việc**:
  - Sidebar cố định 260px bên trái với 12 phân hệ nghiệp vụ rõ ràng, có thể thu gọn.
  - Header công vụ hiển thị: Đơn vị: *TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG*, Phòng: *Y TẾ - PHCN*, Mã QHNS: *1041008*.
  - Màn hình nhập liệu dạng Master-Detail tối ưu: Phía trên là thông tin chứng từ (Số phiếu, ngày, đối tượng, người giao/nhận), phía dưới là lưới thêm thuốc nhanh (tự động gợi ý từ danh mục, tự động tính Thành tiền và đọc thành chữ tiếng Việt).
- **In ấn & Xuất PDF chuẩn A4**:
  - Tích hợp công cụ in trình duyệt tối ưu CSS `@media print` không bị lệch trang, không cắt đứt bảng biểu hay phần chữ ký (Thủ trưởng đơn vị, Kế toán trưởng, Thủ kho, Người giao/nhận).
  - Tích hợp xuất PDF và hỗ trợ liên kết lưu trữ lên Google Drive theo cấu trúc thư mục năm/tháng.

---

## 3. Phân Tích Toàn Bộ 3 Sheet Excel & Bảng Đối Chiếu Dữ Liệu

### A. Phân tích chi tiết Sheet "Nhập"
- **Đơn vị & Tiêu đề**: TRUNG TÂM BẢO TRỢ XÃ HỘI - PHÒNG Y TẾ - PHCN (Mã QHNS: 1041008) - "PHIẾU NHẬP KHO".
- **Thông tin chứng từ**: Ngày tháng lập phiếu, Số chứng từ (PNK-YYYYMMDD-xxx), Tài khoản Nợ/Có (nếu có), Họ tên người giao, Đơn vị/Địa chỉ giao, Số hóa đơn, Ngày hóa đơn, Tên đơn vị phát hành (Nhà cung cấp), Nội dung nhập (mua ngoài cho đối tượng cụ thể hoặc nhập kho tập trung), Đối tượng liên quan, Số chứng từ kèm theo.
- **Bảng chi tiết thuốc**: STT, Tên thuốc/hàm lượng/quy cách, Mã số thuốc, Đơn vị tính, Số lượng theo chứng từ, Số lượng thực nhập, Đơn giá, Thành tiền.
- **Chân chứng từ**: Cộng thành tiền, Tổng số tiền bằng chữ, Ngày lập, 4 chữ ký xác nhận: Người giao hàng, Thủ kho, Kế toán trưởng, Thủ trưởng đơn vị.
- **Kế thừa & Tự động hóa**: Chọn thuốc -> tự động điền Tên, Hoạt chất, ĐVT; Nhập SL thực nhập & Đơn giá -> tự động tính Thành tiền; Tính Tổng tiền phiếu và tự động dịch thành chữ (Ví dụ: "Một triệu hai trăm nghìn đồng chẵn").

### B. Phân tích chi tiết Sheet "Xuất"
- **Đơn vị & Tiêu đề**: "PHIẾU XUẤT KHO" theo mẫu biểu chuẩn.
- **Thông tin chứng từ**: Ngày tháng xuất, Số phiếu (PXK-YYYYMMDD-xxx), Tài khoản Nợ/Có, Họ tên người nhận, Bộ phận/khu quản lý, Lý do xuất kho (Cấp phát theo đơn, xuất sử dụng tại chỗ, xuất hỗ trợ khẩn cấp), Đối tượng hưởng thuốc, Địa điểm sử dụng.
- **Bảng chi tiết thuốc**: STT, Tên thuốc & hàm lượng, Mã số thuốc, Đơn vị tính, Số lô & Hạn dùng, Số lượng yêu cầu, Số lượng thực xuất, Đơn giá, Thành tiền.
- **Chân chứng từ**: Cộng thành tiền, Tổng số tiền bằng chữ, Ngày lập, 4 chữ ký: Người nhận hàng, Thủ kho, Kế toán trưởng, Thủ trưởng đơn vị.
- **Kiểm soát nghiệp vụ**: Không cho phép thực xuất vượt tồn khả dụng của lô; cảnh báo nếu lô thuốc cận hạn sử dụng (< 30 ngày) hoặc đã hết hạn; liên kết mã đơn thuốc hoặc phiếu cấp phát để không bị xuất trùng.

### C. Phân tích chi tiết Sheet "Báo cáo"
- **Tên biểu mẫu**: "BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ".
- **Tiêu ngữ & Tiêu đề hành chính**: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM (Độc lập - Tự do - Hạnh phúc), Đơn vị: TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG - PHÒNG Y TẾ - PHCN.
- **Thông tin lọc & tổng hợp**: Đối tượng (Họ và tên, Mã quản lý, Số thẻ BHYT), Kỳ báo cáo (Từ ngày ... đến ngày ...).
- **Cấu trúc 6 cụm cột chuyên môn**:
  1. *Thông tin thuốc*: STT, Tên thuốc và hàm lượng, Đơn vị tính.
  2. *Tồn đầu kỳ*: Số lượng, Đơn giá, Thành tiền.
  3. *Nhập trong kỳ*: Số lượng, Đơn giá, Thành tiền.
  4. *Tổng nhập*: Số lượng (= Tồn đầu + Nhập trong kỳ), Đơn giá, Thành tiền.
  5. *Xuất trong kỳ*: Số lượng (Lũy kế xuất cho đối tượng), Đơn giá, Thành tiền.
  6. *Tồn cuối kỳ*: Số lượng (= Tổng nhập - Xuất trong kỳ), Đơn giá, Thành tiền.
- **Chữ ký**: Người lập biểu, Người phụ trách Phòng Y tế - PHCN, Kế toán / Giám đốc Trung tâm.

### D. Bảng Đối Chiếu Trường Dữ Liệu Giữa 3 Sheet

| Tên trường dữ liệu | Sheet Nhập | Sheet Xuất | Sheet Báo Cáo | Nguồn gốc dữ liệu | Phương thức xử lý trên WebApp |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mã QHNS / Đơn vị** | Có (1041008) | Có (1041008) | Có (TT BTXH ĐN) | Cấu hình hệ thống | Tự động điền cố định |
| **Số chứng từ** | Số PNK | Số PXK | Lũy kế nhiều phiếu | Hệ thống sinh tự động | Độc nhất, không trùng lặp |
| **Ngày tháng** | Ngày nhập | Ngày xuất | Kỳ báo cáo (Từ - Đến) | Người dùng chọn | Kiểm tra tính hợp lệ thời gian |
| **Đối tượng thụ hưởng** | Đối tượng liên quan | Đối tượng nhận | Đối tượng tiêu đề BC | Danh mục Đối tượng | Chọn từ danh mục (Mã, Tên, BHYT) |
| **Tên thuốc & Hàm lượng** | Tên mặt hàng | Tên mặt hàng | Tên thuốc & hàm lượng | Danh mục Thuốc | Chọn từ danh mục, tự động điền quy cách |
| **Đơn vị tính** | ĐVT | ĐVT | ĐVT | Danh mục Thuốc | Tự động kế thừa từ thuốc |
| **Số lô & Hạn dùng** | Nhập mới theo hóa đơn | Chọn lô có sẵn | Tách theo từng lô/thuốc | Lô kho dược | Quản lý theo FEFO, cảnh báo hạn |
| **Số lượng** | SL chứng từ & Thực nhập | SL yêu cầu & Thực xuất | Tồn đầu, Nhập, Xuất, Tồn cuối | Giao dịch thực tế | Tự động tính cân đối không lệch số |
| **Đơn giá** | Giá mua hóa đơn | Giá theo lô xuất | Giá theo lô tương ứng | Phiếu nhập gốc | Kế thừa chính xác từ lô thuốc |
| **Thành tiền** | SL * Đơn giá | SL * Đơn giá | Tương ứng từng cột | Công thức hệ thống | Tự động tính, đối chiếu tổng |
| **Tổng tiền bằng chữ** | Có | Có | Không bắt buộc | Hàm chuyển đổi số sang chữ | Tự động đọc bằng tiếng Việt |
| **Chữ ký xác nhận** | 4 chữ ký | 4 chữ ký | 2 - 3 chữ ký | Quy trình phê duyệt | Hiển thị đúng chức danh trên bản in |

---

## 4. Kiến Trúc Kỹ Thuật & Mô Hình Dữ Liệu

### A. Sơ Đồ Kiến Trúc Hệ Thống (ASCII System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GIAO DIỆN NGƯỜI DÙNG (REACT 19 + TAILWIND)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Danh Mục     │  │ Nhập/Xuất    │  │ Đơn Thuốc &  │  │ Báo Cáo    │  │
│  │ Thuốc & Hồ Sơ│  │ Kho Dược     │  │ Cấp Phát Y Tế│  │ Tổng Hợp   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                 │                │         │
│         ▼                 ▼                 ▼                ▼         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Bộ Điều Phối Nghiệp Vụ Frontend (React Context / Custom Hooks)   │  │
│  │ - Kiểm tra tồn kho khả dụng & cảnh báo hạn dùng (FEFO)           │  │
│  │ - Tự động tính thành tiền, tổng tiền và đọc số tiền ra chữ       │  │
│  │ - Render mẫu in chuẩn khổ A4 & Xuất PDF trực tiếp                │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ REST API / JSON
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  MÁY CHỦ TRUNG GIAN (EXPRESS SERVER BACKEND)           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ - Xác thực người dùng, kiểm tra trạng thái phê duyệt tài khoản   │  │
│  │ - Khóa giao dịch (Transaction Lock) đảm bảo không xuất âm kho    │  │
│  │ - Ghi nhận sổ nhật ký kiểm toán (Audit Logs)                     │  │
│  └───────────────────┬──────────────────────────────┬───────────────┘  │
│                      │                              │                  │
│                      ▼                              ▼                  │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ CƠ SỞ DỮ LIỆU GIAO DỊCH CHÍNH │  │ ĐỒNG BỘ GOOGLE WORKSPACE      │  │
│  │ - Thuốc, Lô kho, Hạn dùng     │  │ - Google Sheets API (Export)  │  │
│  │ - Phiếu nhập, Phiếu xuất      │  │ - Google Drive API (Lưu PDF)  │  │
│  │ - Đơn thuốc, Cấp phát         │  │ - Backup & Phục hồi dữ liệu   │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### B. Sơ Đồ Luồng Nghiệp Vụ Khép Kín (Closed-Loop Workflow)

```
[NHÀ CUNG CẤP / HÓA ĐƠN] ──> Lập Phiếu Nhập Kho ──> Tạo Lô Kho & Tăng Tồn Kho
                                                            │
[BÁC SĨ / Y SĨ] ───────────> Lập Đơn Thuốc Đối Tượng       │ (Kiểm tra tồn theo lô)
                                   │                        │
                                   ▼                        ▼
[Y TÁ / PHÒNG DƯỢC] ───────> Xác Nhận Cấp Phát ────> Sinh Phiếu Xuất Kho
                                                            │
                                                            ▼ (Trừ tồn kho chính xác)
[LÃNH ĐẠO / BÁO CÁO] <───── Tự Động Tổng Hợp <─────── Sổ Nhật Ký Xuất Kho
                              BÁO CÁO NHẬP - XUẤT - TỒN THEO ĐỐI TƯỢNG BHYT
```

### C. Thiết Kế Chi Tiết Cấu Trúc Bảng (Google Sheets & Database Entities)

1. **`BENEFICIARIES` (Hồ sơ đối tượng)**:
   - `id`, `code` (Mã ĐT: DT-001...), `full_name` (Họ và tên), `gender`, `birth_year`, `id_card`, `insurance_number` (Mã thẻ BHYT), `room_area` (Khu quản lý), `status` (Đang quản lý / Đã xuất viện / Tạm vắng), `created_at`.
2. **`MEDICINES` (Danh mục thuốc)**:
   - `id`, `code` (Mã thuốc), `name` (Tên thuốc biệt dược), `active_ingredient` (Hoạt chất), `concentration` (Hàm lượng), `unit` (Đơn vị tính: Viên, Lọ, Gói, Vỉ...), `packaging` (Quy cách), `dosage_form` (Dạng bào chế), `route` (Đường dùng: Uống, Tiêm...), `min_stock_alert` (Ngưỡng cảnh báo tồn tối thiểu), `status` (Hoạt động / Ngừng dùng).
3. **`STOCK_RECEIPTS` & `STOCK_RECEIPT_ITEMS` (Phiếu nhập kho & Chi tiết)**:
   - *Master*: `id`, `receipt_code` (PNK-YYYYMMDD-xxx), `receipt_date`, `deliverer_name`, `deliverer_dept`, `supplier_name`, `invoice_number`, `invoice_date`, `target_beneficiary_id` (nếu mua riêng), `source_type` (Mua ngoài BHYT / Ngân sách / Tài trợ), `total_amount`, `status`, `created_by`.
   - *Items*: `id`, `receipt_id`, `medicine_id`, `batch_number` (Số lô), `expiry_date` (Hạn dùng), `doc_quantity` (SL chứng từ), `actual_quantity` (SL thực nhập), `unit_price` (Đơn giá), `total_price` (Thành tiền).
4. **`STOCK_ISSUES` & `STOCK_ISSUE_ITEMS` (Phiếu xuất kho & Chi tiết)**:
   - *Master*: `id`, `issue_code` (PXK-YYYYMMDD-xxx), `issue_date`, `receiver_name`, `receiver_dept`, `reason` (Lý do xuất), `beneficiary_id`, `prescription_id`, `total_amount`, `status`, `created_by`.
   - *Items*: `id`, `issue_id`, `medicine_id`, `batch_number`, `expiry_date`, `requested_quantity` (SL yêu cầu), `actual_quantity` (SL thực xuất), `unit_price`, `total_price`.
5. **`PRESCRIPTIONS` & `PRESCRIPTION_ITEMS` (Đơn thuốc & Chi tiết kê đơn)**:
   - *Master*: `id`, `prescription_code` (DT-YYYYMMDD-xxx), `prescription_date`, `beneficiary_id`, `doctor_name`, `diagnosis` (Chẩn đoán theo dõi), `status` (Mới tạo / Chờ duyệt / Đang cấp / Hoàn thành / Hủy).
   - *Items*: `id`, `prescription_id`, `medicine_id`, `dosage` (Liều lượng: 1 viên/lần, 2 lần/ngày), `frequency`, `instructions` (Uống sau ăn), `prescribed_quantity` (Số lượng kê), `dispensed_quantity` (Số lượng đã cấp), `remaining_quantity` (Số lượng còn lại).
6. **`DISPENSATIONS` (Cấp phát thuốc)**:
   - `id`, `dispensation_code`, `prescription_id`, `beneficiary_id`, `dispensed_date`, `dispenser_name`, `items_summary`, `linked_issue_id`.
7. **`STOCK_TRANSACTIONS` (Sổ nhật ký giao dịch kho & Quản lý lô)**:
   - `id`, `transaction_date`, `type` (NHAP / XUAT / DIEU_CHINH), `ref_code`, `medicine_id`, `batch_number`, `expiry_date`, `quantity`, `unit_price`, `beneficiary_id`, `note`.

---

## 5. Quy Tắc Tính Tồn Kho, Đơn Giá & Công Thức Báo Cáo

### A. Quản lý lô và hạn sử dụng (Lot & FEFO Rules)
- Tồn kho luôn được tính theo bộ 4 thành phần: `(medicine_id, batch_number, expiry_date, unit_price)`.
- Khi lập phiếu xuất hoặc cấp phát, hệ thống tự động ưu tiên gợi ý các lô thuốc có hạn sử dụng gần nhất (First Expired, First Out).
- Đơn giá xuất kho của từng dòng mặt hàng kế thừa trực tiếp từ đơn giá nhập của chính số lô đó.
- Cảnh báo hạn dùng trực quan:
  - Màu đỏ: Đã hết hạn sử dụng (Khóa không cho phép xuất kho).
  - Màu vàng cam: Cận hạn sử dụng trong vòng 30 - 60 ngày.
  - Màu xanh lá: Hạn dùng an toàn (> 60 ngày).

### B. Công thức Bảng Tổng Hợp Đối Tượng BHYT (Sheet "Báo Cáo")
Với mỗi loại thuốc của một đối tượng cụ thể trong kỳ báo cáo $[T_{\text{start}}, T_{\text{end}}]$:

1. **Tồn đầu kỳ ($Q_{\text{đầu}}, S_{\text{đầu}}$)**:
   $$Q_{\text{đầu}} = \sum \text{Nhập trước } T_{\text{start}} - \sum \text{Xuất trước } T_{\text{start}}$$
   $$S_{\text{đầu}} = \sum (\text{SL từng lô tồn đầu} \times \text{Đơn giá lô})$$
2. **Nhập trong kỳ ($Q_{\text{nhập}}, S_{\text{nhập}}$)**:
   $$Q_{\text{nhập}} = \sum \text{Thực nhập trong khoảng } [T_{\text{start}}, T_{\text{end}}]$$
   $$S_{\text{nhập}} = \sum (\text{SL thực nhập} \times \text{Đơn giá nhập})$$
3. **Tổng nhập ($Q_{\text{tổng nhập}}, S_{\text{tổng nhập}}$)**:
   $$Q_{\text{tổng nhập}} = Q_{\text{đầu}} + Q_{\text{nhập}}$$
   $$S_{\text{tổng nhập}} = S_{\text{đầu}} + S_{\text{nhập}}$$
4. **Xuất trong kỳ ($Q_{\text{xuất}}, S_{\text{xuất}}$)**:
   $$Q_{\text{xuất}} = \sum \text{Thực xuất cho đối tượng trong khoảng } [T_{\text{start}}, T_{\text{end}}]$$
   $$S_{\text{xuất}} = \sum (\text{SL thực xuất} \times \text{Đơn giá lô xuất})$$
5. **Tồn cuối kỳ ($Q_{\text{cuối}}, S_{\text{cuối}}$)**:
   $$Q_{\text{cuối}} = Q_{\text{tổng nhập}} - Q_{\text{xuất}}$$
   $$S_{\text{cuối}} = S_{\text{tổng nhập}} - S_{\text{xuất}}$$
   *(Đảm bảo tính đối chiếu chính xác tuyệt đối: Số dư cuối kỳ trên báo cáo khớp hoàn toàn với số dư chi tiết từng lô trong kho tại thời điểm $T_{\text{end}}$).*

---

## 6. Quy Trình Phân Quyền & Bảo Mật

1. **Quy trình đăng ký & duyệt tài khoản**:
   - Nhân viên đăng ký tài khoản -> Trạng thái: `PENDING_APPROVAL` (Chờ phê duyệt).
   - Quản trị viên (Admin) kiểm tra thông tin nhân sự, gán vai trò tương ứng -> Trạng thái chuyển thành `ACTIVE`.
   - Các vai trò (Roles):
     - `ADMIN`: Quản trị hệ thống, phê duyệt người dùng, cấu hình đơn vị.
     - `DOCTOR`: Lập đơn thuốc, quản lý hồ sơ đối tượng y tế.
     - `PHARMACIST` / `WAREHOUSE_KEEPER`: Quản lý danh mục thuốc, nhập kho, xuất kho, theo dõi hạn dùng.
     - `LEADER` / `ACCOUNTANT`: Xem báo cáo, phê duyệt phiếu, kiểm tra đối soát số liệu.
2. **Bảo mật dữ liệu cá nhân & sức khỏe**:
   - Dữ liệu đối tượng bảo trợ được phân quyền truy cập nghiêm ngặt.
   - Toàn bộ thao tác thêm, sửa, xóa, duyệt chứng từ đều lưu lại trong bảng `AUDIT_LOGS` (Ai làm, lúc nào, thay đổi nội dung gì).
   - Tuyệt đối không xóa cứng (Hard Delete) các thuốc hoặc chứng từ đã phát sinh giao dịch xuất nhập nhằm bảo toàn lịch sử sổ sách.

---

## 7. Các Bước Triển Khai Chi Tiết (Implementation Steps)

1. **Bước 1**: Xây dựng cấu trúc dữ liệu nền tảng, Data Engine, Mock/Initial Data thực tế bám sát nghiệp vụ Trung tâm Bảo trợ xã hội Đà Nẵng.
2. **Bước 2**: Hoàn thiện phân hệ Danh mục Thuốc và Hồ sơ Đối tượng (tìm kiếm nhanh, phân loại nguồn thuốc, thông tin BHYT).
3. **Bước 3**: Xây dựng phân hệ Nhập kho theo chuẩn biểu mẫu Excel (quản lý số hóa đơn, số lô, hạn dùng, tính tiền tự động, chuyển đổi thành tiền ra chữ).
4. **Bước 4**: Xây dựng phân hệ Quản lý Đơn thuốc & Cấp phát thuốc cho đối tượng (kiểm tra tồn kho khả dụng, trừ dần số lượng kê đơn).
5. **Bước 5**: Xây dựng phân hệ Xuất kho (liên kết đơn thuốc/đối tượng, kiểm tra lô theo hạn dùng FEFO, chống xuất âm).
6. **Bước 6**: Xây dựng phân hệ Báo cáo Tổng hợp Nhập - Xuất - Tồn theo Đối tượng có BHYT (chuẩn form Sheet Báo cáo) kèm bộ lọc thời gian và xuất dữ liệu.
7. **Bước 7**: Xây dựng mẫu in chuyên dụng khổ A4 cho Phiếu nhập kho, Phiếu xuất kho và Bảng tổng hợp báo cáo đối tượng.
8. **Bước 8**: Tích hợp tính năng đồng bộ dữ liệu Google Sheets / Google Drive và kiểm thử toàn diện 25 ca nghiệp vụ.
