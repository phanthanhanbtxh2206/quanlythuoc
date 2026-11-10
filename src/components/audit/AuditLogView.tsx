/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { History, Search, Shield, Filter } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Sổ Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận toàn bộ thao tác thêm mới thuốc, lập phiếu nhập, xuất kho, cấp phát và phê duyệt chứng từ nhằm đảm
            bảo tính minh bạch và an toàn dữ liệu
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, hành vi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase text-2xs font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Thời gian</th>
              <th className="py-2.5 px-4">Người thực hiện</th>
              <th className="py-2.5 px-4">Hành vi</th>
              <th className="py-2.5 px-4">Đối tượng tác động</th>
              <th className="py-2.5 px-4">Chi tiết thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString('vi-VN')}
                </td>
                <td className="py-2.5 px-4 font-bold text-slate-900">{log.userName}</td>
                <td className="py-2.5 px-4">
                  <span className="font-mono text-2xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-700">
                  {log.entity}: {log.entityId}
                </td>
                <td className="py-2.5 px-4 text-slate-600">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
