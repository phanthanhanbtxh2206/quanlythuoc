/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StockReceipt, StockReceiptItem, MedicineSourceType, Medicine } from '../../types';
import { Plus, Search, Edit2, Printer, Trash2, Calendar, FileText, Check, AlertCircle, Sparkles, Pill, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PrintModal, PrintDocumentType } from '../print/PrintModal';
import { formatCurrency, formatNumber, formatDate, getTodayISODate } from '../../utils/formatters';
import { numberToVietnameseWords } from '../../utils/numberToVietnameseWords';

export const StockReceiptListView: React.FC = () => {
  const {
    receipts,
    medicines,
    beneficiaries,
    createStockReceipt,
    updateStockReceipt,
    deleteStockReceipt,
    addMedicine,
    hasPermission,
    currentUser,
  } = useApp();

  const canCreateReceipt = hasPermission('canCreateReceipt');
  const canEditReceipt = hasPermission('canEditReceipt');
  const canDeleteReceipt = hasPermission('canDeleteReceipt');

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<StockReceipt | null>(null);
  const [printDocument, setPrintDocument] = useState<PrintDocumentType | null>(null);

  // Form State
  const [receiptDate, setReceiptDate] = useState(getTodayISODate());
  const [receiptCode, setReceiptCode] = useState('');
  const [delivererName, setDelivererName] = useState('Nguyễn Văn Minh');
  const [delivererDept, setDelivererDept] = useState('Công ty CP Dược Thiết bị Y tế Đà Nẵng (DAPHARCO)');
  const [supplierName, setSupplierName] = useState('Công ty CP Dược Thiết bị Y tế Đà Nẵng');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayISODate());
  const [content, setContent] = useState('Nhập thuốc mua ngoài định kỳ cho đối tượng có BHYT');
  const [sourceType, setSourceType] = useState<MedicineSourceType>('BHYT_MUA_NGOAI');
  const [beneficiaryId, setBeneficiaryId] = useState<string>(beneficiaries[0]?.id || '');
  const [beneficiaryCustomName, setBeneficiaryCustomName] = useState<string>(beneficiaries[0]?.fullName || '');
  const [attachedDocCount, setAttachedDocCount] = useState(1);

  // Dynamic Items Row State: Cho phép chọn thuốc có sẵn HOẶC tự điền thông tin thuốc mới
  interface RowItem {
    medicineId: string;
    isCustom?: boolean;
    customName?: string;
    customActiveIngredient?: string;
    customConcentration?: string;
    customUnit?: string;
    customPackaging?: string;
    batchNumber: string;
    expiryDate?: string;
    docQuantity: number;
    actualQuantity: number;
    unitPrice: number;
  }

  const [items, setItems] = useState<RowItem[]>([]);

  const handleOpenCreateModal = () => {
    const today = getTodayISODate();
    setEditingReceipt(null);
    setReceiptDate(today);
    setReceiptCode(`PNK-${today.replace(/-/g, '')}-00${receipts.length + 1}`);
    setDelivererName('Nguyễn Văn Minh');
    setDelivererDept('Công ty CP Dược Thiết bị Y tế Đà Nẵng (DAPHARCO)');
    setSupplierName('Công ty CP Dược Thiết bị Y tế Đà Nẵng');
    setInvoiceNumber(`HD-00${Math.floor(10000 + Math.random() * 90000)}`);
    setInvoiceDate(today);
    setContent('Nhập thuốc mua ngoài cho đối tượng có BHYT');
    setSourceType('BHYT_MUA_NGOAI');
    setBeneficiaryId(beneficiaries[0]?.id || '');
    setBeneficiaryCustomName(beneficiaries[0]?.fullName || '');
    setItems([
      {
        medicineId: medicines[0]?.id || '',
        isCustom: false,
        batchNumber: `LOT-${today.replace(/-/g, '').slice(2, 6)}-01`,
        docQuantity: 30,
        actualQuantity: 30,
        unitPrice: 1200,
      },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (r: StockReceipt) => {
    setEditingReceipt(r);
    setReceiptDate(r.receiptDate);
    setReceiptCode(r.receiptCode);
    setDelivererName(r.delivererName);
    setDelivererDept(r.delivererDept);
    setSupplierName(r.supplierName);
    setInvoiceNumber(r.invoiceNumber);
    setInvoiceDate(r.invoiceDate);
    setContent(r.content);
    setSourceType(r.sourceType);
    setBeneficiaryId(r.beneficiaryId || '');
    setBeneficiaryCustomName(r.beneficiaryName || beneficiaries.find((b) => b.id === r.beneficiaryId)?.fullName || '');
    setAttachedDocCount(r.attachedDocCount || 1);

    if (r.items && r.items.length > 0) {
      setItems(
        r.items.map((it) => ({
          medicineId: it.medicineId,
          isCustom: false,
          batchNumber: it.batchNumber,
          docQuantity: it.docQuantity,
          actualQuantity: it.actualQuantity,
          unitPrice: it.unitPrice,
        }))
      );
    } else {
      setItems([
        {
          medicineId: medicines[0]?.id || '',
          isCustom: false,
          batchNumber: 'LOT-01',
          docQuantity: 10,
          actualQuantity: 10,
          unitPrice: 1000,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (r: StockReceipt) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu nhập kho "${r.receiptCode}"? Thao tác này sẽ hoàn tác giao dịch tồn kho.`)) {
      deleteStockReceipt(r.id);
    }
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineId: medicines[0]?.id || '',
        isCustom: false,
        batchNumber: `LOT-${new Date().getFullYear()}-0${prev.length + 1}`,
        docQuantity: 10,
        actualQuantity: 10,
        unitPrice: 1000,
      },
    ]);
  };

  const handleAddCustomItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineId: '',
        isCustom: true,
        customName: '',
        customActiveIngredient: '',
        customConcentration: '',
        customUnit: 'Viên',
        customPackaging: 'Hộp',
        batchNumber: `LOT-${new Date().getFullYear()}-0${prev.length + 1}`,
        docQuantity: 10,
        actualQuantity: 10,
        unitPrice: 1000,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleItemChange = (index: number, field: keyof RowItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const switchToCustomMedicine = (index: number, existingMed?: Medicine) => {
    setItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = {
        ...updated[index],
        isCustom: true,
        medicineId: '',
        customName: existingMed?.name || updated[index].customName || '',
        customActiveIngredient: existingMed?.activeIngredient || updated[index].customActiveIngredient || '',
        customConcentration: existingMed?.concentration || updated[index].customConcentration || '',
        customUnit: existingMed?.unit || updated[index].customUnit || 'Viên',
        customPackaging: existingMed?.packaging || updated[index].customPackaging || 'Hộp',
      };
      return updated;
    });
  };

  const switchToCatalogMedicine = (index: number, defaultMedId?: string) => {
    setItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = {
        ...updated[index],
        isCustom: false,
        medicineId: defaultMedId || medicines[0]?.id || '',
      };
      return updated;
    });
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.actualQuantity) || 0) * (Number(item.unitPrice) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Vui lòng thêm ít nhất một mặt hàng thuốc!');
      return;
    }

    // Tự động kiểm tra và đăng ký các thuốc mới do người dùng tự điền
    const processedItems = items.map((item, idx) => {
      let medId = item.medicineId;
      if (item.isCustom && item.customName && item.customName.trim()) {
        const cleanName = item.customName.trim();
        // Kiểm tra xem tên thuốc đã có trong danh mục chưa
        const found = medicines.find(
          (m) => m.name.toLowerCase() === cleanName.toLowerCase()
        );
        if (found) {
          medId = found.id;
        } else {
          // Tạo mã thuốc mới tự động
          const nextNum = medicines.length + 1 + idx;
          const newCode = `TH-${String(nextNum).padStart(3, '0')}`;
          const newMed = addMedicine({
            code: newCode,
            name: cleanName,
            activeIngredient: item.customActiveIngredient?.trim() || cleanName,
            concentration: item.customConcentration?.trim() || '',
            unit: item.customUnit?.trim() || 'Viên',
            packaging: item.customPackaging?.trim() || 'Hộp',
            dosageForm: 'Viên',
            route: 'Uống',
            manufacturer: supplierName || 'Dược phẩm',
            category: 'Thuốc mua ngoài BHYT',
            minStockAlert: 10,
            status: 'Đang sử dụng',
          });
          medId = newMed.id;
        }
      } else if (!medId && medicines.length > 0) {
        medId = medicines[0].id;
      }

      return {
        medicineId: medId,
        batchNumber: item.batchNumber || `LOT-01`,
        docQuantity: Number(item.docQuantity) || 1,
        actualQuantity: Number(item.actualQuantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      };
    });

    const payload = {
      receiptCode,
      receiptDate,
      delivererName,
      delivererDept,
      supplierName,
      invoiceNumber,
      invoiceDate,
      content,
      sourceType,
      beneficiaryId: sourceType === 'BHYT_MUA_NGOAI' ? (beneficiaryId || undefined) : undefined,
      beneficiaryName: sourceType === 'BHYT_MUA_NGOAI' ? (beneficiaryCustomName || undefined) : undefined,
      attachedDocCount,
    };

    let resultReceipt: StockReceipt;
    if (editingReceipt) {
      resultReceipt = updateStockReceipt(editingReceipt.id, payload, processedItems);
    } else {
      resultReceipt = createStockReceipt(payload, processedItems);
    }

    setIsModalOpen(false);
    setPrintDocument({ type: 'RECEIPT', data: resultReceipt });
  };

  const filteredReceipts = receipts.filter(
    (r) =>
      r.receiptCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Quản Lý Phiếu Nhập Kho (Mẫu C20-HD)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đơn vị: TRUNG TÂM BẢO TRỢ XÃ HỘI · PHÒNG Y TẾ - PHCN · Mã QHNS: 1041008
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo số phiếu, hóa đơn, NCC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <button
            onClick={handleOpenCreateModal}
            disabled={!canCreateReceipt}
            title={canCreateReceipt ? 'Lập phiếu nhập kho mới' : `Vai trò ${currentUser.role} không có quyền lập phiếu nhập kho`}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 ${
              canCreateReceipt
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Lập Phiếu Nhập Mới</span>
          </button>
        </div>
      </div>

      {!canCreateReceipt && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center justify-between">
          <span>
            Chế độ <strong>Chỉ Xem & In Ấn</strong> (Vai trò: {currentUser.fullName} - {currentUser.role}). Bạn chỉ có thể tra cứu và in phiếu.
          </span>
          <span className="text-[11px] text-teal-700 font-semibold">Chỉ Dược sĩ & Admin có quyền lập/sửa/xóa phiếu nhập</span>
        </div>
      )}

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-2xs">
            <tr>
              <th className="py-3 px-4">Số chứng từ</th>
              <th className="py-3 px-4">Ngày nhập</th>
              <th className="py-3 px-4">Đơn vị cung cấp / Hóa đơn</th>
              <th className="py-3 px-4">Nội dung nhập kho</th>
              <th className="py-3 px-4">Đối tượng hưởng (nếu có)</th>
              <th className="py-3 px-4 text-right">Tổng tiền (₫)</th>
              <th className="py-3 px-4 text-center">Thao tác / Hiệu chỉnh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReceipts.map((r) => {
              const ben = beneficiaries.find((b) => b.id === r.beneficiaryId);
              return (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.receiptCode}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(r.receiptDate)}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{r.supplierName}</div>
                    <div className="text-2xs text-slate-400 font-mono">
                      HĐ: {r.invoiceNumber} ({formatDate(r.invoiceDate)})
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{r.content}</td>
                  <td className="py-3 px-4">
                    {r.beneficiaryName ? (
                      <span className="font-semibold text-teal-800">{r.beneficiaryName}</span>
                    ) : ben ? (
                      <span className="font-semibold text-teal-800">{ben.fullName}</span>
                    ) : (
                      <span className="text-slate-400">Nhập kho chung</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(r.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {canEditReceipt ? (
                        <button
                          onClick={() => handleOpenEditModal(r)}
                          className="flex items-center gap-1 px-2.5 py-1 text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-md text-2xs font-semibold transition-colors"
                          title="Hiệu chỉnh nội dung phiếu nhập"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Hiệu chỉnh</span>
                        </button>
                      ) : (
                        <span
                          className="flex items-center gap-1 px-2 py-1 text-slate-400 border border-slate-200 rounded-md text-2xs cursor-not-allowed"
                          title="Không có quyền chỉnh sửa phiếu nhập"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Khóa sửa</span>
                        </span>
                      )}

                      <button
                        onClick={() => setPrintDocument({ type: 'RECEIPT', data: r })}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        title="Xem và In phiếu nhập A4"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {canDeleteReceipt && (
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Xóa phiếu nhập kho"
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

      {/* Modal Lập / Hiệu Chỉnh Phiếu Nhập Kho */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReceipt ? `Hiệu Chỉnh Phiếu Nhập Kho (${editingReceipt.receiptCode})` : 'Lập Phiếu Nhập Kho Mới (Mẫu C20-HD)'}
        subtitle="Người dùng có thể sửa đổi đầy đủ thông tin chứng từ, hóa đơn, đối tượng và từng dòng mặt hàng thuốc"
        maxWidth="5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số chứng từ (PNK) *</label>
              <input
                type="text"
                required
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày lập phiếu *</label>
              <input
                type="date"
                required
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nguồn kinh phí *</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as MedicineSourceType)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="BHYT_MUA_NGOAI">Thuốc mua ngoài cho đối tượng có BHYT</option>
                <option value="NGAN_SACH">Nguồn Ngân sách Trung tâm cấp</option>
                <option value="VIEN_TRO">Nguồn tài trợ, từ thiện y tế</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Đối tượng hưởng (Tự điền hoặc chọn)
              </label>
              <input
                type="text"
                list="receipt-ben-options"
                disabled={sourceType !== 'BHYT_MUA_NGOAI'}
                placeholder="Nhập tên đối tượng hoặc chọn từ danh sách..."
                value={beneficiaryCustomName}
                onChange={(e) => {
                  const val = e.target.value;
                  setBeneficiaryCustomName(val);
                  const match = beneficiaries.find(
                    (b) => b.fullName.toLowerCase() === val.toLowerCase() || b.code.toLowerCase() === val.toLowerCase()
                  );
                  if (match) setBeneficiaryId(match.id);
                  else setBeneficiaryId('');
                }}
                className="w-full p-2 border border-slate-200 rounded-lg disabled:bg-slate-100 bg-white text-xs"
              />
              <datalist id="receipt-ben-options">
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.fullName}>
                    {b.code} - {b.fullName} (BHYT: {b.insuranceNumber})
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Deliverer & Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Họ tên người giao hàng *</label>
              <input
                type="text"
                required
                value={delivererName}
                onChange={(e) => setDelivererName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Địa chỉ / Bộ phận giao *</label>
              <input
                type="text"
                required
                value={delivererDept}
                onChange={(e) => setDelivererDept(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Đơn vị phát hành hóa đơn (Nhà cung cấp) *</label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số hóa đơn kèm theo *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày hóa đơn *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nội dung nhập kho *</label>
            <input
              type="text"
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Drug Items List */}
          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Chi Tiết Thuốc Nhập Kho (Quản lý theo Số Lô)
                </span>
                <span className="text-3xs text-slate-500">
                  Bạn có thể chọn thuốc có sẵn từ danh mục hoặc tự điền thông tin chi tiết thuốc mới
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-2xs flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ Thêm thuốc có sẵn</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomItemRow}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-2xs flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Tự điền thông tin thuốc mới</span>
                </button>
              </div>
            </div>

            {/* Datalist for common units */}
            <datalist id="common-units">
              <option value="Viên" />
              <option value="Lọ" />
              <option value="Chai" />
              <option value="Gói" />
              <option value="Vỉ" />
              <option value="Tuýp" />
              <option value="Ống" />
              <option value="Túi" />
              <option value="Hộp" />
            </datalist>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold text-2xs uppercase">
                  <tr>
                    <th className="p-2 w-8 text-center">#</th>
                    <th className="p-2 w-80">Thông tin thuốc & quy cách</th>
                    <th className="p-2 w-32">Số lô *</th>
                    <th className="p-2 w-20 text-right">SL C.từ</th>
                    <th className="p-2 w-20 text-right">Thực nhập</th>
                    <th className="p-2 w-28 text-right">Đơn giá (₫)</th>
                    <th className="p-2 w-28 text-right">Thành tiền (₫)</th>
                    <th className="p-2 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const rowTotal = (Number(item.actualQuantity) || 0) * (Number(item.unitPrice) || 0);
                    const med = medicines.find((m) => m.id === item.medicineId);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 text-center text-slate-400 font-mono align-top pt-3">{idx + 1}</td>
                        <td className="p-2 align-top">
                          {/* Segmented Selector for Catalog vs Custom New Medicine */}
                          <div className="flex items-center gap-1 mb-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 w-fit">
                            <button
                              type="button"
                              onClick={() => switchToCatalogMedicine(idx)}
                              className={`px-2 py-1 rounded text-3xs font-semibold transition-all flex items-center gap-1 ${
                                !item.isCustom
                                  ? 'bg-white text-teal-800 shadow-2xs font-bold border border-slate-200'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <span>📋 Chọn từ danh mục</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => switchToCustomMedicine(idx, med)}
                              className={`px-2 py-1 rounded text-3xs font-semibold transition-all flex items-center gap-1 ${
                                item.isCustom
                                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                                  : 'text-emerald-700 hover:text-emerald-900'
                              }`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>✍️ Tự điền thuốc mới</span>
                            </button>
                          </div>

                          {item.isCustom ? (
                            /* Form Tự Điền Thông Tin Thuốc Mới */
                            <div className="p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-3xs font-bold text-emerald-900 uppercase flex items-center gap-1">
                                  <Pill className="w-3.5 h-3.5 text-emerald-600" />
                                  Tự điền thông tin thuốc nhập mới
                                </span>
                                <button
                                  type="button"
                                  onClick={() => switchToCatalogMedicine(idx)}
                                  className="text-3xs text-slate-500 hover:text-slate-800 underline font-medium"
                                  title="Quay lại chọn thuốc có sẵn trong danh mục"
                                >
                                  (Chọn từ danh mục)
                                </button>
                              </div>

                              <div>
                                <label className="block text-3xs font-bold text-emerald-900 mb-0.5">Tên thuốc / biệt dược: *</label>
                                <input
                                  type="text"
                                  required
                                  autoFocus
                                  placeholder="Nhập tên thuốc mới... (vd: Diazepam 5mg)"
                                  value={item.customName || ''}
                                  onChange={(e) => handleItemChange(idx, 'customName', e.target.value)}
                                  className="w-full p-1.5 border border-emerald-400 rounded text-xs font-bold text-slate-900 bg-white placeholder:font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 text-2xs">
                                <div>
                                  <label className="block text-3xs text-slate-500 mb-0.5">Hoạt chất:</label>
                                  <input
                                    type="text"
                                    placeholder="vd: Diazepam"
                                    value={item.customActiveIngredient || ''}
                                    onChange={(e) => handleItemChange(idx, 'customActiveIngredient', e.target.value)}
                                    className="w-full p-1 border border-slate-200 rounded text-2xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-3xs text-slate-500 mb-0.5">Hàm lượng:</label>
                                  <input
                                    type="text"
                                    placeholder="vd: 5mg"
                                    value={item.customConcentration || ''}
                                    onChange={(e) => handleItemChange(idx, 'customConcentration', e.target.value)}
                                    className="w-full p-1 border border-slate-200 rounded text-2xs bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-3xs text-slate-500 mb-0.5">Đơn vị tính:</label>
                                  <input
                                    type="text"
                                    list="common-units"
                                    placeholder="vd: Viên, Lọ, Chai"
                                    value={item.customUnit || 'Viên'}
                                    onChange={(e) => handleItemChange(idx, 'customUnit', e.target.value)}
                                    className="w-full p-1 border border-slate-200 rounded text-2xs bg-white font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="block text-3xs text-slate-500 mb-0.5">Quy cách:</label>
                                  <input
                                    type="text"
                                    placeholder="vd: Hộp 10 vỉ"
                                    value={item.customPackaging || ''}
                                    onChange={(e) => handleItemChange(idx, 'customPackaging', e.target.value)}
                                    className="w-full p-1 border border-slate-200 rounded text-2xs bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Chọn Thuốc Có Sẵn Từ Danh Mục */
                            <div className="space-y-1">
                              <select
                                value={item.medicineId}
                                onChange={(e) => {
                                  if (e.target.value === '__CUSTOM_NEW__') {
                                    switchToCustomMedicine(idx);
                                  } else {
                                    handleItemChange(idx, 'medicineId', e.target.value);
                                  }
                                }}
                                className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white font-medium text-slate-800 focus:border-teal-500"
                              >
                                <option value="__CUSTOM_NEW__" className="text-emerald-700 font-bold bg-emerald-50">
                                  + ✍️ [Tự điền thông tin thuốc mới...]
                                </option>
                                {medicines.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.code} - {m.name} ({m.unit})
                                  </option>
                                ))}
                              </select>
                              <div className="text-3xs text-slate-400">
                                {med?.activeIngredient ? `${med.activeIngredient} · ` : ''}{med?.packaging || ''}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-2 align-top">
                          <input
                            type="text"
                            required
                            placeholder="LOT-..."
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded font-mono text-xs uppercase bg-white font-bold"
                          />
                        </td>
                        <td className="p-2 text-right align-top">
                          <input
                            type="number"
                            min="1"
                            value={item.docQuantity}
                            onChange={(e) => handleItemChange(idx, 'docQuantity', Number(e.target.value))}
                            className="w-full p-1.5 border border-slate-200 rounded text-right font-mono text-xs bg-white"
                          />
                        </td>
                        <td className="p-2 text-right align-top">
                          <input
                            type="number"
                            min="1"
                            value={item.actualQuantity}
                            onChange={(e) => handleItemChange(idx, 'actualQuantity', Number(e.target.value))}
                            className="w-full p-1.5 border border-slate-200 rounded text-right font-mono text-xs font-bold bg-white text-teal-800"
                          />
                        </td>
                        <td className="p-2 text-right align-top">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full p-1.5 border border-slate-200 rounded text-right font-mono text-xs bg-white font-medium"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900 align-top pt-3">
                          {formatNumber(rowTotal)}
                        </td>
                        <td className="p-2 text-center align-top pt-2.5">
                          <button
                            type="button"
                            disabled={items.length <= 1}
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-300 hover:text-rose-500 disabled:opacity-30 p-1"
                            title="Xóa dòng thuốc này"
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
              <span className="font-bold text-slate-800 uppercase">Cộng tổng thành tiền:</span>
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
              {editingReceipt ? 'Lưu Hiệu Chỉnh & In Phiếu' : 'Ghi Nhận & In Phiếu Nhập'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Document Modal */}
      <PrintModal document={printDocument} onClose={() => setPrintDocument(null)} />
    </div>
  );
};
