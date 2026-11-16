/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles,
  ExternalLink,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import { formatNumber, formatDate } from '../../utils/formatters';

const normalizeVi = (str: string): string =>
  (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

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
    hasPermission,
    currentUser,
  } = useApp();

  const canEditReport = hasPermission('canEditReport');
  const canExportReport = hasPermission('canExportReport');
  const isAdmin = currentUser?.role === 'ADMIN' && hasPermission('canManageSync');

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

  // Searchable combobox state
  const [benSearchInput, setBenSearchInput] = useState('');
  const [isBenDropdownOpen, setIsBenDropdownOpen] = useState(false);
  const [isFilteringBen, setIsFilteringBen] = useState(false);
  const benDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close beneficiary dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (benDropdownRef.current && !benDropdownRef.current.contains(event.target as Node)) {
        setIsBenDropdownOpen(false);
        setIsFilteringBen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Keep visible search input synced with currently active beneficiary when not actively typing
  useEffect(() => {
    if (!isFilteringBen && currentBeneficiary?.name) {
      setBenSearchInput(currentBeneficiary.name);
    }
  }, [currentBeneficiary?.name, isFilteringBen]);

  const activeQuery = isFilteringBen ? normalizeVi(benSearchInput) : '';

  const filteredReceiptBeneficiaries = useMemo(() => {
    if (!activeQuery) return receiptBeneficiaries;
    return receiptBeneficiaries.filter((rb) => {
      const haystack = normalizeVi(
        `${rb.name} ${rb.code} ${rb.insuranceNumber} ${rb.roomArea} ${rb.receiptCodes.join(' ')}`
      );
      return haystack.includes(activeQuery);
    });
  }, [receiptBeneficiaries, activeQuery]);

  const filteredOtherBeneficiaries = useMemo(() => {
    if (!activeQuery) return otherBeneficiaries;
    return otherBeneficiaries.filter((b) => {
      const haystack = normalizeVi(`${b.fullName} ${b.code} ${b.insuranceNumber || ''} ${b.roomArea}`);
      return haystack.includes(activeQuery);
    });
  }, [otherBeneficiaries, activeQuery]);

  const hasExactBenMatch = useMemo(() => {
    const cleanTyped = normalizeVi(benSearchInput);
    if (!cleanTyped) return true;
    return (
      receiptBeneficiaries.some((rb) => normalizeVi(rb.name) === cleanTyped) ||
      otherBeneficiaries.some((b) => normalizeVi(b.fullName) === cleanTyped)
    );
  }, [benSearchInput, receiptBeneficiaries, otherBeneficiaries]);

  const handleSelectBeneficiary = (id: string, displayName: string) => {
    setSelectedBenId(id);
    setBenSearchInput(displayName);
    setIsFilteringBen(false);
    setIsBenDropdownOpen(false);
  };

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
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveSavedInfo, setDriveSavedInfo] = useState<{ message: string; link?: string } | null>(null);

  // Edit Mode State for the whole Report
  const [isEditMode, setIsEditMode] = useState(false);

  // Editable Administrative Titles & Signatures initialized from templateSettings
  const [parentOrg, setParentOrg] = useState(templateSettings.parentOrg);
  const [agencyName, setAgencyName] = useState(templateSettings.agencyName);
  const [deptName, setDeptName] = useState(templateSettings.deptName);
  const [nationalMottoTop, setNationalMottoTop] = useState(templateSettings.nationalMottoTop);
  const [nationalMottoSub, setNationalMottoSub] = useState(templateSettings.nationalMottoSub);
  const [reportTitle, setReportTitle] = useState(templateSettings.reportTitle);
  const [reportSubtitle, setReportSubtitle] = useState(templateSettings.reportSubtitle);
  const [reportFooterNote, setReportFooterNote] = useState(templateSettings.reportFooterNote);
  const [preparerName, setPreparerName] = useState(templateSettings.preparerName);
  const [deptLeaderName, setDeptLeaderName] = useState(templateSettings.deptLeaderName);
  const [centerDirectorName, setCenterDirectorName] = useState(templateSettings.centerDirectorName);

  useEffect(() => {
    setParentOrg(templateSettings.parentOrg);
    setAgencyName(templateSettings.agencyName);
    setDeptName(templateSettings.deptName);
    setNationalMottoTop(templateSettings.nationalMottoTop);
    setNationalMottoSub(templateSettings.nationalMottoSub);
    setReportTitle(templateSettings.reportTitle);
    setReportSubtitle(templateSettings.reportSubtitle);
    setReportFooterNote(templateSettings.reportFooterNote);
    setPreparerName(templateSettings.preparerName);
    setDeptLeaderName(templateSettings.deptLeaderName);
    setCenterDirectorName(templateSettings.centerDirectorName);
  }, [templateSettings]);

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
          nationalMottoTop,
          nationalMottoSub,
          reportTitle,
          reportSubtitle,
          reportFooterNote,
          preparerName,
          deptLeaderName,
          centerDirectorName,
        },
      },
    });
  };

  const handleSaveToDrive = async () => {
    if (!currentBeneficiary || !isAdmin) return;
    const docCode = `BC-${customBenCode || currentBeneficiary.code}-${startDate}_${endDate}`;
    const fileName = `BaoCao_BHYT_${customBenCode || currentBeneficiary.code}_${startDate}.html`;
    const reportEl = document.getElementById('beneficiary-report-canvas');
    const htmlSnapshot = reportEl
      ? `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><title>${docCode}</title><style>body{font-family:"Times New Roman",serif;margin:24px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #0f172a;padding:6px;}</style></head><body>${reportEl.innerHTML}</body></html>`
      : undefined;

    setDriveSaving(true);
    setDriveSavedInfo(null);
    const saved = await syncDocumentToDrive(docCode, 'BAO_CAO_BHYT', fileName, htmlSnapshot);
    setDriveSaving(false);

    if (saved) {
      const msg =
        saved.uploadChannel === 'APPS_SCRIPT'
          ? 'Đã lưu báo cáo lên Google Drive qua Apps Script.'
          : saved.uploadChannel === 'OAUTH_DRIVE_V3'
          ? 'Đã lưu báo cáo lên Google Drive qua OAuth API.'
          : 'Đã ghi nhận lưu cục bộ (chưa kết nối Google Drive cloud).';
      setDriveSavedInfo({ message: msg, link: saved.webViewLink });
    }
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
      {/* Parameter Selection & Action Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Row 1: Searchable Beneficiary & Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Searchable Beneficiary Combobox */}
          <div className="md:col-span-6 lg:col-span-5 relative" ref={benDropdownRef}>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Tìm &amp; chọn đối tượng xuất báo cáo (Tên, mã ĐT, thẻ BHYT):
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-teal-600 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={benSearchInput}
                onFocus={(e) => {
                  setIsBenDropdownOpen(true);
                  e.target.select();
                }}
                onChange={(e) => {
                  setBenSearchInput(e.target.value);
                  setIsFilteringBen(true);
                  setIsBenDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsBenDropdownOpen(false);
                    setIsFilteringBen(false);
                    setBenSearchInput(currentBeneficiary?.name || '');
                  } else if (e.key === 'Enter' && isBenDropdownOpen) {
                    e.preventDefault();
                    if (filteredReceiptBeneficiaries.length > 0) {
                      const first = filteredReceiptBeneficiaries[0];
                      handleSelectBeneficiary(first.id, first.name);
                    } else if (filteredOtherBeneficiaries.length > 0) {
                      const first = filteredOtherBeneficiaries[0];
                      handleSelectBeneficiary(first.id, first.fullName);
                    } else if (benSearchInput.trim()) {
                      const typed = benSearchInput.trim();
                      handleSelectBeneficiary(`name:${typed}`, typed);
                    }
                  }
                }}
                placeholder="Gõ tên đối tượng, mã hoặc số thẻ BHYT..."
                className="w-full pl-9 pr-14 py-2 text-xs font-bold border border-teal-300 rounded-lg bg-teal-50/35 text-slate-900 shadow-2xs focus:border-teal-600 focus:bg-white focus:outline-hidden transition-all"
                aria-label="Tìm kiếm đối tượng xuất báo cáo"
                aria-expanded={isBenDropdownOpen}
                role="combobox"
              />
              <div className="absolute right-1.5 flex items-center gap-0.5">
                {benSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setBenSearchInput('');
                      setIsFilteringBen(true);
                      setIsBenDropdownOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                    title="Xóa từ khóa để tìm đối tượng khác"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsBenDropdownOpen((prev) => !prev);
                    setIsFilteringBen(false);
                  }}
                  className="p-1 text-slate-500 hover:text-teal-700 rounded hover:bg-teal-50 transition-colors"
                  title="Mở danh sách đối tượng"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-150 ${isBenDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Searchable Dropdown List */}
            {isBenDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {filteredReceiptBeneficiaries.length > 0 && (
                  <div className="p-1.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50/70 rounded-md mb-1">
                      Đối tượng trong Phiếu Nhập Kho ({filteredReceiptBeneficiaries.length})
                    </div>
                    {filteredReceiptBeneficiaries.map((rb) => {
                      const isSelected = currentBeneficiary?.name.toLowerCase() === rb.name.toLowerCase();
                      return (
                        <button
                          key={rb.id}
                          type="button"
                          onClick={() => handleSelectBeneficiary(rb.id, rb.name)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                            isSelected ? 'bg-teal-50 text-teal-950' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{rb.name}</div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              <span className="font-mono">{rb.code}</span> · {rb.insuranceNumber} · {rb.receiptCount} phiếu nhập
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {filteredOtherBeneficiaries.length > 0 && (
                  <div className="p-1.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 rounded-md mb-1">
                      Đối tượng khác trong hồ sơ quản lý ({filteredOtherBeneficiaries.length})
                    </div>
                    {filteredOtherBeneficiaries.map((b) => {
                      const isSelected = currentBeneficiary?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBeneficiary(b.id, b.fullName)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 ${
                            isSelected ? 'bg-teal-50 text-teal-950' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{b.fullName}</div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              <span className="font-mono">{b.code}</span> · {b.insuranceNumber || 'Chưa có BHYT'} · {b.roomArea}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {benSearchInput.trim() && !hasExactBenMatch && (
                  <div className="p-1.5 bg-slate-50/70">
                    <button
                      type="button"
                      onClick={() => {
                        const typed = benSearchInput.trim();
                        handleSelectBeneficiary(`name:${typed}`, typed);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs bg-white border border-teal-200 hover:bg-teal-50 text-teal-900 flex items-center gap-2 transition-colors"
                    >
                      <Users className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="truncate">
                        Xuất báo cáo theo tên đã nhập: <strong>"{benSearchInput.trim()}"</strong>
                      </span>
                    </button>
                  </div>
                )}

                {filteredReceiptBeneficiaries.length === 0 &&
                  filteredOtherBeneficiaries.length === 0 &&
                  !benSearchInput.trim() && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Chưa có đối tượng nào trong hệ thống.
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div className="md:col-span-3 lg:col-span-2">
            <label className="block text-2xs font-semibold text-slate-600 mb-1">Từ ngày:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-white focus:border-teal-500 focus:outline-hidden"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-3 lg:col-span-2">
            <label className="block text-2xs font-semibold text-slate-600 mb-1">Đến ngày:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-white focus:border-teal-500 focus:outline-hidden"
            />
          </div>

          {/* Matched PNK Summary */}
          <div className="md:col-span-12 lg:col-span-3">
            {currentBeneficiary?.isFromReceipt ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-2xs truncate">
                <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">
                  <strong>{currentBeneficiary.receiptCount} phiếu nhập</strong> ({currentBeneficiary.receiptCodes.join(', ')})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-2xs truncate">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Đối tượng: {customBenCode || 'Hồ sơ'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {canEditReport ? (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isEditMode
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'border border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Đang Hiệu Chỉnh' : 'Hiệu Chỉnh Biểu Mẫu'}</span>
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed whitespace-nowrap"
                title={`Vai trò ${currentUser.role} không có quyền hiệu chỉnh số liệu báo cáo`}
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Khóa Hiệu Chỉnh</span>
              </span>
            )}

            {isCustomized && (
              <button
                onClick={handleResetToCalculated}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs text-slate-600 whitespace-nowrap"
                title="Khôi phục số liệu tự động tính từ sổ kho"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục gốc</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportFullGoogleSheetData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
              title="Xuất tệp Google Sheet / Excel tối ưu 04 Sheet: Phiếu nhập, Phiếu xuất, Báo cáo, Tài khoản"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất 04 Sheet (.xlsx)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap"
              title="Xuất báo cáo cá nhân định dạng CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleSaveToDrive}
                disabled={driveSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-teal-600 text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {driveSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                ) : driveSavedInfo ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
                <span>{driveSaving ? 'Đang lưu Drive...' : 'Lưu Drive'}</span>
              </button>
            )}

            <button
              onClick={handleOpenPrint}
              disabled={!canExportReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>In Báo Cáo Chuẩn A4</span>
            </button>
          </div>
        </div>
      </div>

      {driveSavedInfo && isAdmin && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{driveSavedInfo.message}</span>
          </div>
          {driveSavedInfo.link && (
            <a
              href={driveSavedInfo.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline shrink-0"
            >
              <span>Mở tệp trên Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Auto-Extraction Status Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-xl p-3 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Hệ thống tự động trích xuất dữ liệu từ Phiếu Nhập &amp; Phiếu Xuất kho</span>
              <span className="text-teal-800 font-mono text-2xs tabular-nums">
                ({rows.length} mặt hàng thuốc)
              </span>
            </div>
            <div className="text-2xs text-slate-600 mt-0.5">
              Đối tượng: <strong className="text-teal-900">{customBenName || 'Chưa chọn'}</strong>
              {benActivityDates.length > 0 ? (
                <> · Ghi nhận từ ngày <strong className="text-slate-800">{formatDate(benActivityDates[0])}</strong> đến <strong className="text-slate-800">{formatDate(benActivityDates[benActivityDates.length - 1])}</strong></>
              ) : (
                <> · Sẵn sàng tự động tổng hợp khi có phát sinh phiếu nhập/xuất</>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {benActivityDates.length > 0 && (
            <button
              onClick={() => {
                setStartDate(benActivityDates[0]);
                setEndDate(benActivityDates[benActivityDates.length - 1]);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white hover:bg-teal-50 text-teal-800 text-2xs font-semibold shadow-2xs transition-colors flex items-center gap-1 whitespace-nowrap"
              title="Tự động căn chỉnh từ ngày đến ngày bao trọn toàn bộ phiếu nhập và xuất của đối tượng"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Bao trọn ({formatDate(benActivityDates[0])} - {formatDate(benActivityDates[benActivityDates.length - 1])})</span>
            </button>
          )}
          <button
            onClick={handleResetToCalculated}
            className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-2xs font-semibold shadow-2xs transition-colors flex items-center gap-1 whitespace-nowrap"
            title="Tự động đồng bộ và nạp lại toàn bộ số lượng, đơn giá trực tiếp từ các phiếu nhập kho"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Trích xuất lại</span>
          </button>
        </div>
      </div>

      {/* Edit Mode Notice Ribbon */}
      {isEditMode && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Chế độ hiệu chỉnh biểu mẫu đang bật:</strong> Bạn có thể sửa trực tiếp thông tin cơ quan, tên
              đối tượng, số thẻ BHYT, từng dòng số lượng, đơn giá, bổ sung dòng thuốc mới hoặc đổi chữ ký theo nhu cầu
              thực tế.
            </span>
          </div>
          <button
            onClick={handleAddCustomRow}
            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-2xs font-semibold shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Dòng Thuốc Mới</span>
          </button>
        </div>
      )}

      {/* Official Report Container */}
      <div id="beneficiary-report-canvas" className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-2xs">
        {/* Administrative Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 pb-4 border-b border-slate-100">
          <div className="w-full sm:w-auto">
            {isEditMode ? (
              <div className="space-y-1 w-full sm:w-80">
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
          <div className="w-full sm:w-auto text-left sm:text-right">
            {isEditMode ? (
              <div className="space-y-1 w-full sm:w-72">
                <input
                  type="text"
                  value={nationalMottoTop}
                  onChange={(e) => setNationalMottoTop(e.target.value)}
                  className="w-full text-left sm:text-right text-xs font-bold uppercase p-1 border border-amber-300 rounded bg-amber-50/50"
                />
                <input
                  type="text"
                  value={nationalMottoSub}
                  onChange={(e) => setNationalMottoSub(e.target.value)}
                  className="w-full text-left sm:text-right text-xs italic font-medium p-1 border border-amber-300 rounded bg-amber-50/50"
                />
              </div>
            ) : (
              <>
                <div className="font-bold text-xs uppercase text-slate-900">{nationalMottoTop}</div>
                <div className="text-xs italic text-slate-600 font-medium">{nationalMottoSub}</div>
              </>
            )}
          </div>
        </div>

        {/* Title & Beneficiary Info */}
        <div className="text-center my-4">
          {isEditMode ? (
            <div className="space-y-1.5 max-w-2xl mx-auto">
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full text-center text-sm font-bold uppercase p-1.5 border border-amber-300 rounded bg-amber-50/50"
              />
              <input
                type="text"
                value={reportSubtitle}
                onChange={(e) => setReportSubtitle(e.target.value)}
                className="w-full text-center text-xs p-1 border border-amber-300 rounded bg-amber-50/50"
                placeholder="Mô tả phụ dưới tiêu đề..."
              />
            </div>
          ) : (
            <>
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-900">{reportTitle}</h2>
              {reportSubtitle && <div className="text-xs text-slate-600 mt-0.5">{reportSubtitle}</div>}
            </>
          )}

          <div className="text-xs italic text-slate-500 mt-1">
            Kỳ báo cáo: Từ ngày <span className="font-semibold text-slate-700">{formatDate(startDate)}</span> đến ngày{' '}
            <span className="font-semibold text-slate-700">{formatDate(endDate)}</span>
          </div>

          <div className="text-xs font-medium text-slate-800 mt-2 bg-slate-50 py-2 px-3 rounded-lg inline-block max-w-full border border-slate-200">
            {isEditMode ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span>Họ tên ĐT:</span>
                <input
                  type="text"
                  value={customBenName}
                  onChange={(e) => setCustomBenName(e.target.value)}
                  className="font-bold uppercase p-1 border border-amber-300 rounded bg-white text-xs w-44 max-w-full"
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
                  className="font-mono font-bold p-1 border border-amber-300 rounded bg-white text-xs text-teal-800 w-36 max-w-full"
                />
                <span>Khu:</span>
                <input
                  type="text"
                  value={customRoomArea}
                  onChange={(e) => setCustomRoomArea(e.target.value)}
                  className="p-1 border border-amber-300 rounded bg-white text-xs w-36 max-w-full"
                />
              </div>
            ) : (
              <div className="leading-relaxed">
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
                <th rowSpan={2} className="border border-slate-300 p-2 w-8">{templateSettings.reportColStt}</th>
                <th rowSpan={2} className="border border-slate-300 p-2 min-w-48">{templateSettings.reportColName}</th>
                <th rowSpan={2} className="border border-slate-300 p-2 w-12 text-center">{templateSettings.reportColUnit}</th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-amber-50/70 text-amber-900">
                  {templateSettings.reportGroupOpening}
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-blue-50/70 text-blue-900">
                  {templateSettings.reportGroupIn}
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-indigo-50/70 text-indigo-900">
                  {templateSettings.reportGroupTotalIn}
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-rose-50/70 text-rose-900">
                  {templateSettings.reportGroupOut}
                </th>
                <th colSpan={3} className="border border-slate-300 p-1.5 bg-emerald-50/70 text-emerald-900">
                  {templateSettings.reportGroupClosing}
                </th>
                {isEditMode && <th rowSpan={2} className="border border-slate-300 p-1 w-10 text-center">Xóa</th>}
              </tr>
              <tr className="bg-slate-50 font-semibold text-center text-3xs text-slate-600">
                <th className="border border-slate-300 p-1 w-10">{templateSettings.reportSubColQty}</th>
                <th className="border border-slate-300 p-1 w-14">{templateSettings.reportSubColPrice}</th>
                <th className="border border-slate-300 p-1 w-16">{templateSettings.reportSubColAmount}</th>
                <th className="border border-slate-300 p-1 w-10">{templateSettings.reportSubColQty}</th>
                <th className="border border-slate-300 p-1 w-14">{templateSettings.reportSubColPrice}</th>
                <th className="border border-slate-300 p-1 w-16">{templateSettings.reportSubColAmount}</th>
                <th className="border border-slate-300 p-1 w-10 font-bold text-indigo-900">{templateSettings.reportSubColQty}</th>
                <th className="border border-slate-300 p-1 w-14">{templateSettings.reportSubColPrice}</th>
                <th className="border border-slate-300 p-1 w-16 font-bold text-indigo-900">{templateSettings.reportSubColAmount}</th>
                <th className="border border-slate-300 p-1 w-10">{templateSettings.reportSubColQty}</th>
                <th className="border border-slate-300 p-1 w-14">{templateSettings.reportSubColPrice}</th>
                <th className="border border-slate-300 p-1 w-16">{templateSettings.reportSubColAmount}</th>
                <th className="border border-slate-300 p-1 w-10 font-bold text-teal-900">{templateSettings.reportSubColQty}</th>
                <th className="border border-slate-300 p-1 w-14">{templateSettings.reportSubColPrice}</th>
                <th className="border border-slate-300 p-1 w-16 font-bold text-teal-900">{templateSettings.reportSubColAmount}</th>
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
                    {templateSettings.reportGrandTotalLabel}
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
        <div className="mt-4">
          {isEditMode ? (
            <input
              type="text"
              value={reportFooterNote}
              onChange={(e) => setReportFooterNote(e.target.value)}
              className="w-full text-2xs italic p-1.5 border border-amber-300 rounded bg-amber-50/50 text-slate-700"
              placeholder="Ghi chú cuối báo cáo..."
            />
          ) : (
            reportFooterNote && <div className="text-2xs italic text-slate-600">{reportFooterNote}</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs mt-6 pt-4 border-t border-slate-100">
          <div>
            <div className="font-bold uppercase text-slate-800">{templateSettings.preparerTitle}</div>
            <div className="text-2xs italic text-slate-500">{templateSettings.preparerSignNote}</div>
            <div className="h-14 flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={preparerName}
                  onChange={(e) => setPreparerName(e.target.value)}
                  className="w-full max-w-[220px] font-semibold text-center p-1 border border-amber-300 rounded bg-white text-xs"
                />
              ) : null}
            </div>
            {!isEditMode && <div className="font-semibold text-slate-900">{preparerName}</div>}
          </div>

          <div>
            <div className="font-bold uppercase text-slate-800">{templateSettings.deptLeaderTitle}</div>
            <div className="text-2xs italic text-slate-500">{templateSettings.deptLeaderSignNote}</div>
            <div className="h-14 flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={deptLeaderName}
                  onChange={(e) => setDeptLeaderName(e.target.value)}
                  className="w-full max-w-[220px] font-semibold text-center p-1 border border-amber-300 rounded bg-white text-xs"
                />
              ) : null}
            </div>
            {!isEditMode && <div className="font-semibold text-slate-900">{deptLeaderName}</div>}
          </div>

          <div>
            <div className="font-bold uppercase text-slate-800">{templateSettings.centerDirectorTitle}</div>
            <div className="text-2xs italic text-slate-500">{templateSettings.centerDirectorSignNote}</div>
            <div className="h-14 flex items-center justify-center">
              {isEditMode ? (
                <input
                  type="text"
                  value={centerDirectorName}
                  onChange={(e) => setCenterDirectorName(e.target.value)}
                  className="w-full max-w-[220px] font-semibold text-center p-1 border border-amber-300 rounded bg-white text-xs"
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
