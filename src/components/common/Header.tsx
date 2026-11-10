/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  Bell,
  Building2,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const { currentUser, users, setCurrentUser, getExpiringLots, getLowStockMedicines, resetAllData } = useApp();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const expiring = getExpiringLots(60);
  const lowStock = getLowStockMedicines();
  const alertCount = expiring.length + lowStock.length;

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Quản trị viên',
    DOCTOR: 'Bác sĩ / Y sĩ',
    PHARMACIST: 'Dược sĩ / Thủ kho',
    ACCOUNTANT: 'Kế toán viên',
    LEADER: 'Lãnh đạo đơn vị',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Zone 1: Agency Brand Wordmark & Department Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap">
              TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG
            </span>
            <span className="text-xs text-slate-400 font-mono">| Mã QHNS: 1041008</span>
          </div>
          <div className="text-xs text-teal-700 font-medium">Phòng Y Tế - Phục Hồi Chức Năng (PHCN)</div>
        </div>
      </div>

      {/* Zone 2: System Status & Notifications */}
      <div className="flex items-center gap-4">
        {/* Quick Notifications for Expiring & Low Stock */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            title="Thông báo cảnh báo dược phẩm"
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">Cảnh báo dược phẩm ({alertCount})</span>
                <span className="text-xs text-slate-400">FEFO Alert</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                {expiring.length === 0 && lowStock.length === 0 ? (
                  <div className="text-slate-500 py-4 text-center">Tất cả số lô và tồn kho đều an toàn.</div>
                ) : (
                  <>
                    {expiring.map(({ medicine, lot, daysUntilExpiry }) => (
                      <div
                        key={`${lot.medicineId}-${lot.batchNumber}`}
                        className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900"
                      >
                        <div className="font-semibold">{medicine.name}</div>
                        <div className="text-slate-600">
                          Lô: <span className="font-mono font-medium">{lot.batchNumber}</span> - Còn{' '}
                          <span className="font-semibold text-amber-700">{daysUntilExpiry} ngày</span> (SL: {lot.quantity}{' '}
                          {medicine.unit})
                        </div>
                      </div>
                    ))}
                    {lowStock.map(({ medicine, currentStock }) => (
                      <div
                        key={medicine.id}
                        className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-900"
                      >
                        <div className="font-semibold">{medicine.name}</div>
                        <div className="text-slate-600">
                          Tồn kho hiện tại: <span className="font-bold text-rose-600">{currentStock}</span> / Tối thiểu{' '}
                          {medicine.minStockAlert} {medicine.unit}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher for Testing & Demonstration */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800 text-xs font-medium transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>{currentUser.fullName}</span>
            <span className="text-slate-500 font-normal">({roleLabels[currentUser.role]})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1.5 text-xs text-slate-400 font-medium">Chuyển đổi vai trò người dùng (Demo):</div>
              {users
                .filter((u) => u.status === 'ACTIVE')
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-2 py-2 rounded text-xs flex items-center justify-between ${
                      currentUser.id === u.id ? 'bg-teal-50 text-teal-900 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div>{u.fullName}</div>
                      <div className="text-slate-400 text-2xs">{u.department}</div>
                    </div>
                    <span className="text-2xs text-slate-500">{roleLabels[u.role]}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Quick Reset Button for Fresh Evaluation */}
        <button
          onClick={() => {
            if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu của Trung tâm?')) {
              resetAllData();
            }
          }}
          className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          title="Khôi phục dữ liệu gốc"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
