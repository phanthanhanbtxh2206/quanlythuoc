/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const BACKUP_GUIDE_MARKDOWN = `# TÀI LIỆU HƯỚNG DẪN CHI TIẾT
# CẤU TRÚC LƯU TRỮ & ĐỒNG BỘ HAI CHIỀU TRÊN 01 TỆP GOOGLE SHEETS (10 TAB)
### Hệ Thống Quản Lý Thuốc & Kho Dược - Sở Y tế thành phố Đà Nẵng
*Đơn vị: Trung tâm Bảo trợ xã hội Đà Nẵng — Phòng Y Tế - Phục Hồi Chức Năng*  
*Mã quan hệ ngân sách (Mã QHNS): 1041008*

---

## 1. NGUYÊN LÝ LƯU TRỮ TẬP TRUNG 100% TRÊN GOOGLE SHEETS

- **Một tệp Google Sheets duy nhất gồm 10 tab chuẩn hóa**: Toàn bộ tài khoản cán bộ, danh mục thuốc, đối tượng BHYT, phiếu nhập kho, phiếu xuất kho, đơn thuốc, giao dịch và cấu hình biểu mẫu được lưu và tự động đồng bộ hai chiều trực tiếp trên Google Sheets (không phụ thuộc tệp JSON trên Google Drive).
- **URL Apps Script v3 dùng chung toàn hệ thống**: Quản trị viên chỉ cần cấu hình URL Google Apps Script Web App một lần trong mục **Đồng Bộ Sheets & Drive**, hệ thống lưu địa chỉ kết nối chung trên máy chủ để mọi trình duyệt, thiết bị và cán bộ tự động đồng bộ ngay cả khi chưa đăng nhập.
- **Chống mất dữ liệu đăng ký đa thiết bị**: Thao tác \`REGISTER_ACCOUNT\` và \`UPDATE_ACCOUNT\` trên Google Apps Script v3 sử dụng \`LockService\` để ghi nguyên tử vào tab \`Tài khoản\`, giúp tài khoản đăng ký mới từ bất kỳ máy nào đều hiện ngay trong mục **Phân Quyền & Cán Bộ** để Admin phê duyệt.

---

## 2. CẤU TRÚC 10 TAB TRONG GOOGLE SHEETS

### A. 04 Tab Chính (Báo cáo & Tài khoản)
1. **Phiếu nhập**: Tổng hợp chứng từ nhập kho theo từng đối tượng hưởng thuốc.
2. **Phiếu xuất**: Tổng hợp chứng từ xuất kho / cấp phát theo từng đối tượng.
3. **Báo cáo**: Bảng tổng hợp Tồn đầu kỳ, Nhập trong kỳ, Tổng nhập, Xuất trong kỳ, Tồn cuối kỳ thuốc mua ngoài BHYT.
4. **Tài khoản**: Lưu trữ và đồng bộ 2 chiều hồ sơ cán bộ (\`ID tài khoản\`, \`Họ và tên\`, \`Email đăng nhập\`, \`Mật khẩu\`, \`Số điện thoại\`, \`Phòng ban / Đơn vị\`, \`Vai trò\`, \`Trạng thái\`, \`Ngày tạo\`, \`Ngày duyệt\`, \`Người duyệt\`).

### B. 06 Tab Dữ Liệu Hệ Thống
5. **DanhMuc_Thuoc**: Danh mục thuốc, hoạt chất, hàm lượng, ĐVT, quy cách, đường dùng, tồn tối thiểu.
6. **DoiTuong**: Hồ sơ đối tượng bảo trợ, năm sinh, CCCD, số thẻ BHYT, khu phòng.
7. **ChiTiet_PhieuNhap**: Dữ liệu đầy đủ từng phiếu nhập kho và chi tiết lô/đơn giá/số lượng (\`ChiTietJSON\`).
8. **ChiTiet_PhieuXuat**: Dữ liệu đầy đủ từng phiếu xuất kho và chi tiết lô/số lượng (\`ChiTietJSON\`).
9. **DonThuoc_GiaoDich**: Đơn thuốc, sổ nhật ký giao dịch xuất/nhập kho và nhật ký kiểm toán gần nhất.
10. **CauHinh_BieuMau**: Tiêu ngữ, tên đơn vị chủ quản, mã QHNS, tiêu đề biểu mẫu và chức danh chữ ký mặc định.

---

## 3. HƯỚNG DẪN CẬP NHẬT APPS SCRIPT V3

1. Mở tệp Google Sheets của đơn vị → **Tiện ích mở rộng (Extensions) → Apps Script**.
2. Sao chép mã nguồn \`Code.gs (v3)\` trong mục **Đồng Bộ Sheets & Drive** và dán thay thế toàn bộ mã cũ, bấm **Lưu (Ctrl + S)**.
3. Chọn **Triển khai (Deploy) → Quản lý các bản triển khai → Chỉnh sửa (biểu tượng bút chì) → Phiên bản: "Phiên bản mới (New version)"** với quyền truy cập **Bất kỳ ai (Anyone)** → **Triển khai**.
4. Bấm **Kiểm tra kết nối** trong ứng dụng; nếu bảng tính mới chưa có dữ liệu, hệ thống giữ nguyên dữ liệu hiện tại và tự động khởi tạo đầy đủ 10 tab lên Google Sheets.

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
  link.setAttribute('download', 'HUONG_DAN_DONG_BO_10_TAB_GOOGLE_SHEETS.md');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
