import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  Building2,
  ShieldCheck,
  ChevronDown,
  Clock,
  LogOut,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onToggleMobileSidebar?: () => void;
}

const formatCountdown = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const POPOVER_EASE = [0.16, 1, 0.3, 1] as const;

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const {
    currentUser,
    logoutApp,
    getExpiringLots,
    getLowStockMedicines,
    remainingSessionSeconds,
    templateSettings,
  } = useApp();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const expiring = getExpiringLots(60);
  const lowStock = getLowStockMedicines();
  const alertCount = expiring.length + lowStock.length;
  const isSessionLow = remainingSessionSeconds <= 300;

  const parentOrgTitle = templateSettings.parentOrg || 'SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG';
  const centerTitle = /đà\s*nẵng/i.test(templateSettings.agencyName)
    ? templateSettings.agencyName
    : `${templateSettings.agencyName} ĐÀ NẴNG`;

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
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-30 select-none">
      {/* Zone 1: Mobile Menu Trigger + Sở Y tế TP Đà Nẵng ON TOP of Trung tâm Bảo trợ xã hội Đà Nẵng */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <motion.div
          whileHover={{ scale: 1.08, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs"
        >
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.div>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-bold text-teal-700 uppercase tracking-wider truncate">
            {parentOrgTitle}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight uppercase whitespace-nowrap truncate">
              {centerTitle}
            </span>
            <span className="hidden lg:inline text-xs text-slate-400 font-mono whitespace-nowrap">
              | Mã QHNS: {templateSettings.qhnsCode}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Session Timeout Countdown, Notifications, User Role & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Session Inactivity Countdown */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono tabular-nums transition-colors ${
            isSessionLow
              ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
          title="Hệ thống tự động đăng xuất nếu không thao tác sau 60 phút"
        >
          <Clock className={`w-3.5 h-3.5 ${isSessionLow ? 'text-amber-600' : 'text-teal-600'}`} />
          <span>Phiên: {formatCountdown(remainingSessionSeconds)}</span>
        </motion.div>

        {/* Quick Notifications for Expiring & Low Stock */}
        <div className="relative">
          <motion.button
            animate={
              alertCount > 0
                ? { rotate: [0, -10, 10, -8, 8, 0] }
                : undefined
            }
            transition={
              alertCount > 0
                ? { duration: 0.7, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }
                : undefined
            }
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowRoleMenu(false);
            }}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            title="Thông báo cảnh báo dược phẩm"
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </motion.button>

          <AnimatePresence>
            {showNotificationMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18, ease: POPOVER_EASE }}
                className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 origin-top-right"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-800 text-xs font-medium transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="hidden sm:inline font-semibold max-w-[140px] truncate">{currentUser.fullName}</span>
            <span className={`hidden md:inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${roleBadgeStyles[currentUser.role]}`}>
              {roleLabels[currentUser.role]}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                showRoleMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {showRoleMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18, ease: POPOVER_EASE }}
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 divide-y divide-slate-100 origin-top-right"
              >
                <div className="px-3 py-3 text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{currentUser.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{currentUser.email}</div>
                  <div className="text-[11px] text-teal-700 font-medium">{currentUser.department}</div>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${roleBadgeStyles[currentUser.role]}`}>
                      {roleLabels[currentUser.role]}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">
                      Còn {formatCountdown(remainingSessionSeconds)}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Logout Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => logoutApp()}
          className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
};
