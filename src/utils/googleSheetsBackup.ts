/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Beneficiary, StockReceipt, StockIssue, Medicine, StockTransaction, TemplateSettings } from '../types';

export interface ThreeSheetsData {
  receiptSheetRows: any[];
  issueSheetRows: any[];
  reportSheetRows: any[];
}

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

/**
 * Download a true native Excel (.XLSX) workbook with 3 sheets:
 * 1. Sheet "Phiếu nhập"
 * 2. Sheet "Phiếu xuất"
 * 3. Sheet "Báo cáo"
 * On each sheet, each row is a dedicated beneficiary.
 */
export const downloadThreeSheetsExcelWorkbook = (
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  templateSettings: TemplateSettings
) => {
  const { receiptSheetRows, issueSheetRows, reportSheetRows } = buildThreeSheetsBeneficiaryData(
    beneficiaries,
    receipts,
    issues,
    medicines,
    transactions
  );

  const workbook = XLSX.utils.book_new();

  // Create Worksheets
  const wsReceipt = XLSX.utils.json_to_sheet(receiptSheetRows);
  const wsIssue = XLSX.utils.json_to_sheet(issueSheetRows);
  const wsReport = XLSX.utils.json_to_sheet(reportSheetRows);

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

  // Append 3 sheets with exact requested names
  XLSX.utils.book_append_sheet(workbook, wsReceipt, 'Phiếu nhập');
  XLSX.utils.book_append_sheet(workbook, wsIssue, 'Phiếu xuất');
  XLSX.utils.book_append_sheet(workbook, wsReport, 'Báo cáo');

  // Generate binary and trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `SaoLuu_GoogleSheets_TTBTXH_3Sheet_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
};

/**
 * Generate UTF-8 BOM CSV representation with 3 distinct sheet sections
 * where each beneficiary sits on one line.
 */
export const downloadThreeSheetsCSV = (
  beneficiaries: Beneficiary[],
  receipts: StockReceipt[],
  issues: StockIssue[],
  medicines: Medicine[],
  transactions: StockTransaction[],
  templateSettings: TemplateSettings
) => {
  const { receiptSheetRows, issueSheetRows, reportSheetRows } = buildThreeSheetsBeneficiaryData(
    beneficiaries,
    receipts,
    issues,
    medicines,
    transactions
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
    `# SAO LƯU GOOGLE SHEETS TỐI ƯU 03 SHEET - TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG`,
    `# Cơ quan: ${templateSettings.agencyName} - Mã QHNS: ${templateSettings.qhnsCode}`,
    `# Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
    `# Quy tắc: Tại mỗi sheet, mỗi tên đối tượng nằm trên một dòng riêng biệt`,
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
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `SaoLuu_GoogleSheets_TTBTXH_3Sheet_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
