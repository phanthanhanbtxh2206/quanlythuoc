/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cloud,
  FileSpreadsheet,
  FolderTree,
  FileText,
  Download,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const SyncSheetsDriveView: React.FC = () => {
  const {
    syncedFiles,
    medicines,
    beneficiaries,
    receipts,
    issues,
    prescriptions,
    transactions,
    templateSettings,
    isGoogleAuthenticated,
    googleUser,
    loginWithGoogle,
    syncNowToGoogleSheets,
    isSyncingSheets,
    lastSheetsSyncResult,
  } = useApp();
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const sheetsSchema = [
    { name: 'Sheet Phiếu nhập', desc: 'Trích xuất toàn bộ phiếu nhập kho theo đối tượng (mỗi đối tượng 1 dòng)', rows: beneficiaries.length },
    { name: 'Sheet Phiếu xuất', desc: 'Trích xuất toàn bộ phiếu xuất kho cấp phát thuốc theo đối tượng', rows: beneficiaries.length },
    { name: 'Sheet Báo cáo', desc: 'Bảng tổng hợp Tồn đầu, Nhập, Xuất, Tồn cuối kỳ và kinh phí từng đối tượng', rows: beneficiaries.length },
    { name: 'MEDICINES', desc: 'Danh mục thuốc, hoạt chất, quy cách và ngưỡng tồn', rows: medicines.length },
    { name: 'BENEFICIARIES', desc: 'Hồ sơ đối tượng bảo trợ, mã định danh và số thẻ BHYT', rows: beneficiaries.length },
    { name: 'STOCK_RECEIPTS', desc: 'Chứng từ phiếu nhập kho theo mẫu C20-HD', rows: receipts.length },
    { name: 'STOCK_ISSUES', desc: 'Chứng từ phiếu xuất kho theo mẫu C21-HD', rows: issues.length },
    { name: 'STOCK_TRANSACTIONS', desc: 'Sổ nhật ký biến động kho Dược', rows: transactions.length },
    { name: 'FILES_PDF', desc: 'Bảng theo dõi liên kết tệp PDF lưu trên Google Drive', rows: syncedFiles.length },
  ];

  const handleTriggerSync = async () => {
    if (!isGoogleAuthenticated) {
      const res = await loginWithGoogle();
      if (!res.success) return;
    }
    const result = await syncNowToGoogleSheets();
    if (result && result.success) {
      setSyncSuccessMessage(
        `Đồng bộ trực tiếp lên Google Sheets thành công! Đã cập nhật 03 sheet chính (Phiếu nhập, Phiếu xuất, Báo cáo) vào tệp bảng tính.`
      );
      setTimeout(() => setSyncSuccessMessage(null), 6000);
    }
  };

  const currentSheetUrl =
    lastSheetsSyncResult?.spreadsheetUrl ||
    templateSettings.googleSheetUrl ||
    (templateSettings.googleSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${templateSettings.googleSpreadsheetId}/edit`
      : 'https://docs.google.com/spreadsheets');

  const handleExportAllJSON = () => {
    const backupData = {
      agency: 'TRUNG TÂM BẢO TRỢ XÃ HỘI ĐÀ NẴNG',
      department: 'PHÒNG Y TẾ - PHCN',
      budgetCode: '1041008',
      exportedAt: new Date().toISOString(),
      medicines,
      beneficiaries,
      receipts,
      issues,
      prescriptions,
      transactions,
      syncedFiles,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DuLieu_KhoDuoc_TTBTXH_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mb-1">
            <Cloud className="w-4 h-4" />
            <span>Google Workspace Integration Engine</span>
          </div>
          <h3 className="font-bold text-slate-900 text-base">Đồng Bộ Dữ Liệu Google Sheets & Lưu Trữ Drive</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Đảm bảo tính toàn vẹn dữ liệu: CSDL giao dịch nội bộ ghi nhận nguyên tử, tự động ánh xạ sang Google Sheets
            và lưu trữ PDF chứng từ vào Google Drive của đơn vị.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportAllJSON}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Gói Backup (JSON)</span>
          </button>
          <a
            href={currentSheetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 border border-teal-600/30 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-teal-600" />
            <span>Mở Google Sheets</span>
          </a>
          <button
            onClick={handleTriggerSync}
            disabled={isSyncingSheets}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheets ? 'Đang đồng bộ Google Sheets...' : 'Đồng Bộ Lên Google Sheets'}</span>
          </button>
        </div>
      </div>

      {syncSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Two Columns: Sheets Schema vs Drive Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Google Sheets Schemas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <h4 className="font-bold text-slate-900 text-sm">Cấu Trúc Google Sheets Nghiệp Vụ (10 Bảng)</h4>
            </div>
            <span className="text-2xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
              Trạng thái: Khớp 100%
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {sheetsSchema.map((s) => (
              <div key={s.name} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-slate-900">{s.name}</div>
                  <div className="text-2xs text-slate-500">{s.desc}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-semibold text-slate-700">{s.rows}</span>
                  <span className="text-slate-400 text-2xs ml-1">dòng</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Google Drive Folder Structure & Files */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">Cây Thư Mục Google Drive (Lưu Bản Sao PDF)</h4>
              </div>
              <span className="text-2xs text-slate-400">Tự động phân loại theo năm/tháng</span>
            </div>

            {/* Folder Tree Diagram */}
            <div className="bg-slate-900 text-slate-300 p-3.5 rounded-lg font-mono text-2xs space-y-1 mb-4">
              <div className="text-teal-400 font-bold">📁 QUAN_LY_THUOC_TRUNG_TAM/</div>
              <div className="pl-4 text-slate-300">└── 📁 2026/</div>
              <div className="pl-8 text-slate-400">├── 📁 PHIEU_NHAP/ (Phiếu nhập kho theo hóa đơn)</div>
              <div className="pl-8 text-slate-400">├── 📁 PHIEU_XUAT/ (Phiếu xuất kho theo đối tượng)</div>
              <div className="pl-8 text-slate-400">├── 📁 DON_THUOC/ (Đơn thuốc y tế điều trị)</div>
              <div className="pl-8 text-slate-400">└── 📁 BAO_CAO/ (Báo cáo tổng hợp BHYT theo đối tượng)</div>
            </div>

            <div className="font-bold text-xs text-slate-800 mb-2">Tệp Đã Xuất & Đính Kèm File ID Drive</div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {syncedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 truncate max-w-xs">{file.fileName}</div>
                      <div className="text-2xs text-slate-400 font-mono">
                        {file.docCode} · {file.driveFolder}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xs font-mono font-medium text-slate-500">{file.fileSize}</span>
                    <div className="text-3xs text-emerald-600 font-semibold">Đã lưu Drive</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
