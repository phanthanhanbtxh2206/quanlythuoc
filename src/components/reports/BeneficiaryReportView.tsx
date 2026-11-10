/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PrintModal, PrintDocumentType } from '../print/PrintModal';
import { BeneficiaryReportRow } from '../../types';
import {
  FileSpreadsheet,
  Printer,
  Cloud,
  Download,
  Calendar,
  Users,
  Check,
  Edit3,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  Building2,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';

interface BeneficiaryReportViewProps {
  initialBeneficiaryId?: string;
}

export const BeneficiaryReportView: React.FC<BeneficiaryReportViewProps> = ({ initialBeneficiaryId }) => {
  const {
    beneficiaries,
    receipts,
    issues,
    calculateBeneficiaryReport,
    syncDocumentToDrive,
    templateSettings,
    exportFullGoogleSheetData,
  } = useApp();

  // Danh sách đối tượng trích xuất trực tiếp từ các Phiếu Nhập Kho (mục phiếu nhập)
  const receiptBeneficiaries = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        insuranceNumber: string;
        roomArea: string;
        receiptCount: number;
        receiptCodes: string[];
      }
    >();

    receipts.forEach((r) => {
      const benName = (r.beneficiaryName || '').trim();
      const benId = r.beneficiaryId || '';

      const masterBen = beneficiaries.find(
        (b) => (benId && b.id === benId) || (benName && b.fullName.toLowerCase() === benName.toLowerCase())
      );

      const resolvedName = benName || masterBen?.fullName || 'Đối tượng nhận thuốc';
      const key = resolvedName.toLowerCase();

      // Tìm thông tin phòng ở từ phiếu xuất liên quan nếu có
      const relatedIssue = issues.find(
        (i) => (benId && i.beneficiaryId === benId) || (benName && i.beneficiaryName?.toLowerCase() === benName.toLowerCase())
      );

      if (!map.has(key)) {
        map.set(key, {
          id: masterBen?.id || (benName ? `name:${benName}` : benId),
          name: resolvedName,
          code: masterBen?.code || `DT-${String(beneficiaries.length + map.size + 1).padStart(3, '0')}`,
          insuranceNumber: masterBen?.insuranceNumber || 'BHYT mua ngoài',
          roomArea: masterBen?.roomArea || relatedIssue?.usageLocation || 'Phòng Y Tế - TT BTXH',
          receiptCount: 1,
          receiptCodes: [r.receiptCode],
        });
      } else {
        const item = map.get(key)!;
        item.receiptCount += 1;
        if (!item.receiptCodes.includes(r.receiptCode)) {
          item.receiptCodes.push(r.receiptCode);
        }
      }
    });

    return Array.from(map.values());
  }, [receipts, beneficiaries, issues]);

  const otherBeneficiaries = useMemo(() => {
    const receiptNames = new Set(receiptBeneficiaries.map((rb) => rb.name.toLowerCase()));
    return beneficiaries.filter((b) => !receiptNames.has(b.fullName.toLowerCase()));
  }, [beneficiaries, receiptBeneficiaries]);

  const [selectedBenId, setSelectedBenId] = useState<string>(() => {
    if (initialBeneficiaryId) return initialBeneficiaryId;
    return '';
  });

  // Tự động gán mặc định đối tượng đầu tiên từ danh sách phiếu nhập nếu chưa chọn
  useEffect(() => {
    if (!selectedBenId) {
      if (receiptBeneficiaries.length > 0) {
        setSelectedBenId(receiptBeneficiaries[0].id);
      } else if (beneficiaries.length > 0) {
        setSelectedBenId(beneficiaries[0].id);
      }
    }
  }, [selectedBenId, receiptBeneficiaries, beneficiaries]);

  // Tìm đối tượng được chọn từ danh sách đối tượng phiếu nhập trước hoặc danh mục
  const currentBeneficiary = useMemo(() => {
    if (!selectedBenId) {
      if (receiptBeneficiaries.length > 0) return { ...receiptBeneficiaries[0], isFromReceipt: true };
      if (beneficiaries.length > 0) {
        const b = beneficiaries[0];
        return {
          id: b.id,
          name: b.fullName,
          code: b.code,
          insuranceNumber: b.insuranceNumber || 'BHYT',
          roomArea: b.roomArea,
          receiptCount: 0,
          receiptCodes: [],
          isFromReceipt: false,
        };
      }
      return null;
    }

    const clean = selectedBenId.toLowerCase();
    const fromR = receiptBeneficiaries.find(
      (rb) =>
        rb.id.toLowerCase() === clean ||
        rb.name.toLowerCase() === clean ||
        (selectedBenId.startsWith('name:') && rb.name.toLowerCase() === selectedBenId.slice(5).toLowerCase())
    );
    if (fromR) return { ...fromR, isFromReceipt: true };

    const fromB = beneficiaries.find((b) => b.id.toLowerCase() === clean || b.fullName.toLowerCase() === clean);
    if (fromB) {
      return {
        id: fromB.id,
        name: fromB.fullName,
        code: fromB.code,
        insuranceNumber: fromB.insuranceNumber || 'BHYT',
        roomArea: fromB.roomArea,
        receiptCount: 0,
        receiptCodes: [],
        isFromReceipt: false,
      };
    }

    return {
      id: selectedBenId,
      name: selectedBenId.startsWith('name:') ? selectedBenId.slice(5) : selectedBenId,
      code: 'DT-PNK',
      insuranceNumber: 'BHYT mua ngoài',
      roomArea: 'Phòng Y Tế',
      receiptCount: 0,
      receiptCodes: [],
      isFromReceipt: false,
    };
  }, [selectedBenId, receiptBeneficiaries, beneficiaries]);

  // Thu thập toàn bộ ngày phát sinh chứng từ của đối tượng này
  const benActivityDates = useMemo(() => {
    if (!currentBeneficiary) return [];
    const bName = currentBeneficiary.name.trim().toLowerCase();
    const bId = currentBeneficiary.id.toLowerCase();

    const isMatch = (tId?: string, tName?: string) => {
      const cleanId = (tId || '').trim().toLowerCase();
      const cleanName = (tName || '').trim().toLowerCase();
      return (
        (bId && cleanId && bId === cleanId) ||
        (bName && cleanName && bName === cleanName) ||
        (bId && cleanName && bId === cleanName) ||
        (bName && cleanId && bName === cleanId)
      );
    };

    const rDates = receipts.filter((r) => isMatch(r.beneficiaryId, r.beneficiaryName)).map((r) => r.receiptDate);
    const iDates = issues.filter((i) => isMatch(i.beneficiaryId, i.beneficiaryName)).map((i) => i.issueDate);
    return Array.from(new Set([...rDates, ...iDates])).filter(Boolean).sort();
  }, [currentBeneficiary, receipts, issues]);

  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [printDocument, setPrintDocument] = useState<PrintDocumentType | null>(null);
  const [driveSaved, setDriveSaved] = useState(false);

  // Edit Mode State for the whole Report
  const [isEditMode, setIsEditMode] = useState(false);

  // Editable Administrative Titles & Signatures initialized from templateSettings
  const [parentOrg, setParentOrg] = useState(templateSettings.parentOrg);
  const [agencyName, setAgencyName] = useState(templateSettings.agencyName);
  const [deptName, setDeptName] = useState(templateSettings.deptName);
  const [reportTitle, setReportTitle] = useState(templateSettings.reportTitle);
  const [preparerName, setPreparerName] = useState(templateSettings.preparerName);
  const [deptLeaderName, setDeptLeaderName] = useState(templateSettings.deptLeaderName);
  const [centerDirectorName, setCenterDirectorName] = useState(templateSettings.centerDirectorName);

  // Custom Beneficiary Info Override
  const [customBenName, setCustomBenName] = useState('');
  const [customBenCode, setCustomBenCode] = useState('');
  const [customInsuranceNumber, setCustomInsuranceNumber] = useState('');
  const [customRoomArea, setCustomRoomArea] = useState('');

  // Editable Rows State
  const [rows, setRows] = useState<BeneficiaryReportRow[]>([]);
  const [isCustomized, setIsCustomized] = useState(false);
  const lastBenKeyRef = React.useRef<string>('');

  // Tự động điền thông tin và trích xuất dữ liệu khi thay đổi đối tượng hoặc kỳ ngày
  useEffect(() => {
    if (!currentBeneficiary) return;

    const benKey = currentBeneficiary.id || currentBeneficiary.name;
    const isNewBen = lastBenKeyRef.current !== benKey;
    lastBenKeyRef.current = benKey;

    // Tự động điền đầy đủ các thông tin của đối tượng
    setCustomBenName(currentBeneficiary.name);
    setCustomBenCode(currentBeneficiary.code);
    setCustomInsuranceNumber(currentBeneficiary.insuranceNumber || 'BHYT mua ngoài');
    setCustomRoomArea(currentBeneficiary.roomArea);

    let activeStart = startDate;
    let activeEnd = endDate;

    // Khi chọn đối tượng mới, tự động điều chỉnh khoảng ngày bao trùm chứng từ thực tế
    if (isNewBen && benActivityDates.length > 0) {
      const earliest = benActivityDates[0];
      const latest = benActivityDates[benActivityDates.length - 1];
      activeStart = earliest.slice(0, 7) + '-01';
      activeEnd = latest.slice(0, 7) + '-31';
      setStartDate(activeStart);
      setEndDate(activeEnd);
    }

    const calculated = calculateBeneficiaryReport(
      benKey,
      activeStart,
      activeEnd
    );
    setRows(calculated);
    setIsCustomized(false);
  }, [currentBeneficiary, startDate, endDate, benActivityDates]);

  const handleResetToCalculated = () => {
    if (window.confirm('Khôi phục toàn bộ số liệu về giá trị tự động tính toán từ sổ giao dịch kho?')) {
      if (currentBeneficiary) {
        const calculated = calculateBeneficiaryReport(
          currentBeneficiary.id || currentBeneficiary.name,
          startDate,
          endDate
        );
        setRows(calculated);
        setCustomBenName(currentBeneficiary.name);
        setCustomBenCode(currentBeneficiary.code);
        setCustomInsuranceNumber(currentBeneficiary.insuranceNumber || '');
        setCustomRoomArea(currentBeneficiary.roomArea);
        setIsCustomized(false);
      }
    }
  };

  const handleRowChange = (index: number, field: keyof BeneficiaryReportRow, value: any) => {
    setIsCustomized(true);
    const updated = [...rows];
    const currentRow = { ...updated[index], [field]: value };

    // Auto-update totals if quantity or price changed
    if (field === 'openingQty' || field === 'openingPrice') {
      currentRow.openingAmount = currentRow.openingQty * currentRow.openingPrice;
    }
    if (field === 'inQty' || field === 'inPrice') {
      currentRow.inAmount = currentRow.inQty * currentRow.inPrice;
    }
    if (field === 'outQty' || field === 'outPrice') {
      currentRow.outAmount = currentRow.outQty * currentRow.outPrice;
    }

    // Auto calculate Total In
    currentRow.totalInQty = currentRow.openingQty + currentRow.inQty;
    currentRow.totalInAmount = currentRow.openingAmount + currentRow.inAmount;
    currentRow.totalInPrice = currentRow.totalInQty > 0 ? Number((currentRow.totalInAmount / currentRow.totalInQty).toFixed(2)) : 0;

    // Auto calculate Closing Balance
    currentRow.closingQty = currentRow.totalInQty - currentRow.outQty;
    currentRow.closingAmount = currentRow.totalInAmount - currentRow.outAmount;
    currentRow.closingPrice = currentRow.closingQty > 0 ? Number((currentRow.closingAmount / currentRow.closingQty).toFixed(2)) : 0;

    updated[index] = currentRow;
    setRows(updated);
  };

  const handleAddCustomRow = () => {
    setIsCustomized(true);
    const newRow: BeneficiaryReportRow = {
      stt: rows.length + 1,
      medicineId: `custom-med-${Date.now()}`,
      medicineName: 'Thuốc mới tùy chỉnh',
      activeIngredient: '',
      concentration: '',
      unit: 'Viên',
      openingQty: 0,
      openingPrice: 0,
      openingAmount: 0,
      inQty: 10,
      inPrice: 1500,
      inAmount: 15000,
      totalInQty: 10,
      totalInPrice: 1500,
      totalInAmount: 15000,
      outQty: 5,
      outPrice: 1500,
      outAmount: 7500,
      closingQty: 5,
      closingPrice: 1500,
      closingAmount: 7500,
    };
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    setIsCustomized(true);
    const updated = rows.filter((_, i) => i !== index).map((r, idx) => ({ ...r, stt: idx + 1 }));
    setRows(updated);
  };

  // Grand Totals
  const grandTotal = {
    openingQty: rows.reduce((s, r) => s + (Number(r.openingQty) || 0), 0),
    openingAmount: rows.reduce((s, r) => s + (Number(r.openingAmount) || 0), 0),
    inQty: rows.reduce((s, r) => s + (Number(r.inQty) || 0), 0),
    inAmount: rows.reduce((s, r) => s + (Number(r.inAmount) || 0), 0),
    totalInQty: rows.reduce((s, r) => s + (Number(r.totalInQty) || 0), 0),
    totalInAmount: rows.reduce((s, r) => s + (Number(r.totalInAmount) || 0), 0),
    outQty: rows.reduce((s, r) => s + (Number(r.outQty) || 0), 0),
    outAmount: rows.reduce((s, r) => s + (Number(r.outAmount) || 0), 0),
    closingQty: rows.reduce((s, r) => s + (Number(r.closingQty) || 0), 0),
    closingAmount: rows.reduce((s, r) => s + (Number(r.closingAmount) || 0), 0),
  };

  const handleOpenPrint = () => {
    if (!currentBeneficiary) return;
    const masterBen = beneficiaries.find(
      (b) => b.id === currentBeneficiary.id || b.fullName.toLowerCase() === currentBeneficiary.name.toLowerCase()
    );
    const benObj = {
      id: currentBeneficiary.id,
      fullName: customBenName || currentBeneficiary.name,
      code: customBenCode || currentBeneficiary.code,
      insuranceNumber: customInsuranceNumber || currentBeneficiary.insuranceNumber,
      roomArea: customRoomArea || currentBeneficiary.roomArea,
      birthYear: masterBen?.birthYear || 1950,
      gender: masterBen?.gender || ('Nam' as const),
      status: masterBen?.status || ('Đang quản lý' as const),
      createdAt: masterBen?.createdAt || new Date().toISOString(),
      idCard: masterBen?.idCard,
      note: masterBen?.note,
    };

    setPrintDocument({
      type: 'BENEFICIARY_REPORT',
      data: {
        beneficiary: benObj,
        startDate,
        endDate,
        rows,
        customTitles: {
          parentOrg,
          agencyName,
          deptName,
          reportTitle,
          preparerName,
          deptLeaderName,
          centerDirectorName,
        },
      },
    });
  };

  const handleSaveToDrive = () => {
    if (!currentBeneficiary) return;
    const docCode = `BC-${customBenCode || currentBeneficiary.code}-${startDate}_${endDate}`;
    const fileName = `BaoCao_BHYT_${customBenCode || currentBeneficiary.code}_${startDate}.pdf`;
    syncDocumentToDrive(docCode, 'BAO_CAO_BHYT', fileName);
    setDriveSaved(true);
    setTimeout(() => setDriveSaved(false), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      'STT',
      'TenThuoc_HamLuong',
      'DVT',
      'TonDau_SL',
      'TonDau_DonGia',
      'TonDau_ThanhTien',
      'Nhap_SL',
      'Nhap_DonGia',
      'Nhap_ThanhTien',
      'TongNhap_SL',
      'TongNhap_DonGia',
      'TongNhap_ThanhTien',
      'Xuat_SL',
      'Xuat_DonGia',
      'Xuat_ThanhTien',
      'TonCuoi_SL',
      'TonCuoi_DonGia',
      'TonCuoi_ThanhTien',
    ];

    const csvRows = [headers.join(',')];
    rows.forEach((r) => {
      csvRows.push(
        [
          r.stt,
          `"${r.medicineName}"`,
          r.unit,
          r.openingQty,
          r.openingPrice,
          r.openingAmount,
          r.inQty,
          r.inPrice,
          r.inAmount,
          r.totalInQty,
          r.totalInPrice,
          r.totalInAmount,
          r.outQty,
          r.outPrice,
          r.outAmount,
          r.closingQty,
          r.closingPrice,
          r.closingAmount,
        ].join(',')
      );
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoCao_BHYT_${customBenCode || currentBeneficiary?.code || 'DT'}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Parameter Selection Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Beneficiary Picker */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-0.5">
              Chọn đối tượng xuất báo cáo (Theo tên ở Phiếu Nhập):
            </label>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <select
                value={selectedBenId || currentBeneficiary?.id || ''}
                onChange={(e) => setSelectedBenId(e.target.value)}
                className="text-xs font-bold p-1.5 border border-teal-300 rounded-lg bg-teal-50/40 text-slate-900 min-w-72 shadow-2xs focus:border-teal-500 focus:bg-white transition-all"
              >
                {receiptBeneficiaries.length > 0 && (
                  <optgroup label={`📋 Đối tượng trong mục Phiếu Nhập Kho (${receiptBeneficiaries.length} người)`}>
                    {receiptBeneficiaries.map((rb) => (
                      <option key={rb.id} value={rb.id}>
                        {rb.name} · {rb.receiptCount} phiếu nhập ({rb.receiptCodes.slice(0, 2).join(', ')}{rb.receiptCodes.length > 2 ? '...' : ''})
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherBeneficiaries.length > 0 && (
                  <optgroup label={`👥 Đối tượng khác trong hồ sơ quản lý (${otherBeneficiaries.length} người)`}>
                    {otherBeneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.fullName} · {b.code} ({b.insuranceNumber || 'Chưa có BHYT'})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {currentBeneficiary?.isFromReceipt && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-2xs">
              <span className="font-bold">✓ Khớp Phiếu Nhập:</span>
              <span>
                {currentBeneficiary.receiptCount} phiếu nhập ({currentBeneficiary.receiptCodes.join(', ')})
              </span>
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-0.5">Từ ngày:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-0.5">Đến ngày:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Edit Mode */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isEditMode
                ? 'bg-amber-600 text-white shadow-xs'
                : 'border border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditMode ? 'Đang Hiệu Chỉnh' : 'Bật Hiệu Chỉnh Biểu Mẫu'}</span>
          </button>

          {isCustomized && (
            <button
              onClick={handleResetToCalculated}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs text-slate-600"
              title="Khôi phục số liệu tự động tính từ sổ kho"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục gốc</span>
            </button>
          )}

          <button
            onClick={exportFullGoogleSheetData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="Xuất tệp Google Sheet / Excel tối ưu 03 Sheet: Phiếu nhập, Phiếu xuất, Báo cáo (1 dòng / đối tượng)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất 03 Sheet (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
            title="Xuất báo cáo cá nhân định dạng CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={handleSaveToDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-semibold transition-colors"
          >
            {driveSaved ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Cloud className="w-3.5 h-3.5" />}
            <span>{driveSaved ? 'Đã lưu Drive' : 'Lưu Drive'}</span>
          </button>

          <button
            onClick={handleOpenPrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo Chuẩn A4</span>
          </button>
        </div>
      </div>

      {/* Auto-Extraction Status Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>Hệ thống tự động trích xuất dữ liệu từ Phiếu Nhập & Phiếu Xuất kho</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-2xs font-bold">
                {rows.length} mặt hàng thuốc
              </span>
            </div>
            <div className="text-2xs text-slate-600 mt-0.5">
              Đối tượng: <strong className="text-teal-900">{customBenName || 'Chưa chọn'}</strong>
              {benActivityDates.length > 0 ? (
                <> · Ghi nhận hoạt động từ ngày <strong className="text-slate-800">{formatDate(benActivityDates[0])}</strong> đến <strong className="text-slate-800">{formatDate(benActivityDates[benActivityDates.length - 1])}</strong></>
              ) : (
                <> · Sẵn sàng tự động tổng hợp khi có phát sinh phiếu nhập/xuất</>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {benActivityDates.length > 0 && (
            <button
              onClick={() => {
                setStartDate(benActivityDates[0]);
                setEndDate(benActivityDates[benActivityDates.length - 1]);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white hover:bg-teal-50 text-teal-800 text-2xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
              title="Tự động căn chỉnh từ ngày đến ngày bao trọn toàn bộ phiếu nhập và xuất của đối tượng"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Bao trọn thời gian ({formatDate(benActivityDates[0])} - {formatDate(benActivityDates[benActivityDates.length - 1])})</span>
            </button>
          )}
          <button
            onClick={handleResetToCalculated}
            className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-2xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
            title="Tự động đồng bộ và nạp lại toàn bộ số lượng, đơn giá trực tiếp từ các phiếu nhập kho"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tự động trích xuất lại</span>
          </button>
        </div>
      </div>

      {/* Edit Mode Notice Ribbon */}
      {isEditMode && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Chế độ hiệu chỉnh biểu mẫu đang bật:</strong> Bạn có thể sửa trực tiếp thông tin cơ quan, tên
              đối tượng, số thẻ BHYT, từng dòng số lượng, đơn giá, bổ sung dòng thuốc mới hoặc đổi chữ ký theo nhu cầu
              thực tế.
            </span>
          </div>
          <button
            onClick={handleAddCustomRow}
            className="flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-2xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Dòng Thuốc Mới</span>
          </button>
        </div>
      )}

      {/* Official Report Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs overflow-x-auto">
        {/* Administrative Header */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
          <div>
            {isEditMode ? (
              <div className="space-y-1 w-80">
                <input
                  type="text"
                  value={parentOrg}
                  onChange={(e) => setParentOrg(e.target.value)}
                  className="w-full text-xs font-bold uppercase p-1 border border-amber-300 rounded bg-amber-50/50"
                  placeholder="Tên cơ quan cấp trên..."
                />
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full text-xs font-bold uppercase p-1 border border-amber-300 rounded bg-amber-50/50"
                  placeholder="Tên đơn vị..."
                />
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full text-2xs font-semibold uppercase p-1 border border-amber-300 rounded bg-amber-50/50 text-teal-800"
                  placeholder="Tên bộ phận..."
                />
              </div>
            ) : (
              <div>
                <div className="font-bold text-xs uppercase text-slate-900">{parentOrg}</div>
                <div className="font-bold text-xs uppercase text-slate-800">{agencyName}</div>
                <div className="text-2xs text-teal-700 font-semibold uppercase">{deptName}</div>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-bold text-xs uppercase text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="text-xs italic text-slate-600 font-medium">Độc lập - Tự do - Hạnh phúc</div>
          </div>
        </div>

        {/* Title & Beneficiary Info */}
        <div className="text-center my-4">
          {isEditMode ? (
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full max-w-2xl text-center text-sm font-bold uppercase p-1.5 border border-amber-300 rounded bg-amber-50/50"
            />
          ) : (
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-900">{reportTitle}</h2>
          )}

          <div className="text-xs italic text-slate-500 mt-1">
            Kỳ báo cáo: Từ ngày <span className="font-semibold text-slate-700">{formatDate(startDate)}</span> đến ngày{' '}
            <span className="font-semibold text-slate-700">{formatDate(endDate)}</span>
          </div>

          <div className="text-xs font-medium text-slate-800 mt-2 bg-slate-50 py-2 px-3 rounded-lg inline-block border border-slate-200">
            {isEditMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>Họ tên ĐT:</span>
                <input
                  type="text"
                  value={customBenName}
                  onChange={(e) => setCustomBenName(e.target.value)}
                  className="font-bold uppercase p-1 border border-amber-300 rounded bg-white text-xs w-44"
                />
                <span>Mã:</span>
                <input
                  type="text"
                  value={customBenCode}
                  onChange={(e) => setCustomBenCode(e.target.value)}
                  className="font-mono font-bold p-1 border border-amber-300 rounded bg-white text-xs w-20"
                />
                <span>Số BHYT:</span>
                <input
                  type="text"
                  value={customInsuranceNumber}
                  onChange={(e) => setCustomInsuranceNumber(e.target.value)}
                  className="font-mono font-bold p-1 border border-amber-300 rounded bg-white text-xs text-teal-800 w-36"
                />
                <span>Khu:</span>
                <input
                  type="text"
                  value={customRoomArea}
                  onChange={(e) => setCustomRoomArea(e.target.value)}
                  className="p-1 border border-amber-300 rounded bg-white text-xs w-36"
                />
              </div>
            ) : (
              <div>
                Họ và tên đối tượng: <span className="font-bold text-slate-900 uppercase">{customBenName}</span> · Mã
                ĐT: <span className="font-mono font-bold">{customBenCode}</span> · Số thẻ BHYT:{' '}
                <span className="font-mono font-bold text-teal-800">{customInsuranceNumber}</span> · Khu:{' '}
                <span>{customRoomArea}</span>
              </div>
            )}
          </div>
        </div>

        {/* 6 Cluster Table Matching Sheet Báo Cáo */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-2xs border-collapse border border-slate-300 text-left">
            <thead>
              <tr className="bg-slate-100 font-bold text-center text-slate-800">
                <th rowSpan={2} className="border border-slate-300 p-2 w-8">STT</th>
                <th rowSpan={2} className="border border-slate-300 p-2 min-w-48">Tên thuốc và hàm lượng</th>
                <th rowSpan={2} className="border border-slate-300 p-2 w-12 text-center">ĐVT</th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-amber-50/70 text-amber-900">
                  Tồn đầu kỳ
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-blue-50/70 text-blue-900">
                  Nhập trong kỳ
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-indigo-50/70 text-indigo-900">
                  Tổng nhập (= Tồn đầu + Nhập)
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-rose-50/70 text-rose-900">
                  Xuất trong kỳ
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-emerald-50/70 text-emerald-900">
                  Tồn cuối kỳ (= Tổng nhập - Xuất)
                </th>
                {isEditMode && <th rowSpan={2} className="border border-slate-300 p-1 w-10 text-center">Xóa</th>}
              </tr>
              <tr className="bg-slate-50 font-semibold text-center text-3xs text-slate-600">
                {/* Tồn đầu */}
                <th className="border border-slate-300 p-1 w-10">SL</th>
                <th className="border border-slate-300 p-1 w-14">Đơn giá</th>
                <th className="border border-slate-300 p-1 w-16">Thành tiền</th>
                {/* Nhập */}
                <th className="border border-slate-300 p-1 w-10">SL</th>
                <th className="border border-slate-300 p-1 w-14">Đơn giá</th>
                <th className="border border-slate-300 p-1 w-16">Thành tiền</th>
                {/* Tổng nhập */}
                <th className="border border-slate-300 p-1 w-10 font-bold text-indigo-900">SL</th>
                <th className="border border-slate-300 p-1 w-14">Đơn giá</th>
                <th className="border border-slate-300 p-1 w-16 font-bold text-indigo-900">Thành tiền</th>
                {/* Xuất */}
                <th className="border border-slate-300 p-1 w-10">SL</th>
                <th className="border border-slate-300 p-1 w-14">Đơn giá</th>
                <th className="border border-slate-300 p-1 w-16">Thành tiền</th>
                {/* Tồn cuối */}
                <th className="border border-slate-300 p-1 w-10 font-bold text-teal-900">SL</th>
                <th className="border border-slate-300 p-1 w-14">Đơn giá</th>
                <th className="border border-slate-300 p-1 w-16 font-bold text-teal-900">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={isEditMode ? 19 : 18} className="border border-slate-300 p-6 text-center italic text-slate-500">
                    Đối tượng này chưa có dữ liệu giao dịch nhập xuất thuốc nào phát sinh trong kỳ đã chọn.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.medicineId || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="border border-slate-300 p-1.5 text-center font-mono">{row.stt}</td>
                    <td className="border border-slate-300 p-1.5">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={row.medicineName}
                          onChange={(e) => handleRowChange(idx, 'medicineName', e.target.value)}
                          className="w-full font-bold p-1 border border-amber-300 rounded bg-amber-50/40 text-2xs"
                        />
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900">{row.medicineName}</div>
                          {row.activeIngredient && (
                            <div className="text-3xs text-slate-400">
                              {row.activeIngredient} ({row.concentration})
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-700">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                          className="w-full text-center p-1 border border-amber-300 rounded bg-amber-50/40 text-2xs"
                        />
                      ) : (
                        row.unit
                      )}
                    </td>

                    {/* Tồn đầu */}
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={row.openingQty}
                          onChange={(e) => handleRowChange(idx, 'openingQty', Number(e.target.value))}
                          className="w-12 text-right p-0.5 border border-amber-300 rounded bg-amber-50/40 text-2xs"
                        />
                      ) : (
                        formatNumber(row.openingQty)
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={row.openingPrice}
                          onChange={(e) => handleRowChange(idx, 'openingPrice', Number(e.target.value))}
                          className="w-14 text-right p-0.5 border border-amber-300 rounded bg-amber-50/40 text-2xs"
                        />
                      ) : (
                        formatNumber(row.openingPrice)
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      {formatNumber(row.openingAmount)}
                    </td>

                    {/* Nhập */}
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={row.inQty}
                          onChange={(e) => handleRowChange(idx, 'inQty', Number(e.target.value))}
                          className="w-12 text-right p-0.5 border border-amber-300 rounded bg-amber-50/40 text-2xs font-bold"
                        />
                      ) : (
                        formatNumber(row.inQty)
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={row.inPrice}
                          onChange={(e) => handleRowChange(idx, 'inPrice', Number(e.target.value))}
                          className="w-14 text-right p-0.5 border border-amber-300 rounded bg-amber-50/40 text-2xs"
                        />
                      ) : (
                        formatNumber(row.inPrice)
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      {formatNumber(row.inAmount)}
                    </td>

                    {/* Tổng nhập */}
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-indigo-900 bg-indigo-50/20">
                      {formatNumber(row.totalInQty)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono bg-indigo-50/20">
                      {formatNumber(row.totalInPrice)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-indigo-900 bg-indigo-50/20">
                      {formatNumber(row.totalInAmount)}
                    </td>

                    {/* Xuất */}
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={row.outQty}
                          onChange={(e) => handleRowChange(idx, 'outQty', Number(e.target.value))}
                          className="w-12 text-right p-0.5 border border-amber-300 rounded bg-amber-50/40 text-2xs font-bold text-rose-700"
                        />
                      ) : (
                        formatNumber(row.outQty)
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={row.outPrice}
                          onChange={(e) => handleRowChange(idx, 'outPrice', Number(e.target.value))}
                          className="w-14 text-right p-0.5 border border-amber-300 rounded bg-amber-50/40 text-2xs"
                        />
                      ) : (
                        formatNumber(row.outPrice)
                      )}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      {formatNumber(row.outAmount)}
                    </td>

                    {/* Tồn cuối */}
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-teal-800 bg-emerald-50/20">
                      {formatNumber(row.closingQty)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono bg-emerald-50/20">
                      {formatNumber(row.closingPrice)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-teal-800 bg-emerald-50/20">
                      {formatNumber(row.closingAmount)}
                    </td>

                    {isEditMode && (
                      <td className="border border-slate-300 p-1 text-center">
                        <button
                          onClick={() => handleRemoveRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Xóa dòng thuốc này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}

              {/* Grand Total */}
              {rows.length > 0 && (
                <tr className="font-bold bg-slate-100 text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={3} className="border border-slate-300 p-2 text-center uppercase">
                    Cộng tổng số:
                  </td>

                  {/* Tồn đầu */}
                  <td className="border border-slate-300 p-1 text-right font-mono">
                    {formatNumber(grandTotal.openingQty)}
                  </td>
                  <td className="border border-slate-300 p-1 text-right">-</td>
                  <td className="border border-slate-300 p-1 text-right font-mono">
                    {formatNumber(grandTotal.openingAmount)}
                  </td>

                  {/* Nhập */}
                  <td className="border border-slate-300 p-1 text-right font-mono">
                    {formatNumber(grandTotal.inQty)}
                  </td>
                  <td className="border border-slate-300 p-1 text-right">-</td>
                  <td className="border border-slate-300 p-1 text-right font-mono">
                    {formatNumber(grandTotal.inAmount)}
                  </td>

                  {/* Tổng nhập */}
                  <td className="border border-slate-300 p-1 text-right font-mono text-indigo-900">
                    {formatNumber(grandTotal.totalInQty)}
                  </td>
                  <td className="border border-slate-300 p-1 text-right">-</td>
                  <td className="border border-slate-300 p-1 text-right font-mono text-indigo-900">
                    {formatNumber(grandTotal.totalInAmount)}
                  </td>

                  {/* Xuất */}
                  <td className="border border-slate-300 p-1 text-right font-mono">
                    {formatNumber(grandTotal.outQty)}
                  </td>
                  <td className="border border-slate-300 p-1 text-right">-</td>
                  <td className="border border-slate-300 p-1 text-right font-mono">
                    {formatNumber(grandTotal.outAmount)}
                  </td>

                  {/* Tồn cuối */}
                  <td className="border border-slate-300 p-1 text-right font-mono text-teal-800">
                    {formatNumber(grandTotal.closingQty)}
                  </td>
                  <td className="border border-slate-300 p-1 text-right">-</td>
                  <td className="border border-slate-300 p-1 text-right font-mono text-teal-800">
                    {formatNumber(grandTotal.closingAmount)}
                  </td>
                  {isEditMode && <td className="border border-slate-300 p-1"></td>}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footnote and Signatures (Editable) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs mt-8 pt-4 border-t border-slate-100">
          <div>
            <div className="font-bold uppercase text-slate-800">Người lập biểu</div>
            <div className="text-2xs italic text-slate-500">(Ký, họ tên)</div>
            <div className="h-14 flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={preparerName}
                  onChange={(e) => setPreparerName(e.target.value)}
                  className="font-semibold text-center p-1 border border-amber-300 rounded bg-white text-xs"
                />
              ) : null}
            </div>
            {!isEditMode && <div className="font-semibold text-slate-900">{preparerName}</div>}
          </div>

          <div>
            <div className="font-bold uppercase text-slate-800">Phụ trách Phòng Y tế - PHCN</div>
            <div className="text-2xs italic text-slate-500">(Ký, họ tên)</div>
            <div className="h-14 flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={deptLeaderName}
                  onChange={(e) => setDeptLeaderName(e.target.value)}
                  className="font-semibold text-center p-1 border border-amber-300 rounded bg-white text-xs"
                />
              ) : null}
            </div>
            {!isEditMode && <div className="font-semibold text-slate-900">{deptLeaderName}</div>}
          </div>

          <div>
            <div className="font-bold uppercase text-slate-800">Thủ trưởng đơn vị</div>
            <div className="text-2xs italic text-slate-500">(Ký, họ tên, đóng dấu)</div>
            <div className="h-14 flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={centerDirectorName}
                  onChange={(e) => setCenterDirectorName(e.target.value)}
                  className="font-semibold text-center p-1 border border-amber-300 rounded bg-white text-xs"
                />
              ) : null}
            </div>
            {!isEditMode && <div className="font-semibold text-slate-900">{centerDirectorName}</div>}
          </div>
        </div>
      </div>

      <PrintModal document={printDocument} onClose={() => setPrintDocument(null)} />
    </div>
  );
};
