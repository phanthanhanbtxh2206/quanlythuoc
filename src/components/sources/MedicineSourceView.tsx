/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Coins, CheckCircle, Info } from 'lucide-react';

export const MedicineSourceView: React.FC = () => {
  const { sources, receipts } = useApp();

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Danh Mục Nguồn Kinh Phí & Nguồn Thuốc</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân loại nguồn gốc thuốc phục vụ hạch toán chứng từ kế toán và lập Bảng tổng hợp đối tượng BHYT
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map((src) => {
          const count = receipts.filter((r) => r.sourceType === src.type).length;
          const totalSpent = receipts
            .filter((r) => r.sourceType === src.type)
            .reduce((sum, r) => sum + r.totalAmount, 0);

          return (
            <div
              key={src.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{src.name}</h4>
                    <span className="text-2xs font-mono text-slate-400 font-semibold">{src.code}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{src.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs flex justify-between items-center text-slate-500">
                <span>
                  Phát sinh: <strong className="text-slate-800">{count}</strong> phiếu nhập
                </span>
                <span className="font-mono font-bold text-teal-700">{totalSpent.toLocaleString()} ₫</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
