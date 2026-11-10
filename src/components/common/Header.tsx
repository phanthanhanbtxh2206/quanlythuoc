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
  LogOut,
  Crown,
  Pill,
  Stethoscope,
  Calculator,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const { currentUser, users, setCurrentUser, logoutApp, getExpiringLots, getLowStockMedicines, resetAllData } = useApp();
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

  const roleBadgeStyles: Record<UserRole, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    PHARMACIST: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    DOCTOR: 'bg-blue-100 text-blue-700 border-blue-200',
    ACCOUNTANT: 'bg-amber-100 text-amber-800 border-amber-200',
    LEADER: 'bg-indigo-100 text-indigo-700 border-indigo-200',
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

      {/* Zone 2: System Status, Notifications, User Role & Logout */}
      <div className="flex items-center gap-3">
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

        {/* User Role Switcher & Profile */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800 text-xs font-medium transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="font-semibold">{currentUser.fullName}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${roleBadgeStyles[currentUser.role]}`}>
              {roleLabels[currentUser.role]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
              <div className="px-3 py-3 text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">{currentUser.fullName}</div>
                <div className="text-[11px] text-slate-500 font-mono">{currentUser.email}</div>
                <div className="text-[11px] text-teal-700 font-medium">{currentUser.department}</div>
                <div className="pt-1">
                  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${roleBadgeStyles[currentUser.role]}`}>
                    {roleLabels[currentUser.role]}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    logoutApp();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Đăng Xuất Khỏi Hệ Thống</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Logout Button */}
        <button
          onClick={logoutApp}
          className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>

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

