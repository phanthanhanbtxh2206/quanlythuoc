/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const BACKUP_GUIDE_MARKDOWN = `# TÀI LIỆU HƯỚNG DẪN CHI TIẾT
# CẤU TRÚC ĐỒNG BỘ HAI CHIỀU GOOGLE SHEETS 04 SHEET VÀ GOOGLE DRIVE
### Hệ Thống Quản Lý Thuốc & Kho Dược - Sở Y tế thành phố Đà Nẵng
*Đơn vị: Trung tâm Bảo trợ xã hội Đà Nẵng — Phòng Y Tế - Phục Hồi Chức Năng*  
*Mã quan hệ ngân sách (Mã QHNS): 1041008*

---

## MỤC LỤC
1. [Tổng quan nguyên lý đồng bộ hai chiều (Google Sheets & Drive)](#1-tong-quan-nguyen-ly-dong-bo-hai-chieu)
2. [Cơ chế bảo mật phiên & đồng bộ ngầm (Không lưu dữ liệu lâu dài tại trình duyệt)](#2-co-che-bao-mat-phien-va-dong-bo-ngam)
3. [Cấu trúc tối ưu 04 Sheet trên Google Sheets](#3-cau-truc-toi-uu-04-sheet-tren-google-sheets)
4. [Hướng dẫn thao tác nhập / tải tệp 04 Sheet (.xlsx / .csv)](#4-huong-dan-thao-tac-nhap-tep-04-sheet)
5. [Cấu trúc cây thư mục lưu trữ chứng từ & Snapshot JSON trên Google Drive](#5-cau-truc-cay-thu-muc-luu-tru-google-drive)
6. [Quy trình in và lưu trữ chứng từ PDF lên Google Drive](#6-quy-trinh-in-va-luu-tru-chung-tu-pdf-len-google-drive)
7. [Quy trình đồng bộ ngược & phục hồi từ Sheet Tài khoản / Drive JSON](#7-quy-trinh-dong-bo-nguoc-va-phuc-hoi)
8. [Các lưu ý nghiệp vụ đặc thù (Quyền sở hữu phiếu, Phòng ban đăng ký, Mẫu BTC)](#8-cac-luu-y-nghiep-vu-dac-thu)

---

## 1. TỔNG QUAN NGUYÊN LÝ ĐỒNG BỘ HAI CHIỀU

Hệ thống quản lý thuốc của Trung tâm Bảo trợ xã hội Đà Nẵng (trực thuộc Sở Y tế thành phố Đà Nẵng) vận hành theo nguyên tắc:
- **Lưu trữ tập trung trên Google Cloud**: Dữ liệu hoạt động chỉ lưu tạm trong bộ nhớ phiên làm việc hiện tại (\`sessionStorage\`) và được đồng bộ hai chiều trực tiếp lên Google Sheets & Google Drive (\`btxh_pharmacy_state.json\`).
- **Tối ưu hóa cấu trúc Google Sheets**: Tổ chức thành đúng **04 Sheet** chuẩn hóa:
  1. **Sheet "Phiếu nhập"**: Theo dõi toàn bộ thuốc nhập kho gom nhóm theo từng đối tượng nuôi dưỡng / đối tượng hưởng.
  2. **Sheet "Phiếu xuất"**: Theo dõi toàn bộ thuốc đã xuất kho / cấp phát gom nhóm theo từng đối tượng.
  3. **Sheet "Báo cáo"**: Bảng tổng hợp nhập, xuất, tồn thuốc mua ngoài cho đối tượng có bảo hiểm y tế (BHYT).
  4. **Sheet "Tài khoản"**: Lưu trữ và đồng bộ hai chiều danh sách cán bộ, email, phòng ban, vai trò, trạng thái duyệt và mật khẩu.

---

## 2. CƠ CHẾ BẢO MẬT PHIÊN VÀ ĐỒNG BỘ NGẦM

### 2.1. Đăng xuất tự động & bảo vệ phiên làm việc
- Khi mở ứng dụng ở phiên làm việc mới, hệ thống yêu cầu xác thực tài khoản trước khi truy cập kho dữ liệu.
- Nếu không phát sinh thao tác trên hệ thống trong vòng **60 phút (01 giờ)**, phiên làm việc tự động kết thúc và quay về màn hình đăng nhập.

### 2.2. Tự động đồng bộ hai chiều qua Google Apps Script Bridge
Khi Quản trị viên gắn URL Google Apps Script Web App:
- Mọi thay đổi phát sinh ở **Phiếu nhập kho**, **Phiếu xuất kho**, **Quản trị tài khoản (Tạo/Sửa/Duyệt/Khóa)** hoặc **Cấu hình biểu mẫu** tự động đẩy lên 04 Sheet và tệp \`btxh_pharmacy_state.json\` trên Google Drive.
- Trước khi đăng nhập hoặc khi bấm **Kéo Dữ Liệu Hai Chiều Về Máy**, ứng dụng đọc lại danh sách tài khoản từ tab **Tài khoản** và toàn bộ trạng thái kho từ Google Drive JSON.

---

## 3. CẤU TRÚC TỐI ƯU 04 SHEET TRÊN GOOGLE SHEETS

### 3.1. SHEET 1: "Phiếu nhập"
Mỗi dòng là một đối tượng hưởng thuốc nhập kho gồm: STT, Họ tên đối tượng, Mã/Thẻ BHYT, Khu phòng, Số PNK, Ngày nhập, Nhà cung cấp, Hóa đơn, Danh mục thuốc & số lượng, Tổng SL nhập, Tổng tiền VNĐ, Ghi chú.

### 3.2. SHEET 2: "Phiếu xuất"
Mỗi dòng là một đối tượng nhận thuốc xuất kho gồm: STT, Họ tên đối tượng, Mã/Thẻ BHYT, Khu phòng điều trị, Số PXK, Ngày xuất, Người nhận, Lý do xuất, Danh mục thuốc & số lượng, Tổng SL xuất, Tổng giá trị VNĐ, Trạng thái.

### 3.3. SHEET 3: "Báo cáo"
*(BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ)*
Gồm 16 cột chuẩn: STT, Họ tên đối tượng, Mã thẻ BHYT, Khu phòng, Danh mục thuốc theo dõi, Tồn đầu kỳ (SL, Tiền), Nhập trong kỳ (SL, Tiền), Tổng nhập (SL, Tiền), Xuất trong kỳ (SL, Tiền), Tồn cuối kỳ (SL, Tiền), Ghi chú.

### 3.4. SHEET 4: "Tài khoản"
Đồng bộ hai chiều thông tin hồ sơ tài khoản hệ thống:
- Cột 1: Mã tài khoản (ID)
- Cột 2: Họ và tên cán bộ
- Cột 3: Email đăng nhập
- Cột 4: Số điện thoại
- Cột 5: Phòng ban / Đơn vị (Phòng Y tế - Phục hồi chức năng / Phòng CTXH&CSND / Phòng TH-HC-KT)
- Cột 6: Vai trò nghiệp vụ (ADMIN / PHARMACIST / DOCTOR / ACCOUNTANT / LEADER)
- Cột 7: Trạng thái (ACTIVE / PENDING_APPROVAL / LOCKED / DISABLED / REJECTED)
- Cột 8: Mật khẩu
- Cột 9: Ngày tạo
- Cột 10: Người phê duyệt & ngày duyệt

---

## 4. HƯỚNG DẪN THAO TÁC NHẬP TỆP 04 SHEET

Hệ thống cung cấp 2 định dạng tải về tiện lợi:
1. **Định dạng Excel đa trang tính (.xlsx)**: Mở trực tiếp trên Google Sheets nhận diện đủ 4 tab: Phiếu nhập, Phiếu xuất, Báo cáo, Tài khoản.
2. **Định dạng CSV chuẩn UTF-8 (.csv)**: Phân cách rõ ràng 4 phân hệ bằng tiêu đề bảng.

---

## 5. CẤU TRÚC CÂY THƯ MỤC LƯU TRỮ GOOGLE DRIVE

\`\`\`text
QUAN_LY_THUOC_TRUNG_TAM/
├── btxh_pharmacy_state.json    (Bản sao lưu toàn vẹn trạng thái hệ thống 2 chiều)
└── 2026/
    ├── PHIEU_NHAP/ (PNK-20261002-001.pdf)
    ├── PHIEU_XUAT/ (PXK-20261005-001.pdf)
    └── BAO_CAO/    (BaoCao_BHYT_NguyenVanAn_202610.pdf)
\`\`\`

---

## 6. QUY TRÌNH IN VÀ LƯU TRỮ CHỨNG TỪ PDF LÊN GOOGLE DRIVE

1. Tại màn hình Phiếu Nhập, Phiếu Xuất hoặc Báo Cáo, nhấp nút In chứng từ.
2. Kiểm tra tiêu ngữ cơ quan chủ quản: **Sở Y tế thành phố Đà Nẵng — Trung tâm Bảo trợ xã hội Đà Nẵng — Phòng Y tế - PHCN (Mã QHNS: 1041008)**.
3. Chọn máy in "Lưu dưới dạng PDF" hoặc bấm đồng bộ để tải lên Google Drive.

---

## 7. QUY TRÌNH ĐỒNG BỘ NGƯỢC & PHỤC HỒI

- **Phục hồi tự động khi mở phiên mới**: Ứng dụng đọc tự động từ Google Sheets (tab Tài khoản) & tệp \`btxh_pharmacy_state.json\` trên Google Drive nếu đã gắn Apps Script Web App URL.
- **Công thức cân đối**: Tồn cuối kỳ = Tồn đầu kỳ + Nhập trong kỳ - Xuất trong kỳ.

---

## 8. CÁC LƯU Ý NGHIỆP VỤ ĐẶC THÙ

1. **Quyền sở hữu chứng từ**: Chỉ tài khoản tạo ra phiếu nhập/phiếu xuất đó (hoặc Quản trị viên ADMIN) mới được chỉnh sửa hoặc xóa nội dung phiếu.
2. **Phòng ban đăng ký tài khoản**: Chỉ bao gồm 03 phòng chính thức: *Phòng Y tế - Phục hồi chức năng*, *Phòng CTXH&CSND*, *Phòng TH-HC-KT*.
3. **Không lưu dữ liệu tồn đọng trên ổ cứng trình duyệt**: Khi kết thúc phiên hoặc đóng trình duyệt, phiên đăng nhập tự hủy; dữ liệu chính thức luôn nằm trên Google Sheets và Google Drive.

---
Hệ Thống Quản Lý Thuốc & Kho Dược — Sở Y tế thành phố Đà Nẵng / Trung Tâm Bảo Trợ Xã Hội Đà Nẵng
`;

/**
 * Trigger immediate browser download of the Markdown instruction file
 */
export const downloadBackupGuideFile = () => {
  const blob = new Blob(['\uFEFF' + BACKUP_GUIDE_MARKDOWN], {
    type: 'text/markdown;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'HUONG_DAN_DONG_BO_4_SHEET_VA_GOOGLE_DRIVE.md');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
