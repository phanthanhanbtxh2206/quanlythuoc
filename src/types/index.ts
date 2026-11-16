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
  canManageSync: boolean;
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
    canManageSync: true,
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
    canManageSync: false,
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
    canManageSync: false,
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
    canManageSync: false,
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
    canManageSync: false,
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
  webViewLink?: string;
  uploadChannel?: 'APPS_SCRIPT' | 'OAUTH_DRIVE_V3' | 'LOCAL_RECORD';
  createdAt: string;
  fileSize: string;
  syncedToSheets: boolean;
}

export type GoogleSyncMode = 'HYBRID' | 'APPS_SCRIPT' | 'OAUTH';

export const REGISTRATION_DEPARTMENTS = [
  'Phòng Y tế - Phục hồi chức năng',
  'Phòng CTXH&CSND',
  'Phòng TH-HC-KT',
] as const;

export type RegistrationDepartment = (typeof REGISTRATION_DEPARTMENTS)[number];

export interface CloudStateSnapshot {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  users: User[];
  beneficiaries: Beneficiary[];
  medicines: Medicine[];
  receipts: StockReceipt[];
  issues: StockIssue[];
  prescriptions: Prescription[];
  transactions: StockTransaction[];
  auditLogs: AuditLog[];
  syncedFiles: DriveSyncedFile[];
  templateSettings: Partial<TemplateSettings>;
}

export interface TemplateSettings {
  // 1. Quốc hiệu, Tiêu ngữ & Đơn vị hành chính chung
  nationalMottoTop: string; // CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  nationalMottoSub: string; // Độc lập - Tự do - Hạnh phúc
  parentOrg: string; // SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG
  agencyName: string; // TRUNG TÂM BẢO TRỢ XÃ HỘI
  deptName: string; // PHÒNG Y TẾ - PHCN
  qhnsCode: string; // 1041008
  facilityAddress: string; // Đà Nẵng
  datePlaceLine: string; // Đà Nẵng, ngày ..... tháng ..... năm 2026
  totalAmountWordsLabel: string; // - Tổng số tiền (viết bằng chữ):
  totalAmountLabel: string; // Cộng thành tiền:

  // 2. Biểu mẫu Phiếu Nhập Kho (C20-HD)
  receiptFormCode: string; // Mẫu số: C20-HD
  receiptNotice: string; // (Ban hành theo Thông tư BTC)
  receiptTitle: string; // PHIẾU NHẬP KHO
  receiptDefaultWarehouse: string; // Kho Dược - Phòng Y tế & PHCN Trung tâm
  receiptLabelDeliverer: string; // - Họ tên người giao hàng:
  receiptLabelDelivererDept: string; // - Địa chỉ / Bộ phận giao:
  receiptLabelInvoice: string; // - Theo hóa đơn số:
  receiptLabelContent: string; // - Nội dung nhập kho:
  receiptLabelBeneficiary: string; // - Đối tượng liên quan:
  receiptLabelWarehouse: string; // - Nhập tại kho:
  receiptColStt: string;
  receiptColName: string;
  receiptColCode: string;
  receiptColUnit: string;
  receiptColBatch: string;
  receiptColDocQty: string;
  receiptColActualQty: string;
  receiptColUnitPrice: string;
  receiptColTotalPrice: string;
  receiptFooterNote: string;
  receiptDelivererRoleLabel: string; // Người giao hàng
  receiptDelivererSignNote: string; // (Ký, họ tên)

  // 3. Biểu mẫu Phiếu Xuất Kho (C21-HD)
  issueFormCode: string; // Mẫu số: C21-HD
  issueNotice: string; // (Ban hành theo Thông tư BTC)
  issueTitle: string; // PHIẾU XUẤT KHO
  issueDefaultWarehouse: string; // Kho Dược - Phòng Y tế - PHCN Trung tâm
  issueLabelReceiver: string; // - Họ tên người nhận hàng:
  issueLabelReceiverDept: string; // - Bộ phận / Địa chỉ:
  issueLabelReason: string; // - Lý do xuất kho:
  issueLabelBeneficiary: string; // - Đối tượng nhận thuốc:
  issueLabelWarehouse: string; // - Xuất tại kho:
  issueLabelUsageLocation: string; // - Địa điểm sử dụng:
  issueColStt: string;
  issueColName: string;
  issueColCode: string;
  issueColUnit: string;
  issueColBatch: string;
  issueColReqQty: string;
  issueColActualQty: string;
  issueColUnitPrice: string;
  issueColTotalPrice: string;
  issueFooterNote: string;
  issueReceiverRoleLabel: string; // Người nhận hàng
  issueReceiverSignNote: string; // (Ký, họ tên)

  // 4. Biểu mẫu Báo Cáo Tổng Hợp BHYT
  reportTitle: string; // BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ
  reportSubtitle: string; // Nguồn kinh phí: Mua ngoài cho đối tượng có BHYT
  reportColStt: string;
  reportColName: string;
  reportColUnit: string;
  reportGroupOpening: string; // Tồn đầu kỳ
  reportGroupIn: string; // Nhập trong kỳ
  reportGroupTotalIn: string; // Tổng nhập
  reportGroupOut: string; // Xuất trong kỳ
  reportGroupClosing: string; // Tồn cuối kỳ
  reportSubColQty: string; // SL
  reportSubColPrice: string; // Đơn giá
  reportSubColAmount: string; // Thành tiền
  reportGrandTotalLabel: string; // Tổng cộng:
  reportFooterNote: string; // Ghi chú cuối báo cáo

  // 5. Chữ ký & Chức danh mặc định (5 vị trí)
  preparerName: string; // DS. Lê Thu Hà
  preparerTitle: string; // Người lập biểu
  preparerSignNote: string; // (Ký, họ tên)
  deptLeaderName: string; // BS. CKI. Nguyễn Thanh Long
  deptLeaderTitle: string; // Phụ trách Phòng Y tế - PHCN
  deptLeaderSignNote: string; // (Ký, họ tên)
  accountantName: string; // Trần Đình Trọng
  accountantTitle: string; // Kế toán trưởng
  accountantSignNote: string; // (Ký, họ tên)
  warehouseKeeperName: string; // Trần Văn Kho
  warehouseKeeperTitle: string; // Thủ kho
  warehouseKeeperSignNote: string; // (Ký, họ tên)
  centerDirectorName: string; // Lê Minh Tuấn
  centerDirectorTitle: string; // Thủ trưởng đơn vị
  centerDirectorSignNote: string; // (Ký, họ tên, đóng dấu)

  // 6. Google Sheets & Drive Sync Settings (Admin Only)
  syncMode: GoogleSyncMode;
  appsScriptUrl: string;
  autoBackupEnabled: boolean;
  googleSheetUrl: string;
  googleSpreadsheetId?: string;
  googleUserEmail?: string;
  googleDriveFolder: string;
  autoSyncOnTransaction: boolean;
  lastSyncChannel?: string;
  lastBackupTime?: string;
  lastBackupMessage?: string;
}

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  nationalMottoTop: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
  nationalMottoSub: 'Độc lập - Tự do - Hạnh phúc',
  parentOrg: 'SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG',
  agencyName: 'TRUNG TÂM BẢO TRỢ XÃ HỘI',
  deptName: 'PHÒNG Y TẾ - PHCN',
  qhnsCode: '1041008',
  facilityAddress: 'Đà Nẵng',
  datePlaceLine: 'Đà Nẵng, ngày ..... tháng ..... năm 2026',
  totalAmountWordsLabel: '- Tổng số tiền (viết bằng chữ):',
  totalAmountLabel: 'Cộng thành tiền:',

  receiptFormCode: 'Mẫu số: C20-HD',
  receiptNotice: '(Ban hành theo Thông tư BTC)',
  receiptTitle: 'PHIẾU NHẬP KHO',
  receiptDefaultWarehouse: 'Kho Dược - Phòng Y tế & PHCN Trung tâm',
  receiptLabelDeliverer: '- Họ tên người giao hàng:',
  receiptLabelDelivererDept: '- Địa chỉ / Bộ phận giao:',
  receiptLabelInvoice: '- Theo hóa đơn số:',
  receiptLabelContent: '- Nội dung nhập kho:',
  receiptLabelBeneficiary: '- Đối tượng liên quan:',
  receiptLabelWarehouse: '- Nhập tại kho:',
  receiptColStt: 'STT',
  receiptColName: 'Tên thuốc, nhãn hiệu, quy cách, phẩm chất',
  receiptColCode: 'Mã số',
  receiptColUnit: 'ĐVT',
  receiptColBatch: 'Số lô',
  receiptColDocQty: 'SL chứng từ',
  receiptColActualQty: 'Thực nhập',
  receiptColUnitPrice: 'Đơn giá (₫)',
  receiptColTotalPrice: 'Thành tiền (₫)',
  receiptFooterNote: 'Chứng từ được kiểm nhập đúng chủng loại, số lượng và đơn giá theo hóa đơn mua hàng.',
  receiptDelivererRoleLabel: 'Người giao hàng',
  receiptDelivererSignNote: '(Ký, họ tên)',

  issueFormCode: 'Mẫu số: C21-HD',
  issueNotice: '(Ban hành theo Thông tư BTC)',
  issueTitle: 'PHIẾU XUẤT KHO',
  issueDefaultWarehouse: 'Kho Dược - Phòng Y tế - PHCN Trung tâm',
  issueLabelReceiver: '- Họ tên người nhận hàng:',
  issueLabelReceiverDept: '- Bộ phận / Địa chỉ:',
  issueLabelReason: '- Lý do xuất kho:',
  issueLabelBeneficiary: '- Đối tượng nhận thuốc:',
  issueLabelWarehouse: '- Xuất tại kho:',
  issueLabelUsageLocation: '- Địa điểm sử dụng:',
  issueColStt: 'STT',
  issueColName: 'Tên thuốc, nhãn hiệu, quy cách',
  issueColCode: 'Mã số',
  issueColUnit: 'ĐVT',
  issueColBatch: 'Số lô',
  issueColReqQty: 'Yêu cầu',
  issueColActualQty: 'Thực xuất',
  issueColUnitPrice: 'Đơn giá (₫)',
  issueColTotalPrice: 'Thành tiền (₫)',
  issueFooterNote: 'Thuốc đã được kiểm tra và cấp phát đúng đối tượng điều trị theo chỉ định chuyên môn.',
  issueReceiverRoleLabel: 'Người nhận hàng',
  issueReceiverSignNote: '(Ký, họ tên)',

  reportTitle: 'BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ',
  reportSubtitle: 'Nguồn: Thuốc mua ngoài phục vụ đối tượng có thẻ Bảo hiểm Y tế tại Trung tâm',
  reportColStt: 'STT',
  reportColName: 'Tên thuốc và hàm lượng',
  reportColUnit: 'ĐVT',
  reportGroupOpening: 'Tồn đầu kỳ',
  reportGroupIn: 'Nhập trong kỳ',
  reportGroupTotalIn: 'Tổng nhập (= Tồn đầu + Nhập)',
  reportGroupOut: 'Xuất trong kỳ',
  reportGroupClosing: 'Tồn cuối kỳ (= Tổng nhập - Xuất)',
  reportSubColQty: 'SL',
  reportSubColPrice: 'Đơn giá',
  reportSubColAmount: 'Thành tiền',
  reportGrandTotalLabel: 'Cộng tổng số:',
  reportFooterNote: 'Ghi chú: Tổng nhập = Tồn đầu kỳ + Nhập trong kỳ; Tồn cuối kỳ = Tổng nhập - Xuất trong kỳ. Số liệu khớp sổ kho.',

  preparerName: 'DS. Lê Thu Hà',
  preparerTitle: 'Người lập biểu',
  preparerSignNote: '(Ký, họ tên)',
  deptLeaderName: 'BS. CKI. Nguyễn Thanh Long',
  deptLeaderTitle: 'Phụ trách Phòng Y tế - PHCN',
  deptLeaderSignNote: '(Ký, họ tên)',
  accountantName: 'Trần Đình Trọng',
  accountantTitle: 'Kế toán trưởng',
  accountantSignNote: '(Ký, họ tên)',
  warehouseKeeperName: 'Trần Văn Kho',
  warehouseKeeperTitle: 'Thủ kho',
  warehouseKeeperSignNote: '(Ký, họ tên)',
  centerDirectorName: 'Lê Minh Tuấn',
  centerDirectorTitle: 'Thủ trưởng đơn vị',
  centerDirectorSignNote: '(Ký, họ tên, đóng dấu)',

  syncMode: 'HYBRID',
  appsScriptUrl: '',
  autoBackupEnabled: true,
  googleSheetUrl: '',
  googleSpreadsheetId: '',
  googleDriveFolder: 'QUAN_LY_THUOC_TRUNG_TAM/2026',
  autoSyncOnTransaction: true,
  lastSyncChannel: 'Chưa đồng bộ',
  lastBackupTime: 'Chưa đồng bộ',
  lastBackupMessage: 'Sẵn sàng cấu hình đồng bộ Google Apps Script & Google OAuth',
};

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
