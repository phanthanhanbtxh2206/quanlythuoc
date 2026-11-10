/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Beneficiary } from '../../types';
import { Plus, Search, Edit2, User, FileSpreadsheet, HeartPulse } from 'lucide-react';
import { Modal } from '../common/Modal';

interface BeneficiaryListViewProps {
  onSelectReportBeneficiary?: (benId: string) => void;
}

export const BeneficiaryListView: React.FC<BeneficiaryListViewProps> = ({ onSelectReportBeneficiary }) => {
  const { beneficiaries, addBeneficiary, updateBeneficiary, prescriptions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBen, setEditingBen] = useState<Beneficiary | null>(null);

  const [formData, setFormData] = useState<{
    code: string;
    fullName: string;
    gender: 'Nam' | 'Nữ';
    birthYear: number;
    idCard: string;
    insuranceNumber: string;
    roomArea: string;
    status: Beneficiary['status'];
    note: string;
  }>({
    code: '',
    fullName: '',
    gender: 'Nam',
    birthYear: 1950,
    idCard: '',
    insuranceNumber: '',
    roomArea: 'Khu Người Cao Tuổi',
    status: 'Đang quản lý',
    note: '',
  });

  const filtered = beneficiaries.filter(
    (b) =>
      b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.insuranceNumber && b.insuranceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingBen(null);
    setFormData({
      code: `DT-${String(beneficiaries.length + 1).padStart(3, '0')}`,
      fullName: '',
      gender: 'Nam',
      birthYear: 1955,
      idCard: '',
      insuranceNumber: 'GD4480120195500',
      roomArea: 'Khu Người Cao Tuổi - Phòng 101',
      status: 'Đang quản lý',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ben: Beneficiary) => {
    setEditingBen(ben);
    setFormData({
      code: ben.code,
      fullName: ben.fullName,
      gender: ben.gender,
      birthYear: ben.birthYear,
      idCard: ben.idCard || '',
      insuranceNumber: ben.insuranceNumber || '',
      roomArea: ben.roomArea,
      status: ben.status,
      note: ben.note || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.code.trim()) {
      alert('Vui lòng nhập họ tên và mã đối tượng!');
      return;
    }

    if (editingBen) {
      updateBeneficiary(editingBen.id, formData);
    } else {
      addBeneficiary(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, mã đối tượng, số thẻ BHYT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Hồ Sơ Đối Tượng</span>
        </button>
      </div>

      {/* Grid of Beneficiaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ben) => {
          const benPrescriptions = prescriptions.filter((p) => p.beneficiaryId === ben.id);
          const activePresc = benPrescriptions.filter(
            (p) => p.status === 'ACTIVE' || p.status === 'DISPENSING'
          );

          return (
            <div
              key={ben.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                      {ben.gender === 'Nam' ? 'N' : 'T'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{ben.fullName}</h4>
                      <div className="text-2xs text-slate-400 font-mono">
                        {ben.code} · {ben.gender}, {ben.birthYear} ({new Date().getFullYear() - ben.birthYear} tuổi)
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(ben)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số thẻ BHYT:</span>
                    <span className="font-mono font-semibold text-teal-800">
                      {ben.insuranceNumber || 'Chưa đăng ký'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Khu / Phòng:</span>
                    <span className="font-medium text-slate-800">{ben.roomArea}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Đơn thuốc:</span>
                    <span className="font-medium">
                      {activePresc.length > 0 ? (
                        <span className="text-amber-700 font-semibold">{activePresc.length} đơn đang điều trị</span>
                      ) : (
                        <span className="text-slate-400">Không có đơn active</span>
                      )}
                    </span>
                  </div>
                </div>

                {ben.note && (
                  <div className="mt-2.5 p-2 rounded bg-slate-50 border border-slate-100 text-2xs text-slate-600 italic">
                    {ben.note}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-2xs text-slate-400">{ben.status}</span>
                {onSelectReportBeneficiary && (
                  <button
                    onClick={() => onSelectReportBeneficiary(ben.id)}
                    className="flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold text-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xem Báo Cáo BHYT</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBen ? 'Chỉnh Sửa Hồ Sơ Đối Tượng' : 'Thêm Hồ Sơ Đối Tượng Mới'}
        subtitle="Quản lý thông tin định danh, số thẻ bảo hiểm y tế và phân khu chăm sóc"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mã đối tượng (Nội bộ) *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Họ và tên đối tượng *</label>
              <input
                type="text"
                required
                placeholder="vd: Nguyễn Văn An"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Giới tính</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Nam' | 'Nữ' })}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Năm sinh</label>
              <input
                type="number"
                min="1920"
                max="2026"
                value={formData.birthYear}
                onChange={(e) => setFormData({ ...formData, birthYear: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số CCCD / Định danh</label>
              <input
                type="text"
                value={formData.idCard}
                onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số thẻ BHYT (Quan trọng cho báo cáo)</label>
              <input
                type="text"
                placeholder="vd: GD4480120194812"
                value={formData.insuranceNumber}
                onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono text-teal-800 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Khu quản lý / Phòng</label>
            <input
              type="text"
              value={formData.roomArea}
              onChange={(e) => setFormData({ ...formData, roomArea: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tình trạng bệnh lý / Ghi chú</label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Tiền sử bệnh lý mạn tính..."
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
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
              {editingBen ? 'Lưu Thay Đổi' : 'Thêm Đối Tượng'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
