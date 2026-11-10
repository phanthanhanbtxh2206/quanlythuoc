/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Medicine } from '../../types';
import { Plus, Search, Edit2, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { formatNumber } from '../../utils/formatters';

export const MedicineListView: React.FC = () => {
  const { medicines, addMedicine, updateMedicine, getAvailableLots } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    activeIngredient: string;
    concentration: string;
    unit: string;
    packaging: string;
    dosageForm: string;
    route: string;
    manufacturer: string;
    category: string;
    minStockAlert: number;
    status: Medicine['status'];
    note: string;
  }>({
    code: '',
    name: '',
    activeIngredient: '',
    concentration: '',
    unit: 'Viên',
    packaging: '',
    dosageForm: 'Viên nén',
    route: 'Uống',
    manufacturer: '',
    category: 'Thuốc tim mạch huyết áp',
    minStockAlert: 50,
    status: 'Đang sử dụng',
    note: '',
  });

  const availableLots = getAvailableLots();

  const categories = Array.from(new Set(medicines.map((m) => m.category)));

  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || med.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenCreate = () => {
    setEditingMedicine(null);
    setFormData({
      code: `TH-${String(medicines.length + 1).padStart(3, '0')}`,
      name: '',
      activeIngredient: '',
      concentration: '',
      unit: 'Viên',
      packaging: 'Hộp 10 vỉ x 10 viên',
      dosageForm: 'Viên nén',
      route: 'Uống',
      manufacturer: 'Dược Hậu Giang',
      category: 'Thuốc tim mạch huyết áp',
      minStockAlert: 50,
      status: 'Đang sử dụng',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setFormData({
      code: med.code,
      name: med.name,
      activeIngredient: med.activeIngredient,
      concentration: med.concentration,
      unit: med.unit,
      packaging: med.packaging,
      dosageForm: med.dosageForm,
      route: med.route,
      manufacturer: med.manufacturer,
      category: med.category,
      minStockAlert: med.minStockAlert,
      status: med.status,
      note: med.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Vui lòng nhập tên thuốc và mã thuốc!');
      return;
    }

    if (editingMedicine) {
      updateMedicine(editingMedicine.id, formData);
    } else {
      addMedicine(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên thuốc, hoạt chất, mã số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 focus:outline-hidden"
            >
              <option value="ALL">Tất cả nhóm thuốc</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Thuốc Mới</span>
        </button>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-2xs">
            <tr>
              <th className="py-3 px-4">Mã số</th>
              <th className="py-3 px-4">Tên biệt dược & Hàm lượng</th>
              <th className="py-3 px-4">Hoạt chất chính</th>
              <th className="py-3 px-4">ĐVT / Quy cách</th>
              <th className="py-3 px-4">Đường dùng</th>
              <th className="py-3 px-4 text-right">Tồn hiện tại</th>
              <th className="py-3 px-4 text-center">Trạng thái</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMedicines.map((med) => {
              const currentStock = availableLots
                .filter((l) => l.medicineId === med.id)
                .reduce((s, l) => s + l.quantity, 0);

              const isLow = currentStock <= med.minStockAlert;

              return (
                <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{med.code}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{med.name}</div>
                    <div className="text-2xs text-slate-400">{med.category}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <div>{med.activeIngredient}</div>
                    <div className="text-2xs text-slate-400">Hàm lượng: {med.concentration}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{med.unit}</div>
                    <div className="text-2xs text-slate-400">{med.packaging}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {med.route} · {med.dosageForm}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                      {formatNumber(currentStock)}
                    </span>
                    <span className="text-slate-400 text-2xs ml-1">/ Min {med.minStockAlert}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-2xs font-medium ${
                        med.status === 'Đang sử dụng' ? 'text-teal-700' : 'text-slate-400'
                      }`}
                    >
                      {med.status === 'Đang sử dụng' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Đang dùng</span>
                        </>
                      ) : (
                        <span>Ngừng dùng</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenEdit(med)}
                      className="p-1 text-slate-400 hover:text-teal-600 rounded hover:bg-slate-100 transition-colors"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMedicine ? 'Chỉnh Sửa Thông Tin Thuốc' : 'Thêm Thuốc Mới Vào Danh Mục'}
        subtitle="Quản lý thông tin định danh, hoạt chất, quy cách và ngưỡng cảnh báo tồn kho"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mã thuốc (Định danh duy nhất) *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên thuốc (Biệt dược) *</label>
              <input
                type="text"
                required
                placeholder="vd: Amlodipin 5mg"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Hoạt chất chính *</label>
              <input
                type="text"
                required
                placeholder="vd: Amlodipin besylat"
                value={formData.activeIngredient}
                onChange={(e) => setFormData({ ...formData, activeIngredient: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Hàm lượng *</label>
              <input
                type="text"
                required
                placeholder="vd: 5mg, 500mg, 20mg/ml"
                value={formData.concentration}
                onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Đơn vị tính (ĐVT) *</label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Dạng bào chế</label>
              <input
                type="text"
                value={formData.dosageForm}
                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Đường dùng</label>
              <select
                value={formData.route}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="Uống">Uống</option>
                <option value="Tiêm bắp">Tiêm bắp</option>
                <option value="Tiêm tĩnh mạch">Tiêm tĩnh mạch</option>
                <option value="Nhỏ mắt/tai">Nhỏ mắt/tai</option>
                <option value="Bôi ngoài da">Bôi ngoài da</option>
                <option value="Đặt dưới lưỡi">Đặt dưới lưỡi</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Quy cách đóng gói</label>
              <input
                type="text"
                placeholder="vd: Hộp 10 vỉ x 10 viên"
                value={formData.packaging}
                onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nhóm thuốc</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Hãng sản xuất</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngưỡng cảnh báo tồn tối thiểu</label>
              <input
                type="number"
                min="0"
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
            >
              {editingMedicine ? 'Lưu Thay Đổi' : 'Thêm Thuốc'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
