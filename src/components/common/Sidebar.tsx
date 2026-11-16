/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  PackagePlus,
  PackageMinus,
  FileSpreadsheet,
  Sliders,
  Users,
  ShieldAlert,
  Cloud,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { receipts, issues, users, currentUser, hasPermission, templateSettings } = useApp();

  const pendingUsersCount = users.filter((u) => u.status === 'PENDING_APPROVAL').length;
  const canManageSync = currentUser?.role === 'ADMIN' && hasPermission('canManageSync');

  const menuItems = [
    {
      id: 'stock-receipts',
      label: 'Phiếu Nhập',
      fullLabel: `Phiếu Nhập Kho (${templateSettings.receiptFormCode.replace('Mẫu số:', '').trim() || 'C20-HD'})`,
      icon: PackagePlus,
      countText: `${receipts.length}`,
    },
    {
      id: 'stock-issues',
      label: 'Phiếu Xuất',
      fullLabel: `Phiếu Xuất Kho (${templateSettings.issueFormCode.replace('Mẫu số:', '').trim() || 'C21-HD'})`,
      icon: PackageMinus,
      countText: `${issues.length}`,
    },
    {
      id: 'beneficiary-report',
      label: 'Báo Cáo',
      fullLabel: 'Báo Cáo Nhập Xuất Tồn BHYT',
      icon: FileSpreadsheet,
    },
    {
      id: 'users',
      label: 'Phân Quyền & Cán Bộ',
      fullLabel: 'Quản Lý Người Dùng & Vai Trò',
      icon: Users,
      countText: pendingUsersCount > 0 ? `${pendingUsersCount} chờ` : undefined,
      highlightAmber: pendingUsersCount > 0,
    },
    {
      id: 'template-settings',
      label: 'Cấu Hình Mặc Định',
      fullLabel: 'Hiệu Chỉnh Biểu Mẫu Mặc Định',
      icon: Sliders,
    },
    ...(canManageSync
      ? [
          {
            id: 'sync',
            label: 'Đồng Bộ Sheets & Drive',
            fullLabel: 'Sao Lưu Google Workspace (Admin)',
            icon: Cloud,
          },
        ]
      : []),
    {
      id: 'audit',
      label: 'Nhật Ký Kiểm Toán',
      fullLabel: 'Giám Sát Truy Vết & Thao Tác',
      icon: ShieldAlert,
    },
  ];

  const handleSelectItem = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const renderSidebarBody = (isDrawer: boolean) => (
    <>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
            className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-base border border-teal-500/30 shrink-0"
          >
            BT
          </motion.div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider truncate">
              {templateSettings.parentOrg}
            </div>
            <div className="text-xs font-bold text-white tracking-wide truncate mt-0.5">
              {templateSettings.agencyName}
            </div>
          </div>
        </div>
        {isDrawer && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 lg:hidden"
            aria-label="Đóng menu điều hướng"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-2xs font-semibold tracking-wide text-slate-400">
          Biểu Mẫu Nghiệp Vụ
        </div>

        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => handleSelectItem(item.id)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ x: isActive ? 0 : 4 }}
              whileTap={{ scale: 0.975 }}
              className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/75'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={isDrawer ? 'sidebar-active-pill-mobile' : 'sidebar-active-pill'}
                  transition={{ type: 'spring', stiffness: 390, damping: 28 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 shadow-[0_6px_18px_rgba(20,184,166,0.32)]"
                />
              )}

              <div className="relative z-10 flex items-center gap-3 min-w-0">
                <motion.span
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                  className="shrink-0"
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-teal-400'}`} />
                </motion.span>
                <div className="text-left min-w-0">
                  <div className="font-semibold text-sm truncate">{item.label}</div>
                  <div className={`text-2xs truncate ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                    {item.fullLabel}
                  </div>
                </div>
              </div>

              {item.countText && (
                <span
                  className={`relative z-10 text-2xs font-mono tabular-nums font-semibold shrink-0 ml-2 ${
                    isActive
                      ? 'text-white'
                      : item.highlightAmber
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {item.countText}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-2xs text-slate-400 space-y-1">
        <div className="flex justify-between items-center">
          <span className="font-mono tabular-nums">Mã QHNS: {templateSettings.qhnsCode}</span>
          <span className="text-teal-400 font-semibold">Khổ A4 Chuẩn</span>
        </div>
        <div className="text-slate-500 truncate">{templateSettings.deptName}</div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Docked Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 select-none border-r border-slate-800">
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile & Tablet Slide-over Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              className="relative z-10 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col h-full select-none border-r border-slate-800 shadow-2xl"
            >
              {renderSidebarBody(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
