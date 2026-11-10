/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Boxes, Search, Filter, AlertTriangle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate, getExpiryStatus } from '../../utils/formatters';

export const InventoryView: React.FC = () => {
  const { medicines, beneficiaries, getAvailableLots } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'LOT' | 'MEDICINE'>('LOT');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXPIRING' | 'SAFE'>('ALL');

  const availableLots = getAvailableLots();

  // Aggregate by medicine
  const stockByMedicine = medicines.map((med) => {
    const lots = availableLots.filter((l) => l.medicineId === med.id);
    const totalQty = lots.reduce((sum, l) => sum + l.quantity, 0);
    const totalValue = lots.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const avgPrice = totalQty > 0 ? Math.round(totalValue / totalQty) : 0;
    return {
      medicine: med,
      totalQty,
      totalValue,
      avgPrice,
      lotCount: lots.length,
    };
  });

  const filteredLots = availableLots.filter((lot) => {
    const med = medicines.find((m) => m.id === lot.medicineId);
    if (!med) return false;
    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const expInfo = getExpiryStatus(lot.expiryDate);
    let matchesStatus = true;
    if (statusFilter === 'EXPIRING') {
      matchesStatus = expInfo.status === 'EXPIRED' || expInfo.status === 'CRITICAL' || expInfo.status === 'WARNING';
    } else if (statusFilter === 'SAFE') {
      matchesStatus = expInfo.status === 'GOOD';
    }

    return matchesSearch && matchesStatus;
  });

  const totalWarehouseValue = availableLots.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const totalStockCount = availableLots.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Top Banner & Summary */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Quản Lý Tồn Kho & Theo Dõi Số Lô Hạn Dùng</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tồn kho được tính toán tự động dựa trên giao dịch nguyên tử, tuân thủ nguyên tắc quản lý FEFO
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 block text-2xs uppercase">Tổng số lượng tồn:</span>
            <span className="font-bold font-mono text-base text-slate-900">{formatNumber(totalStockCount)}</span>
          </div>
          <div className="border-l border-slate-200 pl-6">
            <span className="text-slate-400 block text-2xs uppercase">Tổng giá trị kho:</span>
            <span className="font-bold font-mono text-base text-teal-700">{formatCurrency(totalWarehouseValue)}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên thuốc, số lô, mã số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 focus:outline-hidden"
            >
              <option value="ALL">Tất cả trạng thái hạn</option>
              <option value="EXPIRING">Cận hạn hoặc hết hạn (&lt; 90 ngày)</option>
              <option value="SAFE">Hạn dùng an toàn</option>
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('LOT')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'LOT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Theo Từng Số Lô
          </button>
          <button
            onClick={() => setViewMode('MEDICINE')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'MEDICINE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tổng Hợp Theo Thuốc
          </button>
        </div>
      </div>

      {/* Table by Lots */}
      {viewMode === 'LOT' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-2xs">
              <tr>
                <th className="py-3 px-4">Tên thuốc & hàm lượng</th>
                <th className="py-3 px-4">Mã số</th>
                <th className="py-3 px-4">Số lô</th>
                <th className="py-3 px-4">Hạn dùng</th>
                <th className="py-3 px-4 text-center">Tình trạng hạn</th>
                <th className="py-3 px-4 text-right">Tồn khả dụng</th>
                <th className="py-3 px-4 text-right">Đơn giá lô</th>
                <th className="py-3 px-4 text-right">Thành tiền (₫)</th>
                <th className="py-3 px-4">Đối tượng mua riêng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLots.map((lot) => {
                const med = medicines.find((m) => m.id === lot.medicineId);
                const ben = beneficiaries.find((b) => b.id === lot.beneficiaryId);
                const expInfo = getExpiryStatus(lot.expiryDate);

                return (
                  <tr key={`${lot.medicineId}_${lot.batchNumber}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{med?.name}</div>
                      <div className="text-2xs text-slate-400">{med?.activeIngredient}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{med?.code}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{lot.batchNumber}</td>
                    <td className="py-3 px-4 font-mono">{formatDate(lot.expiryDate)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-2xs font-semibold ${
                          expInfo.status === 'EXPIRED'
                            ? 'text-rose-700'
                            : expInfo.status === 'CRITICAL'
                            ? 'text-rose-600'
                            : expInfo.status === 'WARNING'
                            ? 'text-amber-700'
                            : 'text-teal-700'
                        }`}
                      >
                        {expInfo.status !== 'GOOD' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{expInfo.label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNumber(lot.quantity)} <span className="text-slate-400 font-normal">{med?.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{formatNumber(lot.unitPrice)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-teal-800">
                      {formatNumber(lot.quantity * lot.unitPrice)}
                    </td>
                    <td className="py-3 px-4">
                      {ben ? (
                        <div className="font-semibold text-teal-800">
                          {ben.fullName} <span className="text-2xs text-slate-400">({ben.code})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Kho trung tâm</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Table by Medicine */}
      {viewMode === 'MEDICINE' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-2xs">
              <tr>
                <th className="py-3 px-4">Mã thuốc</th>
                <th className="py-3 px-4">Tên biệt dược & hoạt chất</th>
                <th className="py-3 px-4">Đơn vị tính</th>
                <th className="py-3 px-4 text-center">Số lô phát sinh</th>
                <th className="py-3 px-4 text-right">Tổng tồn khả dụng</th>
                <th className="py-3 px-4 text-right">Đơn giá bình quân</th>
                <th className="py-3 px-4 text-right">Tổng giá trị tồn</th>
                <th className="py-3 px-4 text-center">Tình trạng tồn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockByMedicine.map(({ medicine, totalQty, totalValue, avgPrice, lotCount }) => {
                const isLow = totalQty <= medicine.minStockAlert;
                return (
                  <tr key={medicine.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{medicine.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{medicine.name}</div>
                      <div className="text-2xs text-slate-400">
                        {medicine.activeIngredient} ({medicine.concentration})
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{medicine.unit}</td>
                    <td className="py-3 px-4 text-center font-mono">{lotCount} lô</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNumber(totalQty)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{formatNumber(avgPrice)} ₫</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-teal-800">
                      {formatNumber(totalValue)} ₫
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-2xs font-semibold ${
                          isLow ? 'text-rose-600' : 'text-teal-700'
                        }`}
                      >
                        {isLow ? `Dưới ngưỡng (< ${medicine.minStockAlert})` : 'An toàn'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
