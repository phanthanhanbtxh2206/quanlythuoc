/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart3, TrendingUp, PackagePlus, PackageMinus, Calendar } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';

export const GeneralReportView: React.FC = () => {
  const { receipts, issues, medicines, beneficiaries } = useApp();
  const [reportType, setReportType] = useState<'RECEIPTS_SUMMARY' | 'ISSUES_SUMMARY'>('RECEIPTS_SUMMARY');

  const totalReceiptsValue = receipts.reduce((s, r) => s + r.totalAmount, 0);
  const totalIssuesValue = issues.reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Báo Cáo Tổng Hợp Luân Chuyển Kho Dược</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp dữ liệu nhập kho theo nhà cung cấp và dữ liệu xuất kho theo khu vực đối tượng điều trị
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setReportType('RECEIPTS_SUMMARY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'RECEIPTS_SUMMARY' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tổng Hợp Nhập Kho
          </button>
          <button
            onClick={() => setReportType('ISSUES_SUMMARY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportType === 'ISSUES_SUMMARY' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tổng Hợp Xuất Kho
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mb-1">
            <PackagePlus className="w-4 h-4" />
            <span>Lũy Kế Giá Trị Nhập Kho</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatCurrency(totalReceiptsValue)}</div>
          <div className="text-2xs text-slate-500 mt-1">Đã phát sinh {receipts.length} phiếu nhập kho hợp lệ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold mb-1">
            <PackageMinus className="w-4 h-4" />
            <span>Lũy Kế Giá Trị Xuất Cấp Phát</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{formatCurrency(totalIssuesValue)}</div>
          <div className="text-2xs text-slate-500 mt-1">Đã phát sinh {issues.length} phiếu xuất kho điều trị</div>
        </div>
      </div>

      {/* Content Table */}
      {reportType === 'RECEIPTS_SUMMARY' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Chi Tiết Các Đợt Nhập Kho Dược
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/50 text-slate-600 uppercase text-2xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Số phiếu</th>
                <th className="py-2.5 px-4">Ngày nhập</th>
                <th className="py-2.5 px-4">Đơn vị cung cấp</th>
                <th className="py-2.5 px-4">Số hóa đơn</th>
                <th className="py-2.5 px-4">Nội dung</th>
                <th className="py-2.5 px-4 text-right">Tổng tiền (₫)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-mono font-bold">{r.receiptCode}</td>
                  <td className="py-2.5 px-4">{formatDate(r.receiptDate)}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{r.supplierName}</td>
                  <td className="py-2.5 px-4 font-mono">{r.invoiceNumber}</td>
                  <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">{r.content}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-teal-800">
                    {formatCurrency(r.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Chi Tiết Các Đợt Xuất Kho Cấp Phát
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/50 text-slate-600 uppercase text-2xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Số phiếu</th>
                <th className="py-2.5 px-4">Ngày xuất</th>
                <th className="py-2.5 px-4">Người nhận hàng</th>
                <th className="py-2.5 px-4">Đối tượng hưởng</th>
                <th className="py-2.5 px-4">Địa điểm sử dụng</th>
                <th className="py-2.5 px-4 text-right">Tổng tiền (₫)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.map((i) => {
                const ben = beneficiaries.find((b) => b.id === i.beneficiaryId);
                return (
                  <tr key={i.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold">{i.issueCode}</td>
                    <td className="py-2.5 px-4">{formatDate(i.issueDate)}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{i.receiverName}</td>
                    <td className="py-2.5 px-4 font-semibold text-teal-900">{ben?.fullName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{i.usageLocation}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-800">
                      {formatCurrency(i.totalAmount)}
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
