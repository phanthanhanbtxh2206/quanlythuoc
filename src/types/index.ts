/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'ADMIN' | 'DOCTOR' | 'PHARMACIST' | 'ACCOUNTANT' | 'LEADER';

export type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'LOCKED' | 'DISABLED';

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  phone?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface RolePermissions {
  canCreateReceipt: boolean;
  canEditReceipt: boolean;
  canDeleteReceipt: boolean;
  canCreateIssue: boolean;
  canEditIssue: boolean;
  canDeleteIssue: boolean;
  canEditReport: boolean;
  canExportReport: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canViewAudit: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canCreateReceipt: true,
    canEditReceipt: true,
    canDeleteReceipt: true,
    canCreateIssue: true,
    canEditIssue: true,
    canDeleteIssue: true,
    canEditReport: true,
    canExportReport: true,
    canManageSettings: true,
    canManageUsers: true,
    canViewAudit: true,
  },
  PHARMACIST: {
    canCreateReceipt: true,
    canEditReceipt: true,
    canDeleteReceipt: true,
    canCreateIssue: true,
    canEditIssue: true,
    canDeleteIssue: true,
    canEditReport: true,
    canExportReport: true,
    canManageSettings: false,
    canManageUsers: false,
    canViewAudit: false,
  },
  DOCTOR: {
    canCreateReceipt: false,
    canEditReceipt: false,
    canDeleteReceipt: false,
    canCreateIssue: true,
    canEditIssue: true,
    canDeleteIssue: false,
    canEditReport: false,
    canExportReport: true,
    canManageSettings: false,
    canManageUsers: false,
    canViewAudit: false,
  },
  ACCOUNTANT: {
    canCreateReceipt: false,
    canEditReceipt: false,
    canDeleteReceipt: false,
    canCreateIssue: false,
    canEditIssue: false,
    canDeleteIssue: false,
    canEditReport: false,
    canExportReport: true,
    canManageSettings: false,
    canManageUsers: false,
    canViewAudit: false,
  },
  LEADER: {
    canCreateReceipt: false,
    canEditReceipt: false,
    canDeleteReceipt: false,
    canCreateIssue: false,
    canEditIssue: false,
    canDeleteIssue: false,
    canEditReport: false,
    canExportReport: true,
    canManageSettings: false,
    canManageUsers: false,
    canViewAudit: true,
  },
};

export interface Beneficiary {
  id: string;
  code: string; // DT-001
  fullName: string;
  gender: 'Nam' | 'Nữ';
  birthYear: number;
  idCard?: string;
  insuranceNumber?: string; // Số thẻ BHYT
  roomArea: string; // Khu Người Cao Tuổi, Khu Tâm Thần, Khu Trẻ Em...
  status: 'Đang quản lý' | 'Tạm vắng' | 'Đã chuyển tuyến' | 'Đã xuất viện';
  note?: string;
  createdAt: string;
}

export interface Medicine {
  id: string;
  code: string; // TH-001
  name: string; // Tên biệt dược
  activeIngredient: string; // Hoạt chất
  concentration: string; // Hàm lượng (vd: 5mg, 500mg)
  unit: string; // Đơn vị tính: Viên, Lọ, Gói, Chai, Vỉ
  packaging: string; // Quy cách: Hộp 10 vỉ x 10 viên
  dosageForm: string; // Dạng bào chế: Viên nén, Viên nang, Siro, Hỗn dịch
  route: string; // Đường dùng: Uống, Tiêm, Nhỏ mắt, Bôi ngoài da
  manufacturer: string; // Nhà sản xuất / Nước SX
  category: string; // Nhóm thuốc: Tim mạch, Giảm đau, Tiêu hóa, Kháng sinh...
  minStockAlert: number; // Ngưỡng tồn tối thiểu cảnh báo
  status: 'Đang sử dụng' | 'Ngừng sử dụng';
  note?: string;
  createdAt: string;
}

export type MedicineSourceType = 'BHYT_MUA_NGOAI' | 'NGAN_SACH' | 'VIEN_TRO' | 'KHAC';

export interface MedicineSource {
  id: string;
  code: string;
  name: string;
  type: MedicineSourceType;
  description?: string;
}

export interface StockReceiptItem {
  id: string;
  receiptId: string;
  medicineId: string;
  batchNumber: string; // Số lô
  expiryDate?: string; // Hạn dùng (tùy chọn)
  docQuantity: number; // Số lượng theo chứng từ
  actualQuantity: number; // Số lượng thực nhập
  unitPrice: number; // Đơn giá
  totalPrice: number; // Thành tiền = actualQuantity * unitPrice
  note?: string;
}

export interface StockReceipt {
  id: string;
  receiptCode: string; // PNK-YYYYMMDD-001
  receiptDate: string;
  delivererName: string; // Họ tên người giao
  delivererDept: string; // Địa chỉ hoặc bộ phận giao
  supplierName: string; // Tên đơn vị phát hành hóa đơn
  invoiceNumber: string; // Số hóa đơn
  invoiceDate: string; // Ngày hóa đơn
  content: string; // Nội dung nhập kho
  sourceType: MedicineSourceType;
  beneficiaryId?: string; // ID đối tượng nếu có
  beneficiaryName?: string; // Tên đối tượng tự do người dùng nhập
  attachedDocCount?: number; // Số chứng từ kèm theo
  totalAmount: number;
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  approvedBy?: string;
  items?: StockReceiptItem[];
}

export interface StockIssueItem {
  id: string;
  issueId: string;
  medicineId: string;
  batchNumber: string;
  expiryDate?: string;
  requestedQuantity: number; // Số lượng yêu cầu
  actualQuantity: number; // Số lượng thực xuất
  unitPrice: number;
  totalPrice: number;
  note?: string;
}

export interface StockIssue {
  id: string;
  issueCode: string; // PXK-YYYYMMDD-001
  issueDate: string;
  receiverName: string; // Họ tên người nhận
  receiverDept: string; // Bộ phận hoặc địa chỉ người nhận
  reason: string; // Lý do xuất kho
  beneficiaryId: string; // Đối tượng cụ thể nhận thuốc
  beneficiaryName?: string; // Tên đối tượng tự do người dùng nhập
  prescriptionId?: string; // Mã đơn thuốc liên kết (nếu có)
  usageLocation: string; // Địa điểm sử dụng (Phòng Y tế, Trạm xá...)
  totalAmount: number;
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  approvedBy?: string;
  items?: StockIssueItem[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineId: string;
  dosage: string; // vd: 1 viên/lần
  frequency: string; // vd: 2 lần/ngày (Sáng 1, Chiều 1)
  route: string; // Uống
  instructions: string; // Sau khi ăn
  daysCount: number; // Số ngày dùng
  prescribedQuantity: number; // Tổng số lượng kê
  dispensedQuantity: number; // Số lượng đã cấp phát
}

export interface Prescription {
  id: string;
  code: string; // DT-YYYYMMDD-001
  prescriptionDate: string;
  beneficiaryId: string;
  doctorName: string;
  diagnosis: string; // Chẩn đoán
  status: 'DRAFT' | 'ACTIVE' | 'DISPENSING' | 'COMPLETED' | 'CANCELLED';
  note?: string;
  createdAt: string;
  items: PrescriptionItem[];
}

export interface DispensationItem {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  requestedQuantity: number;
  dispensedQuantity: number;
  unitPrice: number;
}

export interface Dispensation {
  id: string;
  code: string; // CP-YYYYMMDD-001
  dispensationDate: string;
  prescriptionId: string;
  beneficiaryId: string;
  dispenserName: string;
  status: 'COMPLETED' | 'CANCELLED';
  linkedIssueId?: string;
  note?: string;
  createdAt: string;
  items: DispensationItem[];
}

export interface LotStock {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  quantity: number; // Tồn khả dụng hiện tại
  beneficiaryId?: string; // Nếu lô thuốc mua ngoài riêng cho đối tượng
  sourceType: MedicineSourceType;
}

export interface StockTransaction {
  id: string;
  date: string;
  type: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT';
  refCode: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number; // Dương với Nhập, Âm với Xuất
  unitPrice: number;
  totalPrice: number;
  beneficiaryId?: string;
  note?: string;
  createdAt: string;
}

export interface BeneficiaryReportRow {
  stt: number;
  medicineId: string;
  medicineName: string;
  activeIngredient: string;
  concentration: string;
  unit: string;
  
  // Tồn đầu kỳ
  openingQty: number;
  openingPrice: number;
  openingAmount: number;
  
  // Nhập trong kỳ
  inQty: number;
  inPrice: number;
  inAmount: number;
  
  // Tổng nhập (= Tồn đầu + Nhập trong kỳ)
  totalInQty: number;
  totalInPrice: number;
  totalInAmount: number;
  
  // Xuất trong kỳ
  outQty: number;
  outPrice: number;
  outAmount: number;
  
  // Tồn cuối kỳ (= Tổng nhập - Xuất trong kỳ)
  closingQty: number;
  closingPrice: number;
  closingAmount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface DriveSyncedFile {
  id: string;
  fileId: string;
  docCode: string;
  docType: 'PHIEU_NHAP' | 'PHIEU_XUAT' | 'DON_THUOC' | 'BAO_CAO_BHYT';
  fileName: string;
  driveFolder: string;
  createdAt: string;
  fileSize: string;
  syncedToSheets: boolean;
}

export interface TemplateSettings {
  // Đơn vị & Cơ quan
  parentOrg: string; // SỞ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI TP ĐÀ NẴNG
  agencyName: string; // TRUNG TÂM BẢO TRỢ XÃ HỘI
  deptName: string; // PHÒNG Y TẾ - PHCN
  qhnsCode: string; // 1041008
  facilityAddress: string; // Đà Nẵng
  
  // Tiêu đề & Mẫu số chứng từ
  receiptFormCode: string; // Mẫu số: C20-HD
  receiptNotice: string; // (Ban hành theo Thông tư BTC)
  receiptTitle: string; // PHIẾU NHẬP KHO
  receiptDefaultWarehouse: string; // Kho Dược - Phòng Y tế & PHCN Trung tâm

  issueFormCode: string; // Mẫu số: C21-HD
  issueNotice: string; // (Ban hành theo Thông tư BTC)
  issueTitle: string; // PHIẾU XUẤT KHO
  issueDefaultWarehouse: string; // Kho Dược - Phòng Y tế - PHCN Trung tâm

  reportTitle: string; // BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ

  // Chữ ký & Chức danh mặc định
  preparerName: string; // DS. Lê Thu Hà
  preparerTitle: string; // Người lập biểu
  deptLeaderName: string; // BS. CKI. Nguyễn Thanh Long
  deptLeaderTitle: string; // Phụ trách Phòng Y tế - PHCN
  accountantName: string; // Trần Đình Trọng
  accountantTitle: string; // Kế toán trưởng
  warehouseKeeperName: string; // Trần Văn Kho
  warehouseKeeperTitle: string; // Thủ kho
  centerDirectorName: string; // Lê Minh Tuấn
  centerDirectorTitle: string; // Thủ trưởng đơn vị

  // Google Sheet & Drive Auto-backup Settings
  autoBackupEnabled: boolean;
  googleSheetUrl: string;
  googleSpreadsheetId?: string;
  googleUserEmail?: string;
  googleDriveFolder: string;
  autoSyncOnTransaction: boolean;
  lastBackupTime?: string;
  lastBackupMessage?: string;
}

export interface BackupLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  recordCounts: {
    receipts: number;
    issues: number;
    medicines: number;
    beneficiaries: number;
  };
  details: string;
}
