/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Prescription, PrescriptionItem } from '../../types';
import { Plus, Search, FileText, Printer, CheckCircle, Clock, Trash2, ArrowRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PrintModal, PrintDocumentType } from '../print/PrintModal';
import { formatDate, getTodayISODate } from '../../utils/formatters';

interface PrescriptionListViewProps {
  onNavigateToDispense?: (prescriptionId: string) => void;
}

export const PrescriptionListView: React.FC<PrescriptionListViewProps> = ({ onNavigateToDispense }) => {
  const { prescriptions, medicines, beneficiaries, currentUser, createPrescription } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [printDocument, setPrintDocument] = useState<PrintDocumentType | null>(null);

  // New Prescription Form
  const [code, setCode] = useState(`DT-${getTodayISODate().replace(/-/g, '')}-00${prescriptions.length + 1}`);
  const [prescriptionDate, setPrescriptionDate] = useState(getTodayISODate());
  const [beneficiaryId, setBeneficiaryId] = useState(beneficiaries[0]?.id || '');
  const [doctorName, setDoctorName] = useState(currentUser.fullName || 'BS. CKI. Nguyễn Thanh Long');
  const [diagnosis, setDiagnosis] = useState('Tăng huyết áp nguyên phát độ 2 - Điều trị duy trì');
  const [note, setNote] = useState('Uống thuốc đều đặn đúng giờ, đo huyết áp mỗi buổi sáng.');

  interface PrescRow {
    medicineId: string;
    dosage: string;
    frequency: string;
    route: string;
    instructions: string;
    daysCount: number;
    prescribedQuantity: number;
  }

  const [items, setItems] = useState<PrescRow[]>([
    {
      medicineId: medicines[0]?.id || '',
      dosage: '1 viên/lần',
      frequency: '1 lần/ngày (Sáng)',
      route: 'Uống',
      instructions: 'Uống sau bữa ăn sáng',
      daysCount: 30,
      prescribedQuantity: 30,
    },
  ]);

  const handleOpenCreateModal = () => {
    const today = getTodayISODate();
    setCode(`DT-${today.replace(/-/g, '')}-00${prescriptions.length + 1}`);
    setPrescriptionDate(today);
    setBeneficiaryId(beneficiaries[0]?.id || '');
    setDoctorName(currentUser.fullName);
    setItems([
      {
        medicineId: medicines[0]?.id || '',
        dosage: '1 viên/lần',
        frequency: '1 lần/ngày (Sáng)',
        route: 'Uống',
        instructions: 'Uống sau bữa ăn sáng',
        daysCount: 30,
        prescribedQuantity: 30,
      },
    ]);
    setIsCreateModalOpen(true);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        medicineId: medicines[0]?.id || '',
        dosage: '1 viên/lần',
        frequency: '2 lần/ngày (Sáng 1, Chiều 1)',
        route: 'Uống',
        instructions: 'Uống sau khi ăn',
        daysCount: 30,
        prescribedQuantity: 60,
      },
    ]);
  };

  const handleItemChange = (index: number, field: keyof PrescRow, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Vui lòng thêm ít nhất một loại thuốc!');
      return;
    }

    const created = createPrescription(
      {
        code,
        prescriptionDate,
        beneficiaryId,
        doctorName,
        diagnosis,
        note,
      },
      items
    );

    setIsCreateModalOpen(false);
    setPrintDocument({ type: 'PRESCRIPTION', data: created });
  };

  const filtered = prescriptions.filter((p) => {
    const ben = beneficiaries.find((b) => b.id === p.beneficiaryId);
    return (
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ben && ben.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, họ tên đối tượng, chẩn đoán..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Lập Đơn Thuốc Mới</span>
        </button>
      </div>

      {/* Prescription List */}
      <div className="space-y-3">
        {filtered.map((presc) => {
          const ben = beneficiaries.find((b) => b.id === presc.beneficiaryId);
          const totalPrescribed = presc.items.reduce((s, i) => s + i.prescribedQuantity, 0);
          const totalDispensed = presc.items.reduce((s, i) => s + i.dispensedQuantity, 0);
          const percent = Math.min(100, Math.round((totalDispensed / totalPrescribed) * 100));

          return (
            <div
              key={presc.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm">{presc.code}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">{formatDate(presc.prescriptionDate)}</span>
                  <span className="text-slate-300">·</span>
                  <span
                    className={`text-2xs font-semibold ${
                      presc.status === 'COMPLETED'
                        ? 'text-teal-700'
                        : presc.status === 'DISPENSING'
                        ? 'text-amber-700'
                        : 'text-blue-700'
                    }`}
                  >
                    {presc.status === 'COMPLETED'
                      ? 'Đã hoàn thành cấp phát'
                      : presc.status === 'DISPENSING'
                      ? 'Đang cấp phát theo đợt'
                      : 'Đơn mới (Chưa cấp)'}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-800">
                  Đối tượng: <span className="uppercase text-teal-900">{ben?.fullName}</span>{' '}
                  <span className="font-mono text-slate-500 font-normal">
                    ({ben?.code} - {ben?.roomArea})
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="text-slate-400">Chẩn đoán:</span> {presc.diagnosis}
                </div>

                {/* Drug items preview */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {presc.items.map((it) => {
                    const med = medicines.find((m) => m.id === it.medicineId);
                    return (
                      <span
                        key={it.id}
                        className="text-2xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                      >
                        {med?.name}: {it.dispensedQuantity}/{it.prescribedQuantity} {med?.unit}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Progress and Actions */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0">
                <div className="text-right sm:w-32">
                  <div className="text-xs font-semibold text-slate-700">Tiến độ cấp phát: {percent}%</div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-teal-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintDocument({ type: 'PRESCRIPTION', data: presc })}
                    className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                    title="In đơn thuốc"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {presc.status !== 'COMPLETED' && onNavigateToDispense && (
                    <button
                      onClick={() => onNavigateToDispense(presc.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>Cấp Phát Thuốc</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Lập Đơn Thuốc */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Lập Đơn Thuốc Điều Trị Cho Đối Tượng"
        subtitle="Chỉ định dùng thuốc, hướng dẫn liều dùng và số ngày điều trị"
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mã đơn thuốc *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ngày kê đơn *</label>
              <input
                type="date"
                required
                value={prescriptionDate}
                onChange={(e) => setPrescriptionDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Bác sĩ / Y sĩ kê đơn *</label>
              <input
                type="text"
                required
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Hồ sơ đối tượng điều trị *</label>
              <select
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-semibold"
              >
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.fullName} (BHYT: {b.insuranceNumber}) - {b.roomArea}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Chẩn đoán y khoa *</label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Lời dặn của bác sĩ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Items */}
          <div className="mt-4 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-xs">Danh Sách Thuốc Kê Đơn</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-2xs text-teal-700 font-semibold hover:text-teal-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm loại thuốc</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-2xs text-slate-500 mb-0.5">Thuốc</label>
                      <select
                        value={it.medicineId}
                        onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded text-xs"
                      >
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.activeIngredient}) - {m.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-2xs text-slate-500 mb-0.5">Số ngày dùng</label>
                      <input
                        type="number"
                        min="1"
                        value={it.daysCount}
                        onChange={(e) => handleItemChange(idx, 'daysCount', Number(e.target.value))}
                        className="w-full p-1.5 border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs text-slate-500 mb-0.5">Tổng số lượng kê</label>
                      <input
                        type="number"
                        min="1"
                        value={it.prescribedQuantity}
                        onChange={(e) => handleItemChange(idx, 'prescribedQuantity', Number(e.target.value))}
                        className="w-full p-1.5 border border-slate-200 rounded text-xs font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-2xs text-slate-500 mb-0.5">Liều dùng (vd: 1 viên/lần)</label>
                      <input
                        type="text"
                        value={it.dosage}
                        onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs text-slate-500 mb-0.5">Số lần dùng (vd: 2 lần/ngày)</label>
                      <input
                        type="text"
                        value={it.frequency}
                        onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                        className="w-full p-1.5 border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-2xs text-slate-500 mb-0.5">Hướng dẫn</label>
                        <input
                          type="text"
                          value={it.instructions}
                          onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded text-xs"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="mt-4 p-1.5 text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Lưu Đơn & Xem Bản In
            </button>
          </div>
        </form>
      </Modal>

      <PrintModal document={printDocument} onClose={() => setPrintDocument(null)} />
    </div>
  );
};
