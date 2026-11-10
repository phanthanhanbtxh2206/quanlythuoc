# TÀI LIỆU HƯỚNG DẪN CHI TIẾT
# CẤU TRÚC SAO LƯU GOOGLE SHEETS TỐI ƯU 03 SHEET VÀ GOOGLE DRIVE
### Hệ Thống Quản Lý Thuốc & Kho Dược - Trung Tâm Bảo Trợ Xã Hội Đà Nẵng
*Bộ phận: Phòng Y Tế - Phục Hồi Chức Năng*  
*Mã quan hệ ngân sách (Mã QHNS): 1041008*

---

## MỤC LỤC
1. [Tổng quan nguyên lý tự động sao lưu](#1-tong-quan-nguyen-ly-tu-dong-sao-luu)
2. [Cơ chế tự động sao lưu ngầm (Background Auto-Backup)](#2-co-che-tu-dong-sao-luu-ngam-background-auto-backup)
3. [Cấu trúc tối ưu 03 Sheet trên Google Sheets (Mỗi đối tượng nằm trên một dòng)](#3-cau-truc-toi-uu-03-sheet-tren-google-sheets)
4. [Hướng dẫn thao tác nhập (Import) tệp 03 Sheet vào Google Sheets](#4-huong-dan-thao-tac-nhap-import-tep-03-sheet-vao-google-sheets)
5. [Cấu trúc cây thư mục lưu trữ chứng từ trên Google Drive](#5-cau-truc-cay-thu-muc-luu-tru-chung-tu-tren-google-drive)
6. [Quy trình in và lưu trữ chứng từ PDF lên Google Drive](#6-quy-trinh-in-va-luu-tru-chung-tu-pdf-len-google-drive)
7. [Quy trình đối soát số liệu và phục hồi khi có sự cố](#7-quy-trinh-doi-soat-so-lieu-va-phuc-hoi-khi-co-su-co)
8. [Các lưu ý nghiệp vụ đặc thù (Bỏ HSD, nhập tự do tên đối tượng, người ký)](#8-cac-luu-y-nghiep-vu-dac-thu)

---

## 1. TỔNG QUAN NGUYÊN LÝ TỰ ĐỘNG SAO LƯU

Hệ thống quản lý thuốc của Trung tâm Bảo trợ xã hội Đà Nẵng vận hành theo nguyên tắc:
- **Nhập liệu một lần - Dữ liệu kế thừa xuyên suốt**: Cán bộ y tế chỉ cần thao tác trực tiếp trên các biểu mẫu Phiếu Nhập, Phiếu Xuất và Báo Cáo.
- **Tối ưu hóa cấu trúc sao lưu Google Sheets**: Dữ liệu sao lưu được tổ chức thành đúng **03 Sheet** tương ứng với 3 phân hệ nghiệp vụ cốt lõi:
  1. **Sheet "Phiếu nhập"**: Theo dõi toàn bộ thuốc nhập kho gom nhóm theo từng đối tượng nuôi dưỡng / đối tượng hưởng.
  2. **Sheet "Phiếu xuất"**: Theo dõi toàn bộ thuốc đã xuất kho / cấp phát gom nhóm theo từng đối tượng.
  3. **Sheet "Báo cáo"**: Bảng tổng hợp nhập, xuất, tồn thuốc mua ngoài cho đối tượng có bảo hiểm y tế (BHYT).
- **Quy chuẩn hiển thị**: **Tại mỗi sheet, mỗi tên đối tượng sẽ nằm trên một dòng riêng biệt**, kèm dòng tổng cộng toàn đơn vị ở cuối bảng.

---

## 2. CƠ CHẾ TỰ ĐỘNG SAO LƯU NGẦM (BACKGROUND AUTO-BACKUP)

### 2.1. Tự động hóa hoàn toàn
Hệ thống ngầm sao lưu ngay lập tức khi phát sinh bất kỳ thao tác:
- Lập mới, cập nhật, điều chỉnh hoặc xóa **Phiếu nhập kho**.
- Lập mới, cập nhật, điều chỉnh hoặc xóa **Phiếu xuất kho**.
- Lập hoặc tính toán lại **Bảng tổng hợp đối tượng BHYT**.
- Hiệu chỉnh thông số cơ quan, mã QHNS hoặc 5 chức danh ký duyệt.

### 2.2. Giám sát trạng thái trực quan
- Thanh công cụ đầu trang hiển thị chấm xanh nhấp nháy: **"Đang hoạt động tự động"**.
- Hiển thị nội dung thao tác vừa được sao lưu và mốc thời gian chính xác đến từng giây.
- Cho phép người dùng bấm **"Sao lưu ngay"** để chốt số liệu tức thì.

---

## 3. CẤU TRÚC TỐI ƯU 03 SHEET TRÊN GOOGLE SHEETS
*(Đặc tả chi tiết: Tại mỗi sheet, mỗi tên đối tượng sẽ nằm trên một dòng)*

### 3.1. SHEET 1: "Phiếu nhập"
Mỗi dòng là một đối tượng hưởng thuốc nhập kho:

| Cột | Tên trường hiển thị | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- |
| 1 | `STT` | Số thứ tự dòng đối tượng (1, 2, 3...) |
| 2 | `Họ và tên đối tượng` | **Mỗi tên đối tượng nằm trên một dòng riêng biệt** (kể cả đối tượng tự do) |
| 3 | `Mã số / Số thẻ BHYT` | Mã số hồ sơ nội bộ hoặc mã thẻ BHYT của đối tượng |
| 4 | `Khu phòng / Nơi ở` | Khu nuôi dưỡng, điều trị hoặc phòng lưu trú |
| 5 | `Số phiếu nhập kho` | Danh sách các số phiếu nhập liên quan (PNK-20261002-001, ...) |
| 6 | `Ngày nhập` | Các ngày phát sinh giao dịch nhập kho |
| 7 | `Người giao / Nhà cung cấp` | Tên người giao hàng hoặc công ty dược cung ứng |
| 8 | `Số hóa đơn chứng từ` | Số hóa đơn tài chính và ngày lập hóa đơn mua ngoài |
| 9 | `Danh mục thuốc & Số lượng nhập` | Chi tiết tên thuốc, số lô và số lượng đã nhập cho đối tượng |
| 10 | `Tổng số lượng nhập` | Tổng số đơn vị thuốc (viên/lọ/gói) thực nhập cho đối tượng |
| 11 | `Tổng tiền nhập kho (VNĐ)` | Tổng giá trị bằng tiền thuốc đã mua ngoài nhập kho |
| 12 | `Ghi chú nghiệp vụ` | Đánh giá tình trạng chứng từ (Đã nhập kho, số lượng phiếu) |
*Dòng cuối cùng: `TỔNG CỘNG TẤT CẢ ĐỐI TƯỢNG` tổng hợp toàn bộ số lượng và số tiền.*

---

### 3.2. SHEET 2: "Phiếu xuất"
Mỗi dòng là một đối tượng hưởng thuốc xuất kho / cấp phát:

| Cột | Tên trường hiển thị | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- |
| 1 | `STT` | Số thứ tự dòng đối tượng |
| 2 | `Họ và tên đối tượng` | **Mỗi tên đối tượng nằm trên một dòng riêng biệt** |
| 3 | `Mã số / Số thẻ BHYT` | Mã số quản lý hoặc số thẻ BHYT |
| 4 | `Khu phòng điều trị` | Khu phòng sử dụng thuốc thực tế |
| 5 | `Số phiếu xuất kho` | Danh sách các số phiếu xuất liên quan (PXK-20261005-001, ...) |
| 6 | `Ngày xuất kho` | Các ngày cấp phát, xuất thuốc |
| 7 | `Người nhận thuốc` | Cán bộ y tế phụ trách nhận hoặc người bệnh |
| 8 | `Lý do xuất thuốc` | Lý do xuất kho (Điều trị định kỳ, cấp phát ngoại trú,...) |
| 9 | `Danh mục thuốc & Số lượng xuất` | Chi tiết tên thuốc, số lô và số lượng đã xuất cho đối tượng |
| 10 | `Tổng số lượng xuất` | Tổng số đơn vị thuốc đã cấp cho đối tượng |
| 11 | `Tổng giá trị xuất kho (VNĐ)` | Tổng giá trị tiền thuốc đã xuất |
| 12 | `Trạng thái chứng từ` | Tình trạng cấp phát thực tế |
*Dòng cuối cùng: `TỔNG CỘNG TẤT CẢ ĐỐI TƯỢNG` tổng hợp toàn bộ số lượng và số tiền.*

---

### 3.3. SHEET 3: "Báo cáo"
*(BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ)*
Mỗi dòng là một đối tượng, thể hiện xuyên suốt chu trình Tồn đầu - Nhập - Xuất - Tồn cuối:

| Cột | Tên chỉ tiêu | Ý nghĩa nghiệp vụ |
| :---: | :--- | :--- |
| 1 | `STT` | Số thứ tự |
| 2 | `Họ và tên đối tượng` | **Mỗi tên đối tượng nằm trên một dòng riêng biệt** |
| 3 | `Mã thẻ BHYT` | Số thẻ BHYT phục vụ thanh quyết toán |
| 4 | `Khu phòng` | Khu phòng quản lý |
| 5 | `Danh mục thuốc theo dõi` | Các loại thuốc đối tượng đang sử dụng |
| 6 | `Tồn đầu kỳ - Số lượng` | Lượng thuốc còn dư từ trước kỳ báo cáo |
| 7 | `Tồn đầu kỳ - Thành tiền (VNĐ)` | Giá trị tiền thuốc tồn đầu kỳ |
| 8 | `Nhập trong kỳ - Số lượng` | Lượng thuốc nhập mua ngoài phát sinh trong kỳ |
| 9 | `Nhập trong kỳ - Thành tiền (VNĐ)` | Giá trị tiền thuốc nhập trong kỳ |
| 10 | `Tổng nhập - Số lượng` | `= Tồn đầu kỳ + Nhập trong kỳ` |
| 11 | `Tổng nhập - Thành tiền (VNĐ)` | `= Tiền tồn đầu kỳ + Tiền nhập trong kỳ` |
| 12 | `Xuất trong kỳ - Số lượng` | Lượng thuốc đã xuất dùng cho đối tượng trong kỳ |
| 13 | `Xuất trong kỳ - Thành tiền (VNĐ)` | Giá trị tiền thuốc đã xuất |
| 14 | `Tồn cuối kỳ - Số lượng` | `= Tổng nhập - Xuất trong kỳ` |
| 15 | `Tồn cuối kỳ - Thành tiền (VNĐ)` | `= Tiền tổng nhập - Tiền xuất trong kỳ` |
| 16 | `Ghi chú / Tình trạng` | Đánh giá tồn tủ thuốc đối tượng |
*Dòng cuối cùng: `TỔNG CỘNG TẤT CẢ ĐỐI TƯỢNG` cân đối toàn diện số liệu.*

---

## 4. HƯỚNG DẪN THAO TÁC NHẬP (IMPORT) TỆP 03 SHEET VÀO GOOGLE SHEETS

Hệ thống cung cấp 2 định dạng tải về tiện lợi:
1. **Định dạng Excel đa trang tính (`.xlsx`)**: Tải về và mở trực tiếp trên Google Sheets, lập tức nhận diện đúng 3 tab: `Phiếu nhập`, `Phiếu xuất`, `Báo cáo`.
2. **Định dạng CSV chuẩn UTF-8 (`.csv`)**: Phân cách rõ ràng 3 phân hệ bằng tiêu đề bảng.

### Các bước mở trên Google Sheets:
- **Cách 1: Mở trực tiếp file Excel (.xlsx)**:
  1. Bấm nút **"Xuất Google Sheets (03 Sheet)"** trên thanh tác vụ của ứng dụng để tải file `.xlsx`.
  2. Truy cập [Google Drive](https://drive.google.com), kéo thả file `.xlsx` vào Drive.
  3. Nhấp đúp vào file để mở trực tiếp dưới dạng Google Sheets với đầy đủ 3 trang tính riêng biệt.
- **Cách 2: Nhập vào bảng tính hiện có (Import)**:
  1. Trong Google Sheets, chọn **Tệp (File) > Nhập (Import)**.
  2. Chọn thẻ **Tải lên (Upload)** và chọn file đã tải về.
  3. Chọn **Thay thế bảng tính hiện tại** và bấm **Nhập dữ liệu**.

---

## 5. CẤU TRÚC CÂY THƯ MỤC LƯU TRỮ CHỨNG TỪ TRÊN GOOGLE DRIVE

```text
QUAN_LY_THUOC_TRUNG_TAM/
│
├── 2026/
│   ├── PHIEU_NHAP/
│   │   ├── PNK-20261002-001.pdf
│   │   └── ...
│   ├── PHIEU_XUAT/
│   │   ├── PXK-20261005-001.pdf
│   │   └── ...
│   └── BAO_CAO/
│       ├── BaoCao_BHYT_NguyenVanAn_202610.pdf
│       └── ...
└── 2027/
    ├── PHIEU_NHAP/
    ├── PHIEU_XUAT/
    └── BAO_CAO/
```

---

## 6. QUY TRÌNH IN VÀ LƯU TRỮ CHỨNG TỪ PDF LÊN GOOGLE DRIVE

1. Tại màn hình Phiếu Nhập, Phiếu Xuất hoặc Báo Cáo, nhấp nút **In chứng từ**.
2. Kiểm tra thông tin hành chính được tự động điền:
   - Tên đơn vị: *Trung tâm Bảo trợ xã hội Đà Nẵng*
   - Bộ phận: *Phòng Y tế - PHCN*
   - Mã QHNS: *1041008*
   - Bảng kê số lô, số lượng, đơn giá, thành tiền (đã loại bỏ cột Hạn sử dụng).
   - Tổng tiền bằng chữ và 5 khung chữ ký thẩm quyền.
3. Chọn máy in là **Lưu dưới dạng PDF (Save as PDF)** và tải file lên thư mục Google Drive tương ứng theo năm.

---

## 7. QUY TRÌNH ĐỐI SOÁT SỐ LIỆU VÀ PHỤC HỒI KHI CÓ SỰ CỐ

### 7.1. Công thức cân đối kế toán kho dược
Tại mọi thời điểm và trên từng dòng của mỗi đối tượng:
$$\text{Tồn cuối kỳ} = \text{Tồn đầu kỳ} + \text{Nhập trong kỳ} - \text{Xuất trong kỳ}$$
$$\text{Tổng nhập} = \text{Tồn đầu kỳ} + \text{Nhập trong kỳ}$$
$$\text{Tiền tồn cuối} = \text{Tiền tổng nhập} - \text{Tiền xuất trong kỳ}$$

### 7.2. Phục hồi dữ liệu
Khi đổi thiết bị làm việc, mở file Google Sheets sao lưu gần nhất để đối chiếu số liệu và rà soát lại các phiếu nhập/xuất đã lập.

---

## 8. CÁC LƯU Ý NGHIỆP VỤ ĐẶC THÙ

1. **Bỏ nội dung Hạn dùng (HSD)**: Mọi bảng tính trên Google Sheets, biểu mẫu nhập/xuất và bản in chứng từ đều không còn cột Hạn dùng, chỉ quản lý theo Số lô thuốc.
2. **Cho phép tự do gõ tên đối tượng**: Cán bộ có thể chọn từ danh sách đối tượng nuôi dưỡng hoặc tự gõ tên đối tượng mới; hệ thống đều tự động cấp phát dòng riêng cho đối tượng đó trên cả 3 sheet.
3. **Hiệu chỉnh thông tin mặc định**: Tại menu **"Cấu Hình Mặc Định"**, người dùng có thể tùy biến tên cơ quan, bộ phận, mã QHNS và họ tên của 5 vị trí ký duyệt bất cứ lúc nào.

---
*Hệ Thống Quản Lý Thuốc & Kho Dược - Trung Tâm Bảo Trợ Xã Hội Đà Nẵng*
