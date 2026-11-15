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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
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

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 select-none border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-base border border-teal-500/30">
          BT
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white tracking-wide truncate">Biểu Mẫu Kho Dược</div>
          <div className="text-2xs text-slate-400 truncate">{templateSettings.agencyName}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-2xs font-semibold tracking-wide text-slate-400">
          Biểu Mẫu Nghiệp Vụ
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-teal-400'}`} />
                <div className="text-left min-w-0">
                  <div className="font-semibold text-sm truncate">{item.label}</div>
                  <div className={`text-2xs truncate ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                    {item.fullLabel}
                  </div>
                </div>
              </div>

              {item.countText && (
                <span
                  className={`text-2xs font-mono tabular-nums font-semibold shrink-0 ml-2 ${
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
            </button>
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
    </aside>
  );
};
