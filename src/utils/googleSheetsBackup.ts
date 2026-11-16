/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import {
  Beneficiary,
  StockReceipt,
  StockReceiptItem,
  StockIssue,
  StockIssueItem,
  Medicine,
  MedicineSourceType,
  StockTransaction,
  Prescription,
  AuditLog,
  DriveSyncedFile,
  TemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
  User,
  UserRole,
  UserStatus,
} from '../types';

export const FOUR_MAIN_SHEET_NAMES = ['Phiếu nhập', 'Phiếu xuất', 'Báo cáo', 'Tài khoản'] as const;

export const SIX_SYSTEM_SHEET_NAMES = [
  'DanhMuc_Thuoc',
  'DoiTuong',
  'ChiTiet_PhieuNhap',
  'ChiTiet_PhieuXuat',
  'DonThuoc_GiaoDich',
  'CauHinh_BieuMau',
] as const;

export const TEN_SHEET_NAMES = [...FOUR_MAIN_SHEET_NAMES, ...SIX_SYSTEM_SHEET_NAMES] as const;

export interface FourSheetsData {
  receiptSheetRows: any[];
  issueSheetRows: any[];
  reportSheetRows: any[];
  accountSheetRows: any[];
}

export interface AllTenSheetsData extends FourSheetsData {
  medicinesSheetRows: any[];
  beneficiariesSheetRows: any[];
  receiptDetailsSheetRows: any[];
  issueDetailsSheetRows: any[];
  prescriptionsTransactionsSheetRows: any[];
  templateSettingsSheetRows: any[];
}

export const stripLeadingQuote = (val: any): string => {
  const s = val !== undefined && val !== null ? String(val).trim() : '';
  return s.startsWith("'") ? s.slice(1).trim() : s;
};

export const buildUsersAccountSheetRows = (users: User[]) => {
  return (users || []).map((u, idx) => ({
    'STT': idx + 1,
    'ID tài khoản': u.id,
    'Họ và tên': u.fullName,
    'Email đăng nhập': u.email,
    'Mật khẩu': u.password || '',
    'Số điện thoại': u.phone || '',
    'Phòng ban / Đơn vị': u.department,
    'Vai trò': u.role,
    'Trạng thái': u.status,
    'Ngày tạo': u.createdAt || '',
    'Ngày duyệt': u.approvedAt || '',
    'Người duyệt': u.approvedBy || '',
  }));
};

const normalizeRole = (raw: string): UserRole => {
  const val = (raw || '').trim().toUpperCase();
  if (val === 'ADMIN' || val.includes('QUẢN TRỊ')) return 'ADMIN';
  if (val === 'PHARMACIST' || val.includes('DƯỢC')) return 'PHARMACIST';
  if (val === 'DOCTOR' || val.includes('BÁC SĨ') || val.includes('Y SĨ')) return 'DOCTOR';
  if (val === 'ACCOUNTANT' || val.includes('KẾ TOÁN')) return 'ACCOUNTANT';
  if (val === 'LEADER' || val.includes('LÃNH ĐẠO')) return 'LEADER';
  return 'DOCTOR';
};

const normalizeStatus = (raw: string): UserStatus => {
  const val = (raw || '').trim().toUpperCase();
  if (val === 'ACTIVE' || val.includes('HOẠT ĐỘNG')) return 'ACTIVE';
  if (val === 'PENDING_APPROVAL' || val.includes('CHỜ')) return 'PENDING_APPROVAL';
  if (val === 'LOCKED' || val.includes('KHÓA')) return 'LOCKED';
  if (val === 'DISABLED' || val.includes('NGƯNG')) return 'DISABLED';
  if (val === 'REJECTED' || val.includes('TỪ CHỐI')) return 'REJECTED';
  return 'PENDING_APPROVAL';
};

/**
 * Parse 2D array from Google Sheets tab "Tài khoản" back into User[]
 */
export const parseUsersFromAccountSheet = (rows2D: any[][], fallbackUsers: User[] = []): User[] => {
  if (!Array.isArray(rows2D) || rows2D.length < 2) {
    return fallbackUsers;
  }

  const headers = rows2D[0].map((h) => String(h || '').trim().toLowerCase());
  const findCol = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((kw) => h.includes(kw)));

  const colId = findCol(['id tài khoản', 'id']);
  const colName = findCol(['họ và tên', 'tên']);
  const colEmail = findCol(['email']);
  const colPassword = findCol(['mật khẩu', 'password']);
  const colPhone = findCol(['điện thoại', 'phone', 'sđt']);
  const colDept = findCol(['phòng ban', 'đơn vị', 'department']);
  const colRole = findCol(['vai trò', 'role']);
  const colStatus = findCol(['trạng thái', 'status']);
  const colCreated = findCol(['ngày tạo', 'created']);
  const colApprovedAt = findCol(['ngày duyệt']);
  const colApprovedBy = findCol(['người duyệt']);

  const parsed: User[] = [];
  for (let i = 1; i < rows2D.length; i++) {
    const row = rows2D[i];
    if (!Array.isArray(row)) continue;

    const email = colEmail >= 0 ? stripLeadingQuote(row[colEmail]) : '';
    const fullName = colName >= 0 ? stripLeadingQuote(row[colName]) : '';
    if (!email && !fullName) continue;

    const id = (colId >= 0 ? stripLeadingQuote(row[colId]) : '') || `usr-sheet-${i}`;
    const existing = fallbackUsers.find(
      (u) => u.id === id || (email && u.email.toLowerCase() === email.toLowerCase())
    );

    const passwordVal = colPassword >= 0 ? stripLeadingQuote(row[colPassword]) : '';

    parsed.push({
      id,
      fullName: fullName || existing?.fullName || email,
      email: email || existing?.email || '',
      password: passwordVal || existing?.password || '123',
      phone: colPhone >= 0 ? stripLeadingQuote(row[colPhone]) : existing?.phone || '',
      department:
        (colDept >= 0 ? stripLeadingQuote(row[colDept]) : '') ||
        existing?.department ||
        'Phòng Y tế - Phục hồi chức năng',
      role: colRole >= 0 ? normalizeRole(String(row[colRole] || '')) : existing?.role || 'DOCTOR',
      status: colStatus >= 0 ? normalizeStatus(String(row[colStatus] || '')) : existing?.status || 'PENDING_APPROVAL',
      createdAt: (colCreated >= 0 ? stripLeadingQuote(row[colCreated]) : '') || existing?.createdAt || '',
      approvedAt: colApprovedAt >= 0 ? stripLeadingQuote(row[colApprovedAt]) || undefined : existing?.approvedAt,
      approvedBy: colApprovedBy >= 0 ? stripLeadingQuote(row[colApprovedBy]) || undefined : existing?.approvedBy,
    });
  }

  return parsed.length > 0 ? parsed : fallbackUsers;
};


/**
 * Build the 3-sheet structured data where on every sheet,
 * each row corresponds to one Beneficiary (mỗi tên đối tượng nằm trên một dòng).
 */
export const buildThreeSheetsBeneficiaryData = (
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[]
) => {
  // 1. Gom danh sách đối tượng duy nhất (không trùng lặp họ tên hay mã)
  const masterByName = new Map<string, Beneficiary>();
  const benMap = new Map<
    string,
    { id: string; fullName: string; code?: string; insuranceNumber?: string; roomArea?: string }
  >();

  beneficiaries.forEach((b) => {
    const key = b.fullName.trim().toLowerCase();
    masterByName.set(key, b);
    benMap.set(key, {
      id: b.id,
      fullName: b.fullName,
      code: b.code,
      insuranceNumber: b.insuranceNumber || '',
      roomArea: b.roomArea,
    });
  });

  // Quét danh sách phiếu nhập để bổ sung đối tượng ngoài danh mục nếu có
  receipts.forEach((r) => {
    const rawName = (r.beneficiaryName || '').trim();
    const benId = r.beneficiaryId;
    let master = benId ? beneficiaries.find((b) => b.id === benId) : undefined;
    if (!master && rawName) {
      master = masterByName.get(rawName.toLowerCase());
    }

    if (master) return;

    if (rawName) {
      const key = rawName.toLowerCase();
      if (!benMap.has(key)) {
        benMap.set(key, {
          id: `custom-ben-${key}`,
          fullName: rawName,
          code: `DT-${String(benMap.size + 1).padStart(3, '0')}`,
          insuranceNumber: 'BHYT mua ngoài',
          roomArea: 'Khu tiếp nhận - Y tế',
        });
      }
    }
  });

  // Quét danh sách phiếu xuất để bổ sung đối tượng ngoài danh mục nếu có
  issues.forEach((i) => {
    const rawName = (i.beneficiaryName || '').trim();
    const benId = i.beneficiaryId;
    let master = benId ? beneficiaries.find((b) => b.id === benId) : undefined;
    if (!master && rawName) {
      master = masterByName.get(rawName.toLowerCase());
    }

    if (master) return;

    if (rawName) {
      const key = rawName.toLowerCase();
      if (!benMap.has(key)) {
        benMap.set(key, {
          id: `custom-ben-${key}`,
          fullName: rawName,
          code: `DT-${String(benMap.size + 1).padStart(3, '0')}`,
          insuranceNumber: 'BHYT mua ngoài',
          roomArea: i.usageLocation || 'Khu tiếp nhận - Y tế',
        });
      }
    }
  });

  const allBenList = Array.from(benMap.values());

  const isMatchBen = (ben: { id: string; fullName: string }, targetId?: string, targetName?: string) => {
    const bName = ben.fullName.trim().toLowerCase();
    const bId = ben.id.toLowerCase();
    const tId = (targetId || '').trim().toLowerCase();
    const tName = (targetName || '').trim().toLowerCase();

    if (bId && tId && bId === tId) return true;
    if (bName && tName && bName === tName) return true;
    if (bId && tName && bId === tName) return true;
    if (bName && tId && bName === tId) return true;
    return false;
  };

  // =========================================================================
  // 1. SHEET PHIẾU NHẬP (Mỗi tên đối tượng sẽ nằm trên một dòng)
  // =========================================================================
  let receiptStt = 1;
  let totalReceiptQtyAll = 0;
  let totalReceiptAmountAll = 0;

  const receiptRows = allBenList.map((ben) => {
    // Trích xuất tất cả phiếu nhập kho thuộc về đối tượng này
    const benReceipts = receipts.filter((r) => isMatchBen(ben, r.beneficiaryId, r.beneficiaryName));

    const receiptCodes = benReceipts.map((r) => r.receiptCode).join(', ') || 'Chưa phát sinh';
    const receiptDates = Array.from(new Set(benReceipts.map((r) => r.receiptDate))).join(', ') || '-';
    const suppliers = Array.from(new Set(benReceipts.map((r) => r.supplierName || r.delivererName))).join(', ') || '-';
    const invoices = Array.from(new Set(benReceipts.filter((r) => r.invoiceNumber).map((r) => `${r.invoiceNumber} (${r.invoiceDate})`))).join(', ') || '-';

    // Tổng hợp danh mục và số lượng thuốc nhập
    const medSummaryMap = new Map<string, number>();
    let totalQty = 0;
    let totalAmount = 0;

    benReceipts.forEach((r) => {
      totalAmount += r.totalAmount;
      (r.items || []).forEach((item) => {
        const med = medicines.find((m) => m.id === item.medicineId);
        const name = med ? `${med.name} (${item.batchNumber})` : item.medicineId;
        medSummaryMap.set(name, (medSummaryMap.get(name) || 0) + item.actualQuantity);
        totalQty += item.actualQuantity;
      });
    });

    const medicineListStr = Array.from(medSummaryMap.entries())
      .map(([name, qty]) => `${name}: ${qty.toLocaleString('vi-VN')}`)
      .join('; ') || 'Chưa nhập';

    totalReceiptQtyAll += totalQty;
    totalReceiptAmountAll += totalAmount;

    return {
      'STT': receiptStt++,
      'Họ và tên đối tượng': ben.fullName,
      'Mã số / Số thẻ BHYT': ben.insuranceNumber || ben.code || '-',
      'Khu phòng / Nơi ở': ben.roomArea || 'Phòng Y tế - PHCN',
      'Số phiếu nhập kho': receiptCodes,
      'Ngày nhập': receiptDates,
      'Người giao / Nhà cung cấp': suppliers,
      'Số hóa đơn chứng từ': invoices,
      'Danh mục thuốc & Số lượng nhập': medicineListStr,
      'Tổng số lượng nhập': totalQty,
      'Tổng tiền nhập kho (VNĐ)': totalAmount,
      'Ghi chú nghiệp vụ': benReceipts.length > 0 ? `Đã nhập ${benReceipts.length} phiếu` : 'Chưa có phiếu nhập',
    };
  });

  // Summary Row for Sheet Phiếu nhập
  const receiptSummaryRow = {
    'STT': '',
    'Họ và tên đối tượng': 'TỔNG CỘNG TẤT CẢ ĐỐI TƯỢNG',
    'Mã số / Số thẻ BHYT': '',
    'Khu phòng / Nơi ở': '',
    'Số phiếu nhập kho': `${receipts.length} phiếu nhập`,
    'Ngày nhập': '',
    'Người giao / Nhà cung cấp': '',
    'Số hóa đơn chứng từ': '',
    'Danh mục thuốc & Số lượng nhập': '',
    'Tổng số lượng nhập': totalReceiptQtyAll,
    'Tổng tiền nhập kho (VNĐ)': totalReceiptAmountAll,
    'Ghi chú nghiệp vụ': 'Khớp sổ quỹ kế toán',
  };

  // =========================================================================
  // 2. SHEET PHIẾU XUẤT (Mỗi tên đối tượng sẽ nằm trên một dòng)
  // =========================================================================
  let issueStt = 1;
  let totalIssueQtyAll = 0;
  let totalIssueAmountAll = 0;

  const issueRows = allBenList.map((ben) => {
    // Trích xuất tất cả phiếu xuất kho thuộc về đối tượng này
    const benIssues = issues.filter((i) => isMatchBen(ben, i.beneficiaryId, i.beneficiaryName));

    const issueCodes = benIssues.map((i) => i.issueCode).join(', ') || 'Chưa phát sinh';
    const issueDates = Array.from(new Set(benIssues.map((i) => i.issueDate))).join(', ') || '-';
    const receivers = Array.from(new Set(benIssues.map((i) => i.receiverName))).join(', ') || '-';
    const reasons = Array.from(new Set(benIssues.map((i) => i.reason))).join(', ') || 'Xuất thuốc điều trị';
    const locations = Array.from(new Set(benIssues.map((i) => i.usageLocation))).join(', ') || ben.roomArea || 'Khu điều trị';

    // Tổng hợp danh mục và số lượng thuốc xuất
    const medSummaryMap = new Map<string, number>();
    let totalQty = 0;
    let totalAmount = 0;

    benIssues.forEach((i) => {
      totalAmount += i.totalAmount;
      (i.items || []).forEach((item) => {
        const med = medicines.find((m) => m.id === item.medicineId);
        const name = med ? `${med.name} (${item.batchNumber})` : item.medicineId;
        medSummaryMap.set(name, (medSummaryMap.get(name) || 0) + item.actualQuantity);
        totalQty += item.actualQuantity;
      });
    });

    const medicineListStr = Array.from(medSummaryMap.entries())
      .map(([name, qty]) => `${name}: ${qty.toLocaleString('vi-VN')}`)
      .join('; ') || 'Chưa xuất';

    totalIssueQtyAll += totalQty;
    totalIssueAmountAll += totalAmount;

    return {
      'STT': issueStt++,
      'Họ và tên đối tượng': ben.fullName,
      'Mã số / Số thẻ BHYT': ben.insuranceNumber || ben.code || '-',
      'Khu phòng điều trị': locations,
      'Số phiếu xuất kho': issueCodes,
      'Ngày xuất kho': issueDates,
      'Người nhận thuốc': receivers,
      'Lý do xuất thuốc': reasons,
      'Danh mục thuốc & Số lượng xuất': medicineListStr,
      'Tổng số lượng xuất': totalQty,
      'Tổng giá trị xuất kho (VNĐ)': totalAmount,
      'Trạng thái chứng từ': benIssues.length > 0 ? `Đã xuất ${benIssues.length} phiếu` : 'Chưa có phiếu xuất',
    };
  });

  // Summary Row for Sheet Phiếu xuất
  const issueSummaryRow = {
    'STT': '',
    'Họ và tên đối tượng': 'TỔNG CỘNG TẤT CẢ ĐỐI TƯỢNG',
    'Mã số / Số thẻ BHYT': '',
    'Khu phòng điều trị': '',
    'Số phiếu xuất kho': `${issues.length} phiếu xuất`,
    'Ngày xuất kho': '',
    'Người nhận thuốc': '',
    'Lý do xuất thuốc': '',
    'Danh mục thuốc & Số lượng xuất': '',
    'Tổng số lượng xuất': totalIssueQtyAll,
    'Tổng giá trị xuất kho (VNĐ)': totalIssueAmountAll,
    'Trạng thái chứng từ': 'Đã hoàn tất cấp phát',
  };

  // =========================================================================
  // 3. SHEET BÁO CÁO (Mỗi tên đối tượng sẽ nằm trên một dòng)
  // BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ
  // =========================================================================
  let reportStt = 1;
  let totalReportOpeningQty = 0;
  let totalReportOpeningAmount = 0;
  let totalReportInQty = 0;
  let totalReportInAmount = 0;
  let totalReportTotalInQty = 0;
  let totalReportTotalInAmount = 0;
  let totalReportOutQty = 0;
  let totalReportOutAmount = 0;
  let totalReportClosingQty = 0;
  let totalReportClosingAmount = 0;

  const reportRows = allBenList.map((ben) => {
    // Trích xuất trực tiếp từ các phiếu nhập và phiếu xuất của đối tượng
    const benReceipts = receipts.filter((r) => isMatchBen(ben, r.beneficiaryId, r.beneficiaryName));
    const benIssues = issues.filter((i) => isMatchBen(ben, i.beneficiaryId, i.beneficiaryName));

    let openingQty = 0;
    let openingAmount = 0;
    let inQty = 0;
    let inAmount = 0;
    let outQty = 0;
    let outAmount = 0;

    const medNamesSet = new Set<string>();

    // 1. Tính nhập từ Phiếu Nhập
    benReceipts.forEach((r) => {
      inAmount += r.totalAmount;
      (r.items || []).forEach((item) => {
        inQty += Number(item.actualQuantity) || 0;
        const med = medicines.find((m) => m.id === item.medicineId);
        if (med) medNamesSet.add(med.name);
      });
    });

    // 2. Tính xuất từ Phiếu Xuất
    benIssues.forEach((i) => {
      outAmount += i.totalAmount;
      (i.items || []).forEach((item) => {
        outQty += Number(item.actualQuantity) || 0;
        const med = medicines.find((m) => m.id === item.medicineId);
        if (med) medNamesSet.add(med.name);
      });
    });

    // 3. Nếu chưa có phiếu nào nhưng có transactions khớp thì bổ sung
    if (benReceipts.length === 0 && benIssues.length === 0) {
      transactions
        .filter((tx) => isMatchBen(ben, tx.beneficiaryId))
        .forEach((tx) => {
          const med = medicines.find((m) => m.id === tx.medicineId);
          if (med) medNamesSet.add(med.name);

          if (tx.type === 'RECEIPT') {
            inQty += tx.quantity;
            inAmount += tx.totalPrice;
          } else if (tx.type === 'ISSUE') {
            outQty += Math.abs(tx.quantity);
            outAmount += Math.abs(tx.totalPrice);
          }
        });
    }

    // Tổng nhập = Tồn đầu kỳ + Nhập trong kỳ
    const totalInQty = openingQty + inQty;
    const totalInAmount = openingAmount + inAmount;

    // Tồn cuối kỳ = Tổng nhập - Xuất trong kỳ
    const closingQty = Math.max(0, totalInQty - outQty);
    const closingAmount = Math.max(0, totalInAmount - outAmount);

    totalReportOpeningQty += openingQty;
    totalReportOpeningAmount += openingAmount;
    totalReportInQty += inQty;
    totalReportInAmount += inAmount;
    totalReportTotalInQty += totalInQty;
    totalReportTotalInAmount += totalInAmount;
    totalReportOutQty += outQty;
    totalReportOutAmount += outAmount;
    totalReportClosingQty += closingQty;
    totalReportClosingAmount += closingAmount;

    return {
      'STT': reportStt++,
      'Họ và tên đối tượng': ben.fullName,
      'Mã thẻ BHYT': ben.insuranceNumber || ben.code || '-',
      'Khu phòng': ben.roomArea || 'Phòng Y tế - PHCN',
      'Danh mục thuốc theo dõi': Array.from(medNamesSet).join(', ') || 'Thuốc mua ngoài BHYT',
      'Tồn đầu kỳ - Số lượng': openingQty,
      'Tồn đầu kỳ - Thành tiền (VNĐ)': openingAmount,
      'Nhập trong kỳ - Số lượng': inQty,
      'Nhập trong kỳ - Thành tiền (VNĐ)': inAmount,
      'Tổng nhập - Số lượng': totalInQty,
      'Tổng nhập - Thành tiền (VNĐ)': totalInAmount,
      'Xuất trong kỳ - Số lượng': outQty,
      'Xuất trong kỳ - Thành tiền (VNĐ)': outAmount,
      'Tồn cuối kỳ - Số lượng': closingQty,
      'Tồn cuối kỳ - Thành tiền (VNĐ)': closingAmount,
      'Ghi chú / Tình trạng':
        inQty === 0 && outQty === 0
          ? 'Chưa phát sinh chứng từ'
          : closingQty > 0
          ? 'Còn tồn thuốc tại tủ'
          : 'Đã cấp phát hết cho đối tượng',
    };
  });

  // Summary Row for Sheet Báo cáo
  const reportSummaryRow = {
    'STT': '',
    'Họ và tên đối tượng': 'TỔNG CỘNG TẤT CẢ ĐỐI TƯỢNG',
    'Mã thẻ BHYT': '',
    'Khu phòng': '',
    'Danh mục thuốc theo dõi': 'Toàn bộ đối tượng BHYT',
    'Tồn đầu kỳ - Số lượng': totalReportOpeningQty,
    'Tồn đầu kỳ - Thành tiền (VNĐ)': totalReportOpeningAmount,
    'Nhập trong kỳ - Số lượng': totalReportInQty,
    'Nhập trong kỳ - Thành tiền (VNĐ)': totalReportInAmount,
    'Tổng nhập - Số lượng': totalReportTotalInQty,
    'Tổng nhập - Thành tiền (VNĐ)': totalReportTotalInAmount,
    'Xuất trong kỳ - Số lượng': totalReportOutQty,
    'Xuất trong kỳ - Thành tiền (VNĐ)': totalReportOutAmount,
    'Tồn cuối kỳ - Số lượng': totalReportClosingQty,
    'Tồn cuối kỳ - Thành tiền (VNĐ)': totalReportClosingAmount,
    'Ghi chú / Tình trạng': 'Cân đối sổ quỹ kho Dược',
  };

  return {
    receiptSheetRows: [...receiptRows, receiptSummaryRow],
    issueSheetRows: [...issueRows, issueSummaryRow],
    reportSheetRows: [...reportRows, reportSummaryRow],
  };
};

export const buildFourSheetsData = (
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  users: User[]
): FourSheetsData => {
  const base = buildThreeSheetsBeneficiaryData(beneficiaries, receipts, issues, medicines, transactions);
  return {
    ...base,
    accountSheetRows: buildUsersAccountSheetRows(users),
  };
};

const ACCOUNT_HEADERS = [
  'STT',
  'ID tài khoản',
  'Họ và tên',
  'Email đăng nhập',
  'Mật khẩu',
  'Số điện thoại',
  'Phòng ban / Đơn vị',
  'Vai trò',
  'Trạng thái',
  'Ngày tạo',
  'Ngày duyệt',
  'Người duyệt',
];

const MEDICINE_HEADERS = [
  'ID',
  'Mã thuốc',
  'Tên biệt dược',
  'Hoạt chất',
  'Hàm lượng',
  'ĐVT',
  'Quy cách',
  'Dạng bào chế',
  'Đường dùng',
  'Nhà sản xuất',
  'Nhóm thuốc',
  'Tồn tối thiểu',
  'Trạng thái',
  'Ghi chú',
  'Ngày tạo',
];

const BENEFICIARY_HEADERS = [
  'ID',
  'Mã ĐT',
  'Họ và tên',
  'Giới tính',
  'Năm sinh',
  'CCCD',
  'Số thẻ BHYT',
  'Khu phòng',
  'Trạng thái',
  'Ghi chú',
  'Ngày tạo',
];

const RECEIPT_DETAIL_HEADERS = [
  'ID',
  'Số phiếu nhập',
  'Ngày nhập',
  'Người giao',
  'Bộ phận giao',
  'Nhà cung cấp',
  'Số hóa đơn',
  'Ngày hóa đơn',
  'Nội dung',
  'Nguồn thuốc',
  'ID đối tượng',
  'Tên đối tượng',
  'Số chứng từ kèm',
  'Tổng tiền',
  'Trạng thái',
  'ID người tạo',
  'Tên người tạo',
  'Ngày tạo',
  'Người duyệt',
  'ChiTietJSON',
];

const ISSUE_DETAIL_HEADERS = [
  'ID',
  'Số phiếu xuất',
  'Ngày xuất',
  'Người nhận',
  'Bộ phận nhận',
  'Lý do xuất',
  'ID đối tượng',
  'Tên đối tượng',
  'ID đơn thuốc',
  'Địa điểm sử dụng',
  'Tổng tiền',
  'Trạng thái',
  'ID người tạo',
  'Tên người tạo',
  'Ngày tạo',
  'Người duyệt',
  'ChiTietJSON',
];

const PRESCRIPTION_TX_HEADERS = ['LoaiBanGhi', 'ID', 'MaChungTu', 'Ngay', 'MoTa', 'DuLieuJSON'];
const TEMPLATE_SETTINGS_HEADERS = ['Khoa', 'GiaTri'];

const TRANSIENT_TEMPLATE_KEYS = new Set<string>([
  'appsScriptUrl',
  'googleSheetUrl',
  'googleSpreadsheetId',
  'googleUserEmail',
  'syncMode',
  'lastSyncChannel',
  'lastBackupTime',
  'lastBackupMessage',
]);

export const rowsWithHeadersTo2D = (headers: string[], rows: Record<string, any>[]): any[][] => {
  const values = (rows || []).map((r) =>
    headers.map((h) => {
      const v = r[h];
      return v !== undefined && v !== null ? v : '';
    })
  );
  return [headers, ...values];
};

export const jsonObjectsTo2D = (rows: Record<string, any>[], fallbackHeaders: string[] = []): any[][] => {
  if (!rows || rows.length === 0) {
    return fallbackHeaders.length > 0 ? [fallbackHeaders] : [];
  }
  const headers = Object.keys(rows[0]);
  return rowsWithHeadersTo2D(headers, rows);
};

export const buildAllTenSheetsData = (params: {
  beneficiaries: Beneficiary[];
  receipts: StockReceipt[];
  issues: StockIssue[];
  medicines: Medicine[];
  prescriptions: Prescription[];
  transactions: StockTransaction[];
  auditLogs: AuditLog[];
  syncedFiles?: DriveSyncedFile[];
  templateSettings: TemplateSettings;
  users: User[];
}): AllTenSheetsData => {
  const four = buildFourSheetsData(
    params.beneficiaries,
    params.receipts,
    params.issues,
    params.medicines,
    params.transactions,
    params.users
  );

  const medicinesSheetRows = (params.medicines || []).map((m) => ({
    'ID': m.id,
    'Mã thuốc': m.code,
    'Tên biệt dược': m.name,
    'Hoạt chất': m.activeIngredient || '',
    'Hàm lượng': m.concentration || '',
    'ĐVT': m.unit || '',
    'Quy cách': m.packaging || '',
    'Dạng bào chế': m.dosageForm || '',
    'Đường dùng': m.route || '',
    'Nhà sản xuất': m.manufacturer || '',
    'Nhóm thuốc': m.category || '',
    'Tồn tối thiểu': Number(m.minStockAlert) || 0,
    'Trạng thái': m.status || 'Đang sử dụng',
    'Ghi chú': m.note || '',
    'Ngày tạo': m.createdAt || '',
  }));

  const beneficiariesSheetRows = (params.beneficiaries || []).map((b) => ({
    'ID': b.id,
    'Mã ĐT': b.code,
    'Họ và tên': b.fullName,
    'Giới tính': b.gender,
    'Năm sinh': Number(b.birthYear) || 1970,
    'CCCD': b.idCard || '',
    'Số thẻ BHYT': b.insuranceNumber || '',
    'Khu phòng': b.roomArea || '',
    'Trạng thái': b.status || 'Đang quản lý',
    'Ghi chú': b.note || '',
    'Ngày tạo': b.createdAt || '',
  }));

  const receiptDetailsSheetRows = (params.receipts || []).map((r) => ({
    'ID': r.id,
    'Số phiếu nhập': r.receiptCode,
    'Ngày nhập': r.receiptDate,
    'Người giao': r.delivererName || '',
    'Bộ phận giao': r.delivererDept || '',
    'Nhà cung cấp': r.supplierName || '',
    'Số hóa đơn': r.invoiceNumber || '',
    'Ngày hóa đơn': r.invoiceDate || '',
    'Nội dung': r.content || '',
    'Nguồn thuốc': r.sourceType || 'BHYT_MUA_NGOAI',
    'ID đối tượng': r.beneficiaryId || '',
    'Tên đối tượng': r.beneficiaryName || '',
    'Số chứng từ kèm': r.attachedDocCount ?? 0,
    'Tổng tiền': Number(r.totalAmount) || 0,
    'Trạng thái': r.status || 'APPROVED',
    'ID người tạo': r.createdBy || '',
    'Tên người tạo': r.createdByName || '',
    'Ngày tạo': r.createdAt || '',
    'Người duyệt': r.approvedBy || '',
    'ChiTietJSON': JSON.stringify(r.items || []),
  }));

  const issueDetailsSheetRows = (params.issues || []).map((i) => ({
    'ID': i.id,
    'Số phiếu xuất': i.issueCode,
    'Ngày xuất': i.issueDate,
    'Người nhận': i.receiverName || '',
    'Bộ phận nhận': i.receiverDept || '',
    'Lý do xuất': i.reason || '',
    'ID đối tượng': i.beneficiaryId || '',
    'Tên đối tượng': i.beneficiaryName || '',
    'ID đơn thuốc': i.prescriptionId || '',
    'Địa điểm sử dụng': i.usageLocation || '',
    'Tổng tiền': Number(i.totalAmount) || 0,
    'Trạng thái': i.status || 'APPROVED',
    'ID người tạo': i.createdBy || '',
    'Tên người tạo': i.createdByName || '',
    'Ngày tạo': i.createdAt || '',
    'Người duyệt': i.approvedBy || '',
    'ChiTietJSON': JSON.stringify(i.items || []),
  }));

  const prescriptionsTransactionsSheetRows: any[] = [
    ...(params.prescriptions || []).map((p) => ({
      'LoaiBanGhi': 'PRESCRIPTION',
      'ID': p.id,
      'MaChungTu': p.code,
      'Ngay': p.prescriptionDate,
      'MoTa': `${p.doctorName} - ${p.diagnosis}`,
      'DuLieuJSON': JSON.stringify(p),
    })),
    ...(params.transactions || []).map((t) => ({
      'LoaiBanGhi': 'TRANSACTION',
      'ID': t.id,
      'MaChungTu': t.refCode,
      'Ngay': t.date,
      'MoTa': `${t.type} (${t.batchNumber}) SL: ${t.quantity}`,
      'DuLieuJSON': JSON.stringify(t),
    })),
    ...(params.auditLogs || []).slice(0, 100).map((a) => ({
      'LoaiBanGhi': 'AUDIT_LOG',
      'ID': a.id,
      'MaChungTu': a.entityId,
      'Ngay': a.timestamp,
      'MoTa': `${a.userName}: ${a.action} - ${a.details}`,
      'DuLieuJSON': JSON.stringify(a),
    })),
    ...(params.syncedFiles || []).slice(0, 50).map((f) => ({
      'LoaiBanGhi': 'SYNCED_FILE',
      'ID': f.id,
      'MaChungTu': f.docCode,
      'Ngay': f.createdAt,
      'MoTa': f.fileName,
      'DuLieuJSON': JSON.stringify(f),
    })),
  ];

  const templateSettingsSheetRows = Object.entries(params.templateSettings || {})
    .filter(([k]) => !TRANSIENT_TEMPLATE_KEYS.has(k))
    .map(([k, v]) => ({
      'Khoa': k,
      'GiaTri': v !== undefined && v !== null ? String(v) : '',
    }));

  return {
    ...four,
    medicinesSheetRows,
    beneficiariesSheetRows,
    receiptDetailsSheetRows,
    issueDetailsSheetRows,
    prescriptionsTransactionsSheetRows,
    templateSettingsSheetRows,
  };
};

export const buildAllTenSheets2D = (params: {
  beneficiaries: Beneficiary[];
  receipts: StockReceipt[];
  issues: StockIssue[];
  medicines: Medicine[];
  prescriptions: Prescription[];
  transactions: StockTransaction[];
  auditLogs: AuditLog[];
  syncedFiles?: DriveSyncedFile[];
  templateSettings: TemplateSettings;
  users: User[];
}): Record<string, any[][]> => {
  const data = buildAllTenSheetsData(params);
  return {
    'Phiếu nhập': jsonObjectsTo2D(data.receiptSheetRows),
    'Phiếu xuất': jsonObjectsTo2D(data.issueSheetRows),
    'Báo cáo': jsonObjectsTo2D(data.reportSheetRows),
    'Tài khoản': rowsWithHeadersTo2D(ACCOUNT_HEADERS, data.accountSheetRows),
    'DanhMuc_Thuoc': rowsWithHeadersTo2D(MEDICINE_HEADERS, data.medicinesSheetRows),
    'DoiTuong': rowsWithHeadersTo2D(BENEFICIARY_HEADERS, data.beneficiariesSheetRows),
    'ChiTiet_PhieuNhap': rowsWithHeadersTo2D(RECEIPT_DETAIL_HEADERS, data.receiptDetailsSheetRows),
    'ChiTiet_PhieuXuat': rowsWithHeadersTo2D(ISSUE_DETAIL_HEADERS, data.issueDetailsSheetRows),
    'DonThuoc_GiaoDich': rowsWithHeadersTo2D(
      PRESCRIPTION_TX_HEADERS,
      data.prescriptionsTransactionsSheetRows
    ),
    'CauHinh_BieuMau': rowsWithHeadersTo2D(TEMPLATE_SETTINGS_HEADERS, data.templateSettingsSheetRows),
  };
};

const safeParseJson = <T,>(raw: any, fallback: T): T => {
  try {
    const str = stripLeadingQuote(raw);
    if (!str) return fallback;
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
};

const rows2DToObjects = (rows2D?: any[][]): Record<string, any>[] => {
  if (!Array.isArray(rows2D) || rows2D.length < 2) return [];
  const headers = rows2D[0].map((h) => String(h || '').trim());
  const out: Record<string, any>[] = [];
  for (let i = 1; i < rows2D.length; i++) {
    const row = rows2D[i];
    if (!Array.isArray(row)) continue;
    const hasValue = row.some((c) => c !== '' && c !== null && c !== undefined);
    if (!hasValue) continue;
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = row[idx];
    });
    out.push(obj);
  }
  return out;
};

export interface ParsedTenSheetsState {
  medicines?: Medicine[];
  beneficiaries?: Beneficiary[];
  receipts?: StockReceipt[];
  issues?: StockIssue[];
  prescriptions?: Prescription[];
  transactions?: StockTransaction[];
  auditLogs?: AuditLog[];
  syncedFiles?: DriveSyncedFile[];
  templateSettings?: Partial<TemplateSettings>;
}

/**
 * Parse the 6 structured system tabs back into complete domain objects.
 */
export const parseAllTenSheetsData = (
  tables: Record<string, any[][] | undefined>
): ParsedTenSheetsState => {
  const result: ParsedTenSheetsState = {};

  // 1. DanhMuc_Thuoc
  const medRows2D = tables['DanhMuc_Thuoc'];
  if (Array.isArray(medRows2D) && medRows2D.length >= 2) {
    const objs = rows2DToObjects(medRows2D);
    result.medicines = objs
      .filter((o) => stripLeadingQuote(o['ID']) || stripLeadingQuote(o['Tên biệt dược']))
      .map((o, idx) => ({
        id: stripLeadingQuote(o['ID']) || `med-sheet-${idx}`,
        code: stripLeadingQuote(o['Mã thuốc']) || `TH-${String(idx + 1).padStart(3, '0')}`,
        name: stripLeadingQuote(o['Tên biệt dược']) || 'Thuốc chưa đặt tên',
        activeIngredient: stripLeadingQuote(o['Hoạt chất']),
        concentration: stripLeadingQuote(o['Hàm lượng']),
        unit: stripLeadingQuote(o['ĐVT']) || 'Viên',
        packaging: stripLeadingQuote(o['Quy cách']),
        dosageForm: stripLeadingQuote(o['Dạng bào chế']),
        route: stripLeadingQuote(o['Đường dùng']) || 'Uống',
        manufacturer: stripLeadingQuote(o['Nhà sản xuất']),
        category: stripLeadingQuote(o['Nhóm thuốc']) || 'Khác',
        minStockAlert: Number(o['Tồn tối thiểu']) || 0,
        status:
          stripLeadingQuote(o['Trạng thái']) === 'Ngừng sử dụng'
            ? 'Ngừng sử dụng'
            : 'Đang sử dụng',
        note: stripLeadingQuote(o['Ghi chú']) || undefined,
        createdAt: stripLeadingQuote(o['Ngày tạo']) || '',
      }));
  }

  // 2. DoiTuong
  const benRows2D = tables['DoiTuong'];
  if (Array.isArray(benRows2D) && benRows2D.length >= 2) {
    const objs = rows2DToObjects(benRows2D);
    result.beneficiaries = objs
      .filter((o) => stripLeadingQuote(o['ID']) || stripLeadingQuote(o['Họ và tên']))
      .map((o, idx) => {
        const rawStatus = stripLeadingQuote(o['Trạng thái']);
        const validStatus: Beneficiary['status'] =
          rawStatus === 'Tạm vắng' ||
          rawStatus === 'Đã chuyển tuyến' ||
          rawStatus === 'Đã xuất viện'
            ? rawStatus
            : 'Đang quản lý';
        return {
          id: stripLeadingQuote(o['ID']) || `ben-sheet-${idx}`,
          code: stripLeadingQuote(o['Mã ĐT']) || `DT-${String(idx + 1).padStart(3, '0')}`,
          fullName: stripLeadingQuote(o['Họ và tên']) || 'Đối tượng',
          gender: stripLeadingQuote(o['Giới tính']) === 'Nữ' ? 'Nữ' : 'Nam',
          birthYear: Number(o['Năm sinh']) || 1970,
          idCard: stripLeadingQuote(o['CCCD']) || undefined,
          insuranceNumber: stripLeadingQuote(o['Số thẻ BHYT']) || undefined,
          roomArea: stripLeadingQuote(o['Khu phòng']) || 'Phòng Y tế - PHCN',
          status: validStatus,
          note: stripLeadingQuote(o['Ghi chú']) || undefined,
          createdAt: stripLeadingQuote(o['Ngày tạo']) || '',
        };
      });
  }

  // 3. ChiTiet_PhieuNhap
  const rcpRows2D = tables['ChiTiet_PhieuNhap'];
  if (Array.isArray(rcpRows2D) && rcpRows2D.length >= 1) {
    const objs = rows2DToObjects(rcpRows2D);
    if (rcpRows2D.length >= 2 || objs.length > 0) {
      result.receipts = objs
        .filter((o) => stripLeadingQuote(o['ID']) || stripLeadingQuote(o['Số phiếu nhập']))
        .map((o, idx) => {
          const rawStatus = stripLeadingQuote(o['Trạng thái']);
          const status: StockReceipt['status'] =
            rawStatus === 'DRAFT' || rawStatus === 'CANCELLED' ? rawStatus : 'APPROVED';
          const rawSource = stripLeadingQuote(o['Nguồn thuốc']) as MedicineSourceType;
          const items = safeParseJson<StockReceiptItem[]>(o['ChiTietJSON'], []);
          return {
            id: stripLeadingQuote(o['ID']) || `rcp-sheet-${idx}`,
            receiptCode: stripLeadingQuote(o['Số phiếu nhập']),
            receiptDate: stripLeadingQuote(o['Ngày nhập']),
            delivererName: stripLeadingQuote(o['Người giao']),
            delivererDept: stripLeadingQuote(o['Bộ phận giao']),
            supplierName: stripLeadingQuote(o['Nhà cung cấp']),
            invoiceNumber: stripLeadingQuote(o['Số hóa đơn']),
            invoiceDate: stripLeadingQuote(o['Ngày hóa đơn']),
            content: stripLeadingQuote(o['Nội dung']),
            sourceType: rawSource || 'BHYT_MUA_NGOAI',
            beneficiaryId: stripLeadingQuote(o['ID đối tượng']) || undefined,
            beneficiaryName: stripLeadingQuote(o['Tên đối tượng']) || undefined,
            attachedDocCount: Number(o['Số chứng từ kèm']) || 0,
            totalAmount: Number(o['Tổng tiền']) || 0,
            status,
            createdBy: stripLeadingQuote(o['ID người tạo']),
            createdByName: stripLeadingQuote(o['Tên người tạo']),
            createdAt: stripLeadingQuote(o['Ngày tạo']),
            approvedBy: stripLeadingQuote(o['Người duyệt']) || undefined,
            items: Array.isArray(items) ? items : [],
          };
        });
    }
  }

  // 4. ChiTiet_PhieuXuat
  const issRows2D = tables['ChiTiet_PhieuXuat'];
  if (Array.isArray(issRows2D) && issRows2D.length >= 1) {
    const objs = rows2DToObjects(issRows2D);
    if (issRows2D.length >= 2 || objs.length > 0) {
      result.issues = objs
        .filter((o) => stripLeadingQuote(o['ID']) || stripLeadingQuote(o['Số phiếu xuất']))
        .map((o, idx) => {
          const rawStatus = stripLeadingQuote(o['Trạng thái']);
          const status: StockIssue['status'] =
            rawStatus === 'DRAFT' || rawStatus === 'CANCELLED' ? rawStatus : 'APPROVED';
          const items = safeParseJson<StockIssueItem[]>(o['ChiTietJSON'], []);
          return {
            id: stripLeadingQuote(o['ID']) || `iss-sheet-${idx}`,
            issueCode: stripLeadingQuote(o['Số phiếu xuất']),
            issueDate: stripLeadingQuote(o['Ngày xuất']),
            receiverName: stripLeadingQuote(o['Người nhận']),
            receiverDept: stripLeadingQuote(o['Bộ phận nhận']),
            reason: stripLeadingQuote(o['Lý do xuất']),
            beneficiaryId: stripLeadingQuote(o['ID đối tượng']),
            beneficiaryName: stripLeadingQuote(o['Tên đối tượng']) || undefined,
            prescriptionId: stripLeadingQuote(o['ID đơn thuốc']) || undefined,
            usageLocation: stripLeadingQuote(o['Địa điểm sử dụng']),
            totalAmount: Number(o['Tổng tiền']) || 0,
            status,
            createdBy: stripLeadingQuote(o['ID người tạo']),
            createdByName: stripLeadingQuote(o['Tên người tạo']),
            createdAt: stripLeadingQuote(o['Ngày tạo']),
            approvedBy: stripLeadingQuote(o['Người duyệt']) || undefined,
            items: Array.isArray(items) ? items : [],
          };
        });
    }
  }

  // 5. DonThuoc_GiaoDich
  const ptxRows2D = tables['DonThuoc_GiaoDich'];
  if (Array.isArray(ptxRows2D) && ptxRows2D.length >= 2) {
    const objs = rows2DToObjects(ptxRows2D);
    const prescriptions: Prescription[] = [];
    const transactions: StockTransaction[] = [];
    const auditLogs: AuditLog[] = [];
    const syncedFiles: DriveSyncedFile[] = [];

    objs.forEach((o) => {
      const kind = stripLeadingQuote(o['LoaiBanGhi']).toUpperCase();
      const parsed = safeParseJson<any>(o['DuLieuJSON'], null);
      if (!parsed || typeof parsed !== 'object') return;
      if (kind === 'PRESCRIPTION') prescriptions.push(parsed as Prescription);
      else if (kind === 'TRANSACTION') transactions.push(parsed as StockTransaction);
      else if (kind === 'AUDIT_LOG') auditLogs.push(parsed as AuditLog);
      else if (kind === 'SYNCED_FILE') syncedFiles.push(parsed as DriveSyncedFile);
    });

    result.prescriptions = prescriptions;
    result.transactions = transactions;
    if (auditLogs.length > 0) result.auditLogs = auditLogs;
    if (syncedFiles.length > 0) result.syncedFiles = syncedFiles;
  }

  // 6. CauHinh_BieuMau
  const cfgRows2D = tables['CauHinh_BieuMau'];
  if (Array.isArray(cfgRows2D) && cfgRows2D.length >= 2) {
    const objs = rows2DToObjects(cfgRows2D);
    const partialCfg: Record<string, any> = {};
    objs.forEach((o) => {
      const k = stripLeadingQuote(o['Khoa']);
      if (!k || TRANSIENT_TEMPLATE_KEYS.has(k)) return;
      const rawVal = stripLeadingQuote(o['GiaTri']);
      if (k in DEFAULT_TEMPLATE_SETTINGS) {
        const defaultVal = (DEFAULT_TEMPLATE_SETTINGS as any)[k];
        if (typeof defaultVal === 'boolean') {
          partialCfg[k] = rawVal.toLowerCase() === 'true';
        } else {
          partialCfg[k] = rawVal;
        }
      }
    });
    if (Object.keys(partialCfg).length > 0) {
      result.templateSettings = partialCfg as Partial<TemplateSettings>;
    }
  }

  return result;
};

/**
 * Download a true native Excel (.XLSX) workbook with 4 sheets:
 * 1. Sheet "Phiếu nhập"
 * 2. Sheet "Phiếu xuất"
 * 3. Sheet "Báo cáo"
 * 4. Sheet "Tài khoản"
 */
export const downloadThreeSheetsExcelWorkbook = (
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  templateSettings: TemplateSettings,
  users: User[] = []
) => {
  const { receiptSheetRows, issueSheetRows, reportSheetRows, accountSheetRows } = buildFourSheetsData(
    beneficiaries,
    receipts,
    issues,
    medicines,
    transactions,
    users
  );

  const workbook = XLSX.utils.book_new();

  // Create Worksheets
  const wsReceipt = XLSX.utils.json_to_sheet(receiptSheetRows);
  const wsIssue = XLSX.utils.json_to_sheet(issueSheetRows);
  const wsReport = XLSX.utils.json_to_sheet(reportSheetRows);
  const wsAccount = XLSX.utils.json_to_sheet(accountSheetRows);

  // Auto column widths
  const setCols = (ws: XLSX.WorkSheet) => {
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 26 }, // Họ tên đối tượng
      { wch: 18 }, // Mã / BHYT
      { wch: 22 }, // Khu phòng
      { wch: 24 }, // Số phiếu
      { wch: 16 }, // Ngày
      { wch: 24 }, // Người giao / nhận
      { wch: 22 }, // HĐ / Lý do
      { wch: 38 }, // Thuốc
      { wch: 16 }, // SL
      { wch: 18 }, // Tiền
      { wch: 20 }, // Ghi chú
    ];
  };

  setCols(wsReceipt);
  setCols(wsIssue);
  wsReport['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
  ];
  wsAccount['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 24 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
  ];

  // Append all 4 sheets with exact requested names
  XLSX.utils.book_append_sheet(workbook, wsReceipt, 'Phiếu nhập');
  XLSX.utils.book_append_sheet(workbook, wsIssue, 'Phiếu xuất');
  XLSX.utils.book_append_sheet(workbook, wsReport, 'Báo cáo');
  XLSX.utils.book_append_sheet(workbook, wsAccount, 'Tài khoản');

  // Generate binary and trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `SaoLuu_GoogleSheets_TTBTXH_4Sheet_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
};

/**
 * Generate UTF-8 BOM CSV representation with 4 distinct sheet sections
 */
export const downloadThreeSheetsCSV = (
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  templateSettings: TemplateSettings,
  users: User[] = []
) => {
  const { receiptSheetRows, issueSheetRows, reportSheetRows, accountSheetRows } = buildFourSheetsData(
    beneficiaries,
    receipts,
    issues,
    medicines,
    transactions,
    users
  );

  const convertRowsToCsv = (rows: any[]) => {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const headerLine = headers.map((h) => `"${h}"`).join(',');
    const dataLines = rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] !== undefined && row[h] !== null ? String(row[h]).replace(/"/g, '""') : '';
          return `"${val}"`;
        })
        .join(',')
    );
    return [headerLine, ...dataLines].join('\n');
  };

  const csvContent = [
    `# =========================================================================`,
    `# SAO LƯU GOOGLE SHEETS 04 SHEET - TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG`,
    `# Cơ quan chủ quản: ${templateSettings.parentOrg} | Đơn vị: ${templateSettings.agencyName} - Mã QHNS: ${templateSettings.qhnsCode}`,
    `# Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
    `# =========================================================================`,
    '',
    '# >>> SHEET 1: PHIẾU NHẬP (DANH SÁCH ĐỐI TƯỢNG HƯỞNG THUỐC NHẬP KHO) <<<',
    convertRowsToCsv(receiptSheetRows),
    '',
    '# >>> SHEET 2: PHIẾU XUẤT (DANH SÁCH ĐỐI TƯỢNG HƯỞNG THUỐC XUẤT KHO) <<<',
    convertRowsToCsv(issueSheetRows),
    '',
    '# >>> SHEET 3: BÁO CÁO (BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BHYT) <<<',
    convertRowsToCsv(reportSheetRows),
    '',
    '# >>> SHEET 4: TÀI KHOẢN (DANH SÁCH CÁN BỘ & PHÂN QUYỀN TRUY CẬP) <<<',
    convertRowsToCsv(accountSheetRows),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `SaoLuu_GoogleSheets_TTBTXH_4Sheet_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
