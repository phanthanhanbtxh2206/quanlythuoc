/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Prescription, StockIssue } from '../../types';
import { Activity, CheckCircle, AlertTriangle, Printer, FileText, ArrowRight } from 'lucide-react';
import { PrintModal, PrintDocumentType } from '../print/PrintModal';
import { formatDate, formatNumber } from '../../utils/formatters';

interface DispensationViewProps {
  initialPrescriptionId?: string;
}

export const DispensationView: React.FC<DispensationViewProps> = ({ initialPrescriptionId }) => {
  const { prescriptions, beneficiaries, medicines, getAvailableLots, dispensePrescription, currentUser } = useApp();
  const [selectedPrescId, setSelectedPrescId] = useState<string>(
    initialPrescriptionId || prescriptions.find((p) => p.status !== 'COMPLETED')?.id || prescriptions[0]?.id || ''
  );
  const [receiverName, setReceiverName] = useState('Y tá Hoàng Thị Lan');
  const [receiverDept, setReceiverDept] = useState('Phòng Y Tế - Phân ban chăm sóc NCT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successIssue, setSuccessIssue] = useState<StockIssue | null>(null);
  const [printDocument, setPrintDocument] = useState<PrintDocumentType | null>(null);

  const selectedPresc = prescriptions.find((p) => p.id === selectedPrescId);
  const beneficiary = selectedPresc ? beneficiaries.find((b) => b.id === selectedPresc.beneficiaryId) : null;
  const availableLots = getAvailableLots();

  // Dispense items state: mapping medicineId -> { batchNumber, quantity, unitPrice, expiryDate, maxStock }
  interface DispenseRowChoice {
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    expiryDate: string;
    maxStock: number;
  }

  const [dispenseChoices, setDispenseChoices] = useState<Record<string, DispenseRowChoice>>({});

  // When selected prescription changes, prefill choices
  React.useEffect(() => {
    if (!selectedPresc) return;

    const initialMap: Record<string, DispenseRowChoice> = {};
    selectedPresc.items.forEach((item) => {
      const remaining = item.prescribedQuantity - item.dispensedQuantity;
      if (remaining > 0) {
        // Find best matching lot for this medicine (FEFO)
        const medLots = availableLots.filter((l) => l.medicineId === item.medicineId);
        if (medLots.length > 0) {
          const bestLot = medLots[0];
          initialMap[item.medicineId] = {
            batchNumber: bestLot.batchNumber,
            quantity: Math.min(remaining, bestLot.quantity),
            unitPrice: bestLot.unitPrice,
            expiryDate: bestLot.expiryDate,
            maxStock: bestLot.quantity,
          };
        }
      }
    });
    setDispenseChoices(initialMap);
    setErrorMessage(null);
    setSuccessIssue(null);
  }, [selectedPrescId, prescriptions]);

  const handleLotChange = (medicineId: string, lotKey: string) => {
    const [medId, batch] = lotKey.split('___');
    const lot = availableLots.find((l) => l.medicineId === medId && l.batchNumber === batch);
    if (!lot) return;

    setDispenseChoices((prev) => ({
      ...prev,
      [medicineId]: {
        batchNumber: lot.batchNumber,
        quantity: Math.min(prev[medicineId]?.quantity || 1, lot.quantity),
        unitPrice: lot.unitPrice,
        expiryDate: lot.expiryDate,
        maxStock: lot.quantity,
      },
    }));
  };

  const handleQuantityChange = (medicineId: string, qty: number) => {
    setDispenseChoices((prev) => ({
      ...prev,
      [medicineId]: {
        ...prev[medicineId],
        quantity: qty,
      },
    }));
  };

  const handleConfirmDispense = () => {
    setErrorMessage(null);
    if (!selectedPresc) return;

    const itemsToDispense: {
      medicineId: string;
      batchNumber: string;
      quantity: number;
      unitPrice: number;
      expiryDate: string;
    }[] = [];

    for (const item of selectedPresc.items) {
      const remaining = item.prescribedQuantity - item.dispensedQuantity;
      const choice = dispenseChoices[item.medicineId];
      if (remaining > 0 && choice && choice.quantity > 0) {
        if (choice.quantity > choice.maxStock) {
          const med = medicines.find((m) => m.id === item.medicineId);
          setErrorMessage(
            `Số lượng cấp (${choice.quantity}) vượt quá tồn lô ${choice.batchNumber} (${choice.maxStock}) của thuốc ${med?.name}!`
          );
          return;
        }
        if (choice.quantity > remaining) {
          const med = medicines.find((m) => m.id === item.medicineId);
          setErrorMessage(
            `Số lượng cấp (${choice.quantity}) vượt quá lượng còn lại của đơn (${remaining}) cho thuốc ${med?.name}!`
          );
          return;
        }
        itemsToDispense.push({
          medicineId: item.medicineId,
          batchNumber: choice.batchNumber,
          quantity: choice.quantity,
          unitPrice: choice.unitPrice,
          expiryDate: choice.expiryDate,
        });
      }
    }

    if (itemsToDispense.length === 0) {
      setErrorMessage('Chưa chọn số lượng thuốc nào để cấp phát!');
      return;
    }

    const result = dispensePrescription(selectedPresc.id, itemsToDispense, receiverName, receiverDept);
    if (!result.success) {
      setErrorMessage(result.error || 'Lỗi khi ghi nhận cấp phát!');
      return;
    }

    if (result.issue) {
      setSuccessIssue(result.issue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Cấp Phát Thuốc Điều Trị Theo Đơn Y Tế</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy trình liên kết giữa Đơn thuốc bác sĩ đã kê và Xuất kho dược theo đúng nguyên tắc số lô & hạn dùng FEFO
          </p>
        </div>

        {/* Prescription Picker */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Chọn đơn thuốc:</label>
          <select
            value={selectedPrescId}
            onChange={(e) => setSelectedPrescId(e.target.value)}
            className="text-xs font-bold p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 min-w-64"
          >
            {prescriptions.map((p) => {
              const ben = beneficiaries.find((b) => b.id === p.beneficiaryId);
              return (
                <option key={p.id} value={p.id}>
                  {p.code} - {ben?.fullName} ({p.status})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Main Dispensation Workspace */}
      {selectedPresc && beneficiary ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Prescription & Beneficiary Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-2xs font-semibold text-teal-700 uppercase tracking-wide">Thông tin đơn thuốc</span>
              <div className="text-base font-bold font-mono text-slate-900">{selectedPresc.code}</div>
              <div className="text-xs text-slate-500 mt-0.5">Ngày kê: {formatDate(selectedPresc.prescriptionDate)}</div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-2xs">Đối tượng hưởng:</span>
                <span className="font-bold text-slate-900 text-sm">{beneficiary.fullName}</span>
                <div className="text-2xs text-slate-500 font-mono">
                  Mã ĐT: {beneficiary.code} · BHYT: {beneficiary.insuranceNumber}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-2xs">Khu vực điều trị:</span>
                <span className="font-medium text-slate-800">{beneficiary.roomArea}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-2xs">Bác sĩ kê đơn:</span>
                <span className="font-semibold text-slate-800">{selectedPresc.doctorName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-2xs">Chẩn đoán:</span>
                <span className="text-slate-700 italic">{selectedPresc.diagnosis}</span>
              </div>
            </div>

            {/* Receiver Form */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <span className="text-2xs font-semibold text-slate-700 uppercase">Thông tin người nhận thuốc</span>
              <div>
                <label className="block text-2xs text-slate-500 mb-0.5">Người nhận hàng (Y tá/Điều dưỡng) *</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full p-1.5 border border-slate-200 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-2xs text-slate-500 mb-0.5">Bộ phận nhận *</label>
                <input
                  type="text"
                  value={receiverDept}
                  onChange={(e) => setReceiverDept(e.target.value)}
                  className="w-full p-1.5 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Items To Dispense */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Danh Mục Thuốc Cần Cấp Phát</h4>
                <p className="text-2xs text-slate-500">
                  Hệ thống tự động đề xuất số lô có hạn sử dụng gần nhất (FEFO) và kiểm tra tồn kho
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  selectedPresc.status === 'COMPLETED' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {selectedPresc.status === 'COMPLETED' ? 'Đã cấp đủ 100%' : 'Chờ cấp phát'}
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successIssue && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold">Đã cấp phát thành công!</div>
                  <div className="text-2xs text-emerald-700">
                    Sinh phiếu xuất kho <span className="font-mono font-bold">{successIssue.issueCode}</span>
                  </div>
                </div>
                <button
                  onClick={() => setPrintDocument({ type: 'ISSUE', data: successIssue })}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-700 text-white rounded text-2xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Phiếu Xuất Kho</span>
                </button>
              </div>
            )}

            {/* Prescribed Items Table */}
            <div className="space-y-4">
              {selectedPresc.items.map((item) => {
                const med = medicines.find((m) => m.id === item.medicineId);
                const remaining = item.prescribedQuantity - item.dispensedQuantity;
                const isFullyDispensed = remaining <= 0;
                const medLots = availableLots.filter((l) => l.medicineId === item.medicineId);
                const choice = dispenseChoices[item.medicineId];

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-lg border ${
                      isFullyDispensed ? 'bg-slate-50/50 border-slate-200 opacity-70' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{med?.name}</div>
                        <div className="text-2xs text-slate-500">
                          {med?.activeIngredient} ({med?.concentration}) · {item.dosage} - {item.frequency}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <span className="text-slate-500">Kê đơn: </span>
                        <span className="font-mono font-bold text-slate-900">{item.prescribedQuantity}</span>
                        <span className="text-slate-400 text-2xs ml-1">{med?.unit}</span>
                        <div className="text-2xs text-slate-500">
                          Đã cấp: {item.dispensedQuantity} · Còn lại:{' '}
                          <strong className={remaining > 0 ? 'text-amber-700' : 'text-teal-700'}>{remaining}</strong>
                        </div>
                      </div>
                    </div>

                    {!isFullyDispensed && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-2xs font-semibold text-slate-600 mb-1">
                            Chọn số lô xuất kho (FEFO) *
                          </label>
                          {medLots.length > 0 ? (
                            <select
                              value={`${choice?.batchNumber ? item.medicineId + '___' + choice.batchNumber : ''}`}
                              onChange={(e) => handleLotChange(item.medicineId, e.target.value)}
                              className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white font-mono"
                            >
                              {medLots.map((l) => (
                                <option key={l.batchNumber} value={`${l.medicineId}___${l.batchNumber}`}>
                                  Lô: {l.batchNumber} (Hạn: {formatDate(l.expiryDate)} - Tồn: {l.quantity} {med?.unit})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-rose-600 text-2xs font-semibold py-1">
                              Kho hiện không còn lô nào có tồn khả dụng!
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-2xs font-semibold text-slate-600 mb-1">
                            Số lượng cấp đợt này *
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(remaining, choice?.maxStock || 0)}
                            value={choice?.quantity || 0}
                            onChange={(e) => handleQuantityChange(item.medicineId, Number(e.target.value))}
                            className="w-full p-1.5 border border-slate-200 rounded text-xs font-mono font-bold bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleConfirmDispense}
                disabled={selectedPresc.status === 'COMPLETED'}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                <Activity className="w-4 h-4" />
                <span>Xác Nhận Cấp Phát & Sinh Phiếu Xuất Kho</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          Chưa có đơn thuốc nào được chọn.
        </div>
      )}

      <PrintModal document={printDocument} onClose={() => setPrintDocument(null)} />
    </div>
  );
};
