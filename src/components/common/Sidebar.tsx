/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PackagePlus, PackageMinus, FileSpreadsheet, Sliders } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { receipts, issues } = useApp();

  const menuItems = [
    {
      id: 'stock-receipts',
      label: 'Phiếu Nhập',
      fullLabel: 'Phiếu Nhập Kho (C20-HD)',
      icon: PackagePlus,
      badge: `${receipts.length}`,
    },
    {
      id: 'stock-issues',
      label: 'Phiếu Xuất',
      fullLabel: 'Phiếu Xuất Kho (C21-HD)',
      icon: PackageMinus,
      badge: `${issues.length}`,
    },
    {
      id: 'beneficiary-report',
      label: 'Báo Cáo',
      fullLabel: 'Báo Cáo Nhập Xuất Tồn BHYT',
      icon: FileSpreadsheet,
    },
    {
      id: 'template-settings',
      label: 'Cấu Hình Mặc Định',
      fullLabel: 'Hiệu Chỉnh Biểu Mẫu Mặc Định',
      icon: Sliders,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 select-none border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-base border border-teal-500/30">
          BT
        </div>
        <div>
          <div className="text-xs font-bold text-white tracking-wide uppercase">Biểu Mẫu Kho Dược</div>
          <div className="text-2xs text-slate-400">TT Bảo Trợ Xã Hội Đà Nẵng</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2">
        <div className="px-3 mb-3 text-2xs font-semibold tracking-wider text-slate-400 uppercase">
          Biểu Mẫu Nghiệp Vụ
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-teal-400'}`} />
                <div className="text-left">
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className={`text-2xs ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                    {item.fullLabel}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-2xs font-mono font-bold ${
                    isActive ? 'bg-white text-teal-800' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-2xs text-slate-400 space-y-1">
        <div className="flex justify-between items-center">
          <span>Mã QHNS: 1041008</span>
          <span className="text-teal-400 font-semibold">Khổ A4 Chuẩn</span>
        </div>
        <div className="text-slate-500">Phòng Y Tế - Phục Hồi Chức Năng</div>
      </div>
    </aside>
  );
};
