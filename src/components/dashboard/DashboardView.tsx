/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Pill,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  FileText,
  Users,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    medicines,
    beneficiaries,
    receipts,
    issues,
    prescriptions,
    getExpiringLots,
    getLowStockMedicines,
    getAvailableLots,
  } = useApp();

  const expiring = getExpiringLots(60);
  const lowStock = getLowStockMedicines();
  const availableLots = getAvailableLots();
  const totalStockItems = availableLots.reduce((sum, l) => sum + l.quantity, 0);

  const pendingPrescriptions = prescriptions.filter(
    (p) => p.status === 'ACTIVE' || p.status === 'DISPENSING'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-xl p-6 shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Hệ Thống Quản Trị Kho Dược Phẩm & Y Tế Điều Trị</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Trung Tâm Bảo Trợ Xã Hội Đà Nẵng</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Phòng Y Tế - Phục Hồi Chức Năng (Mã QHNS: 1041008). Quản lý thuốc theo từng số lô, hạn dùng, đơn thuốc và
            báo cáo quyết toán cấp phát theo đối tượng BHYT.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => onNavigate('stock-receipts')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Nhập Kho Mới</span>
          </button>
          <button
            onClick={() => onNavigate('beneficiary-report')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-colors"
          >
            <span>Báo Cáo BHYT</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Danh mục thuốc</span>
            <Pill className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{medicines.length}</div>
          <div className="text-2xs text-slate-500 mt-1">
            Tổng tồn khả dụng: <span className="font-bold text-slate-800">{formatNumber(totalStockItems)}</span> viên/lọ
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Đối tượng bảo trợ</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{beneficiaries.length}</div>
          <div className="text-2xs text-slate-500 mt-1">
            {beneficiaries.filter((b) => b.insuranceNumber).length} đối tượng có thẻ BHYT
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Chứng từ nhập / xuất</span>
            <PackageMinus className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {receipts.length} <span className="text-slate-400 text-sm font-normal">/</span> {issues.length}
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Tổng nhập: {formatCurrency(receipts.reduce((s, r) => s + r.totalAmount, 0))}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Đơn thuốc đang điều trị</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono tracking-tight">
            {pendingPrescriptions.length}
          </div>
          <div className="text-2xs text-slate-500 mt-1">Cần theo dõi cấp phát đợt tiếp theo</div>
        </div>
      </div>

      {/* Two Column Section: Alerts vs Recent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: FEFO Expiration & Stock Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Cảnh Báo Dược Phẩm Cận Hạn & Tồn Kho (FEFO)</h3>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              Xem chi tiết lô
            </button>
          </div>

          <div className="space-y-3">
            {expiring.length === 0 && lowStock.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>Không có lô thuốc nào cận hạn hoặc dưới ngưỡng an toàn.</span>
              </div>
            ) : (
              <>
                {expiring.map(({ medicine, lot, daysUntilExpiry }) => (
                  <div
                    key={`${lot.medicineId}-${lot.batchNumber}`}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-amber-950">{medicine.name}</div>
                      <div className="text-slate-600 text-2xs mt-0.5">
                        Số lô: <span className="font-mono font-medium">{lot.batchNumber}</span> · Hạn dùng:{' '}
                        <span className="font-medium">{formatDate(lot.expiryDate)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-800 font-bold font-mono">
                        {daysUntilExpiry <= 0 ? 'Đã hết hạn!' : `Còn ${daysUntilExpiry} ngày`}
                      </div>
                      <div className="text-slate-500 text-2xs">
                        Tồn: {lot.quantity} {medicine.unit}
                      </div>
                    </div>
                  </div>
                ))}

                {lowStock.map(({ medicine, currentStock }) => (
                  <div
                    key={medicine.id}
                    className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-rose-950">{medicine.name}</div>
                      <div className="text-slate-600 text-2xs mt-0.5">Mã số: {medicine.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-rose-700 font-bold font-mono">Dưới ngưỡng an toàn</div>
                      <div className="text-slate-500 text-2xs">
                        Hiện có: <span className="font-bold text-rose-600">{currentStock}</span> / Tối thiểu{' '}
                        {medicine.minStockAlert} {medicine.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Recent Receipts & Issues */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Giao Dịch Kho Gần Nhất</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate('stock-receipts')}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
              >
                Nhập kho
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => onNavigate('stock-issues')}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
              >
                Xuất kho
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {receipts.slice(0, 2).map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 font-mono">{r.receiptCode}</div>
                    <div className="text-slate-500 text-2xs truncate max-w-xs">{r.content}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-teal-700 font-mono">{formatCurrency(r.totalAmount)}</div>
                  <div className="text-slate-400 text-2xs">{formatDate(r.receiptDate)}</div>
                </div>
              </div>
            ))}

            {issues.slice(0, 2).map((i) => {
              const ben = beneficiaries.find((b) => b.id === i.beneficiaryId);
              return (
                <div
                  key={i.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <PackageMinus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 font-mono">{i.issueCode}</div>
                      <div className="text-slate-500 text-2xs truncate max-w-xs">
                        Xuất cho: {ben?.fullName} ({ben?.code})
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800 font-mono">{formatCurrency(i.totalAmount)}</div>
                    <div className="text-slate-400 text-2xs">{formatDate(i.issueDate)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
