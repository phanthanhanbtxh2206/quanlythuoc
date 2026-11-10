/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StockIssue, StockIssueItem, LotStock, StockReceipt } from '../../types';
import { Plus, Search, Edit2, Printer, Trash2, AlertTriangle, CheckCircle2, RefreshCw, FileText, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PrintModal, PrintDocumentType } from '../print/PrintModal';
import { formatCurrency, formatNumber, formatDate, getTodayISODate } from '../../utils/formatters';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';

export const StockIssueListView: React.FC = () => {
  const {
    issues,
    receipts,
    medicines,
    beneficiaries,
    createStockIssue,
    updateStockIssue,
    deleteStockIssue,
    getAvailableLots,
    hasPermission,
    currentUser,
  } = useApp();

  const canCreateIssue = hasPermission('canCreateIssue');
  const canEditIssue = hasPermission('canEditIssue');
  const canDeleteIssue = hasPermission('canDeleteIssue');

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<StockIssue | null>(null);
  const [printDocument, setPrintDocument] = useState<PrintDocumentType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [issueDate, setIssueDate] = useState(getTodayISODate());
  const [issueCode, setIssueCode] = useState('');
  const [receiverName, setReceiverName] = useState('Y tá Hoàng Thị Lan');
  const [receiverDept, setReceiverDept] = useState('Phòng Y Tế - Phân ban chăm sóc NCT');
  const [reason, setReason] = useState('Xuất cấp phát thuốc điều trị định kỳ cho đối tượng');
  const [beneficiaryId, setBeneficiaryId] = useState<string>(beneficiaries[0]?.id || '');
  const [beneficiaryCustomName, setBeneficiaryCustomName] = useState<string>(beneficiaries[0]?.fullName || '');
  const [usageLocation, setUsageLocation] = useState('Khu Người Cao Tuổi');
  const [selectedReceiptFilter, setSelectedReceiptFilter] = useState<string>('ALL');
  const [extractedReceiptCount, setExtractedReceiptCount] = useState<number>(0);

  // Dynamic Item Row (Bỏ hạn dùng theo yêu cầu)
  interface IssueRow {
    medicineId: string;
    batchNumber: string;
    expiryDate?: string;
    requestedQuantity: number;
    actualQuantity: number;
    unitPrice: number;
    maxAvailable: number;
    receiptRef?: string;
  }

  const [items, setItems] = useState<IssueRow[]>([]);

  const availableLots = getAvailableLots();

  // Helper: Tìm các phiếu nhập kho khớp với tên đối tượng
  const getMatchingReceipts = (name: string, benId?: string): StockReceipt[] => {
    if (!name || !name.trim()) return [];
    const cleanName = name.trim().toLowerCase();
    return receipts.filter((r) => {
      if (benId && r.beneficiaryId === benId) return true;
      if (r.beneficiaryName && r.beneficiaryName.trim().toLowerCase() === cleanName) return true;
      if (r.beneficiaryId) {
        const b = beneficiaries.find((item) => item.id === r.beneficiaryId);
        if (b && b.fullName.trim().toLowerCase() === cleanName) return true;
      }
      return false;
    });
  };

  // Helper: Trích xuất danh mục thuốc, số lô, đơn giá từ các phiếu nhập khớp
  const extractItemsFromReceipts = (targetReceipts: StockReceipt[]): IssueRow[] => {
    const extractedRows: IssueRow[] = [];
    targetReceipts.forEach((r) => {
      (r.items || []).forEach((it) => {
        const lot = availableLots.find(
          (l) => l.medicineId === it.medicineId && l.batchNumber === it.batchNumber
        );
        const maxAvail = lot ? lot.quantity : it.actualQuantity;
        extractedRows.push({
          medicineId: it.medicineId,
          batchNumber: it.batchNumber,
          requestedQuantity: it.actualQuantity,
          actualQuantity: it.actualQuantity,
          unitPrice: it.unitPrice,
          maxAvailable: maxAvail,
          receiptRef: r.receiptCode,
        });
      });
    });
    return extractedRows;
  };

  // Danh sách gợi ý đối tượng (kết hợp cả hồ sơ và đối tượng đã có trên phiếu nhập)
  const beneficiaryOptions = useMemo(() => {
    const map = new Map<string, { name: string; subtitle: string; hasReceipt: boolean }>();

    beneficiaries.forEach((b) => {
      const hasR = receipts.some(
        (r) => r.beneficiaryId === b.id || r.beneficiaryName?.toLowerCase() === b.fullName.toLowerCase()
      );
      map.set(b.fullName.toLowerCase(), {
        name: b.fullName,
        subtitle: `${b.code} · ${b.insuranceNumber || 'BHYT'} · ${b.roomArea}${hasR ? ' (✓ ĐÃ CÓ PHIẾU NHẬP)' : ''}`,
        hasReceipt: hasR,
      });
    });

    receipts.forEach((r) => {
      if (r.beneficiaryName && !map.has(r.beneficiaryName.toLowerCase())) {
        map.set(r.beneficiaryName.toLowerCase(), {
          name: r.beneficiaryName,
          subtitle: `Đối tượng ngoài danh mục (✓ ĐÃ CÓ PHIẾU NHẬP ${r.receiptCode})`,
          hasReceipt: true,
        });
      }
    });

    return Array.from(map.values());
  }, [beneficiaries, receipts]);

  const handleOpenCreateModal = () => {
    const today = getTodayISODate();
    setEditingIssue(null);
    setIssueDate(today);
    setIssueCode(`PXK-${today.replace(/-/g, '')}-00${issues.length + 1}`);
    setReceiverName('Y tá Hoàng Thị Lan');
    setReceiverDept('Phòng Y Tế - Phân ban chăm sóc NCT');
    setErrorMessage(null);

    // Ưu tiên chọn đối tượng đầu tiên đã có phiếu nhập
    const benWithReceipt = beneficiaryOptions.find((b) => b.hasReceipt) || beneficiaryOptions[0];
    const initialName = benWithReceipt ? benWithReceipt.name : (beneficiaries[0]?.fullName || '');
    const matchMaster = beneficiaries.find((b) => b.fullName.toLowerCase() === initialName.toLowerCase());
    const initialId = matchMaster ? matchMaster.id : '';

    setBeneficiaryId(initialId);
    setBeneficiaryCustomName(initialName);
    setUsageLocation(matchMaster?.roomArea || 'Phòng Y Tế - Khu Chăm Sóc');

    // Tự động trích xuất ngay lập tức từ phiếu nhập kho của đối tượng
    const matching = getMatchingReceipts(initialName, initialId);
    if (matching.length > 0) {
      const extracted = extractItemsFromReceipts(matching);
      setItems(extracted);
      setReason(`Xuất cấp phát thuốc theo phiếu nhập ${matching.map((r) => r.receiptCode).join(', ')} cho đối tượng ${initialName}`);
      setSelectedReceiptFilter('ALL');
      setExtractedReceiptCount(matching.length);
    } else if (availableLots.length > 0) {
      const firstLot = availableLots[0];
      setItems([
        {
          medicineId: firstLot.medicineId,
          batchNumber: firstLot.batchNumber,
          requestedQuantity: Math.min(10, firstLot.quantity),
          actualQuantity: Math.min(10, firstLot.quantity),
          unitPrice: firstLot.unitPrice,
          maxAvailable: firstLot.quantity,
        },
      ]);
      setReason('Xuất cấp phát thuốc điều trị cho đối tượng');
      setExtractedReceiptCount(0);
    } else {
      setItems([]);
      setReason('Xuất cấp phát thuốc điều trị cho đối tượng');
      setExtractedReceiptCount(0);
    }

    setIsModalOpen(true);
  };

  const handleBeneficiaryChange = (nameVal: string) => {
    setBeneficiaryCustomName(nameVal);
    const match = beneficiaries.find(
      (b) => b.fullName.toLowerCase() === nameVal.toLowerCase() || b.code.toLowerCase() === nameVal.toLowerCase()
    );
    const benIdVal = match ? match.id : '';
    setBeneficiaryId(benIdVal);
    if (match) {
      setUsageLocation(match.roomArea);
    }

    // Tự động trích xuất thông tin phiếu xuất từ phiếu nhập theo họ tên đối tượng
    const matching = getMatchingReceipts(nameVal, benIdVal);
    if (matching.length > 0) {
      const extracted = extractItemsFromReceipts(matching);
      if (extracted.length > 0) {
        setItems(extracted);
        setReason(`Xuất cấp phát thuốc theo phiếu nhập ${matching.map((r) => r.receiptCode).join(', ')} cho đối tượng ${nameVal}`);
        setSelectedReceiptFilter('ALL');
        setExtractedReceiptCount(matching.length);
        setErrorMessage(null);
      }
    } else {
      setExtractedReceiptCount(0);
    }
  };

  const handleReceiptFilterChange = (receiptIdFilter: string) => {
    setSelectedReceiptFilter(receiptIdFilter);
    const matching = getMatchingReceipts(beneficiaryCustomName, beneficiaryId);
    const targets = receiptIdFilter === 'ALL' ? matching : matching.filter((r) => r.id === receiptIdFilter);
    if (targets.length > 0) {
      const extracted = extractItemsFromReceipts(targets);
      setItems(extracted);
      setReason(`Xuất cấp phát thuốc theo phiếu nhập ${targets.map((r) => r.receiptCode).join(', ')} cho đối tượng ${beneficiaryCustomName}`);
      setExtractedReceiptCount(targets.length);
    }
  };

  const handleOpenEditModal = (issue: StockIssue) => {
    setEditingIssue(issue);
    setIssueDate(issue.issueDate);
    setIssueCode(issue.issueCode);
    setReceiverName(issue.receiverName);
    setReceiverDept(issue.receiverDept);
    setReason(issue.reason);
    setBeneficiaryId(issue.beneficiaryId);
    const benName = issue.beneficiaryName || beneficiaries.find((b) => b.id === issue.beneficiaryId)?.fullName || '';
    setBeneficiaryCustomName(benName);
    setUsageLocation(issue.usageLocation);
    setErrorMessage(null);

    const matching = getMatchingReceipts(benName, issue.beneficiaryId);
    setExtractedReceiptCount(matching.length);
    setSelectedReceiptFilter('ALL');

    if (issue.items && issue.items.length > 0) {
      setItems(
        issue.items.map((it) => {
          const lot = availableLots.find(
            (l) => l.medicineId === it.medicineId && l.batchNumber === it.batchNumber
          );
          // Available stock plus what is already in this issue
          const maxAvail = (lot ? lot.quantity : 0) + it.actualQuantity;
          return {
            medicineId: it.medicineId,
            batchNumber: it.batchNumber,
            requestedQuantity: it.requestedQuantity,
            actualQuantity: it.actualQuantity,
            unitPrice: it.unitPrice,
            maxAvailable: maxAvail,
          };
        })
      );
    } else {
      setItems([]);
    }

    setIsModalOpen(true);
  };

  const handleDelete = (issue: StockIssue) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu xuất kho "${issue.issueCode}"? Số lượng thuốc sẽ được hoàn trả lại tồn kho.`)) {
      deleteStockIssue(issue.id);
    }
  };

  const handleAddItemRow = () => {
    if (availableLots.length === 0) return;
    const lot = availableLots[0];
    setItems([
      ...items,
      {
        medicineId: lot.medicineId,
        batchNumber: lot.batchNumber,
        requestedQuantity: Math.min(5, lot.quantity),
        actualQuantity: Math.min(5, lot.quantity),
        unitPrice: lot.unitPrice,
        maxAvailable: lot.quantity,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleLotSelect = (index: number, lotKey: string) => {
    const [medId, batch] = lotKey.split('___');
    const lot = availableLots.find((l) => l.medicineId === medId && l.batchNumber === batch);
    if (!lot) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      medicineId: lot.medicineId,
      batchNumber: lot.batchNumber,
      unitPrice: lot.unitPrice,
      maxAvailable: lot.quantity,
      actualQuantity: Math.min(updated[index].actualQuantity || 1, lot.quantity),
      requestedQuantity: Math.min(updated[index].requestedQuantity || 1, lot.quantity),
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, field: 'requestedQuantity' | 'actualQuantity', val: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.actualQuantity * item.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Kho hiện không có thuốc tồn khả dụng để xuất!');
      return;
    }

    // Check stock limit for every item
    for (const item of items) {
      if (item.actualQuantity > item.maxAvailable) {
        const med = medicines.find((m) => m.id === item.medicineId);
        setErrorMessage(
          `Thuốc ${med?.name} (Lô ${item.batchNumber}) chỉ còn tồn ${item.maxAvailable}, không thể xuất ${item.actualQuantity}!`
        );
        return;
      }
    }

    const payload = {
      issueCode,
      issueDate,
      receiverName,
      receiverDept,
      reason,
      beneficiaryId,
      beneficiaryName: beneficiaryCustomName || undefined,
      usageLocation,
    };

    let result;
    if (editingIssue) {
      result = updateStockIssue(editingIssue.id, payload, items);
    } else {
      result = createStockIssue(payload, items);
    }

    if (!result.success) {
      setErrorMessage(result.error || 'Có lỗi khi ghi nhận xuất kho');
      return;
    }

    setIsModalOpen(false);
    if (result.issue) {
      setPrintDocument({ type: 'ISSUE', data: result.issue });
    }
  };

  const filteredIssues = issues.filter(
    (i) =>
      i.issueCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Quản Lý Phiếu Xuất Kho (Mẫu C21-HD)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đơn vị: TRUNG TÂM BẢO TRỢ XÃ HỘI · PHÒNG Y TẾ - PHCN · Mã QHNS: 1041008
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo số phiếu, người nhận, lý do..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <button
            onClick={handleOpenCreateModal}
            disabled={!canCreateIssue}
            title={canCreateIssue ? 'Lập phiếu xuất kho mới' : `Vai trò ${currentUser.role} không có quyền lập phiếu xuất kho`}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 ${
              canCreateIssue
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Lập Phiếu Xuất Mới</span>
          </button>
        </div>
      </div>

      {!canCreateIssue && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center justify-between">
          <span>
            Chế độ <strong>Chỉ Xem & In Ấn</strong> (Vai trò: {currentUser.fullName} - {currentUser.role}). Bạn chỉ có thể tra cứu và in phiếu.
          </span>
          <span className="text-[11px] text-teal-700 font-semibold">Chỉ Dược sĩ, Bác sĩ & Admin có quyền lập phiếu xuất</span>
        </div>
      )}

      {/* Issues Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-2xs">
            <tr>
              <th className="py-3 px-4">Số chứng từ</th>
              <th className="py-3 px-4">Ngày xuất</th>
              <th className="py-3 px-4">Người nhận hàng / Bộ phận</th>
              <th className="py-3 px-4">Đối tượng nhận thuốc</th>
              <th className="py-3 px-4">Lý do xuất kho</th>
              <th className="py-3 px-4 text-right">Tổng tiền (₫)</th>
              <th className="py-3 px-4 text-center">Thao tác / Hiệu chỉnh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIssues.map((issue) => {
              const ben = beneficiaries.find((b) => b.id === issue.beneficiaryId);
              return (
                <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{issue.issueCode}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(issue.issueDate)}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{issue.receiverName}</div>
                    <div className="text-2xs text-slate-400">{issue.receiverDept}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{issue.beneficiaryName || ben?.fullName || 'Đối tượng nhận thuốc'}</div>
                    <div className="text-2xs text-slate-400 font-mono">
                      {ben?.code || 'DT-Tự do'} {ben?.insuranceNumber ? `· BHYT: ${ben?.insuranceNumber}` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{issue.reason}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(issue.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {canEditIssue ? (
                        <button
                          onClick={() => handleOpenEditModal(issue)}
                          className="flex items-center gap-1 px-2.5 py-1 text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-md text-2xs font-semibold transition-colors"
                          title="Hiệu chỉnh nội dung phiếu xuất"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Hiệu chỉnh</span>
                        </button>
                      ) : (
                        <span
                          className="flex items-center gap-1 px-2 py-1 text-slate-400 border border-slate-200 rounded-md text-2xs cursor-not-allowed"
                          title="Không có quyền chỉnh sửa phiếu xuất"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Khóa sửa</span>
                        </span>
                      )}

                      <button
                        onClick={() => setPrintDocument({ type: 'ISSUE', data: issue })}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        title="Xem và In phiếu xuất A4"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {canDeleteIssue && (
                        <button
                          onClick={() => handleDelete(issue)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Xóa phiếu xuất kho"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Lập / Hiệu Chỉnh Phiếu Xuất Kho */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIssue ? `Hiệu Chỉnh Phiếu Xuất Kho (${editingIssue.issueCode})` : 'Lập Phiếu Xuất Kho Mới (Mẫu C21-HD)'}
        subtitle="Người dùng có thể sửa đổi người nhận, đối tượng, lý do xuất và từng dòng số lô xuất kho"
        maxWidth="5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Master Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số phiếu xuất (PXK) *</label>
              <input
                type="text"
                required
                value={issueCode}
                onChange={(e) => setIssueCode(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày xuất kho *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Đối tượng nhận thuốc (Tự điền hoặc chọn) *
              </label>
              <input
                type="text"
                required
                list="issue-ben-options"
                placeholder="Nhập tên đối tượng hoặc chọn từ danh sách..."
                value={beneficiaryCustomName}
                onChange={(e) => handleBeneficiaryChange(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-900 bg-white text-xs"
              />
              <datalist id="issue-ben-options">
                {beneficiaryOptions.map((opt, idx) => (
                  <option key={idx} value={opt.name}>
                    {opt.subtitle}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Địa điểm sử dụng</label>
              <input
                type="text"
                value={usageLocation}
                onChange={(e) => setUsageLocation(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Auto-Extraction Status Banner */}
          {beneficiaryCustomName.trim() && (
            <div
              className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${
                extractedReceiptCount > 0
                  ? 'bg-teal-50/70 border-teal-200 text-teal-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start md:items-center gap-2">
                {extractedReceiptCount > 0 ? (
                  <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 md:mt-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
                )}
                <div>
                  {extractedReceiptCount > 0 ? (
                    <div className="text-xs">
                      <span className="font-bold text-teal-800">
                        Đã tự động trích xuất {items.length} mặt hàng thuốc
                      </span>{' '}
                      từ {extractedReceiptCount} phiếu nhập kho của đối tượng{' '}
                      <span className="font-bold text-teal-950">"{beneficiaryCustomName}"</span>.
                    </div>
                  ) : (
                    <div className="text-xs">
                      Chưa có phiếu nhập kho nào khớp với đối tượng{' '}
                      <span className="font-semibold">"{beneficiaryCustomName}"</span>. Bạn có thể chọn thuốc tồn kho bên dưới.
                    </div>
                  )}
                </div>
              </div>

              {extractedReceiptCount > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  {getMatchingReceipts(beneficiaryCustomName, beneficiaryId).length > 1 && (
                    <select
                      value={selectedReceiptFilter}
                      onChange={(e) => handleReceiptFilterChange(e.target.value)}
                      className="px-2 py-1 text-2xs rounded border border-teal-300 bg-white text-teal-900 font-medium"
                    >
                      <option value="ALL">Tất cả {extractedReceiptCount} phiếu nhập</option>
                      {getMatchingReceipts(beneficiaryCustomName, beneficiaryId).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.receiptCode} ({formatDate(r.receiptDate)})
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => handleBeneficiaryChange(beneficiaryCustomName)}
                    className="flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Trích xuất lại từ PNK</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Họ tên người nhận hàng *</label>
              <input
                type="text"
                required
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Bộ phận / Khu vực người nhận *</label>
              <input
                type="text"
                required
                value={receiverDept}
                onChange={(e) => setReceiverDept(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Lý do xuất kho *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Items Table */}
          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-xs">
                Mặt Hàng Xuất Kho (Quản lý theo Số Lô - Khóa Không Cho Xuất Âm)
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                disabled={availableLots.length === 0}
                className="text-2xs text-teal-700 font-semibold hover:text-teal-800 flex items-center gap-1 disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm dòng thuốc</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold text-2xs uppercase">
                  <tr>
                    <th className="p-2 w-8 text-center">#</th>
                    <th className="p-2 w-72">Chọn thuốc & số lô còn tồn</th>
                    <th className="p-2 w-28 text-right">Tồn khả dụng</th>
                    <th className="p-2 w-20 text-right">SL Yêu cầu</th>
                    <th className="p-2 w-20 text-right">Thực xuất</th>
                    <th className="p-2 w-24 text-right">Đơn giá lô</th>
                    <th className="p-2 w-28 text-right">Thành tiền (₫)</th>
                    <th className="p-2 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const rowTotal = item.actualQuantity * item.unitPrice;
                    const isExceeding = item.actualQuantity > item.maxAvailable;

                    return (
                      <tr key={idx} className={`hover:bg-slate-50/50 ${isExceeding ? 'bg-rose-50/50' : ''}`}>
                        <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2">
                          <select
                            value={`${item.medicineId}___${item.batchNumber}`}
                            onChange={(e) => handleLotSelect(idx, e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded text-xs font-medium bg-white"
                          >
                            {!availableLots.some((l) => l.medicineId === item.medicineId && l.batchNumber === item.batchNumber) && (
                              <option value={`${item.medicineId}___${item.batchNumber}`}>
                                {medicines.find((m) => m.id === item.medicineId)?.name || 'Thuốc'} | Lô: {item.batchNumber} (Trích xuất từ PNK)
                              </option>
                            )}
                            {availableLots.map((l) => {
                              const med = medicines.find((m) => m.id === l.medicineId);
                              return (
                                <option key={`${l.medicineId}___${l.batchNumber}`} value={`${l.medicineId}___${l.batchNumber}`}>
                                  {med?.name} | Lô: {l.batchNumber} (Tồn: {l.quantity} {med?.unit})
                                </option>
                              );
                            })}
                          </select>
                          {item.receiptRef && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 font-mono text-2xs">
                                <Sparkles className="w-2.5 h-2.5 text-teal-600" /> Trích xuất từ: {item.receiptRef}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-700">
                          {formatNumber(item.maxAvailable)}
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="1"
                            value={item.requestedQuantity}
                            onChange={(e) => handleQuantityChange(idx, 'requestedQuantity', Number(e.target.value))}
                            className="w-full p-1.5 border border-slate-200 rounded text-right font-mono text-xs bg-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="1"
                            max={item.maxAvailable}
                            value={item.actualQuantity}
                            onChange={(e) => handleQuantityChange(idx, 'actualQuantity', Number(e.target.value))}
                            className={`w-full p-1.5 border rounded text-right font-mono text-xs font-bold ${
                              isExceeding ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-200 bg-white'
                            }`}
                          />
                        </td>
                        <td className="p-2 text-right font-mono">{formatNumber(item.unitPrice)}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatNumber(rowTotal)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-300 hover:text-rose-500 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total & Words */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-800 uppercase">Cộng tổng tiền xuất kho:</span>
              <span className="text-lg font-bold font-mono text-teal-700">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="text-xs text-slate-600">
              Tổng số tiền bằng chữ:{' '}
              <span className="font-bold italic text-slate-900">{numberToVietnameseWords(totalAmount)}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
            >
              {editingIssue ? 'Lưu Hiệu Chỉnh & In Phiếu' : 'Ghi Nhận & In Phiếu Xuất'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Document Modal */}
      <PrintModal document={printDocument} onClose={() => setPrintDocument(null)} />
    </div>
  );
};
