/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GoogleSyncMode } from '../../types';
import {
  Cloud,
  FileSpreadsheet,
  FolderTree,
  FileText,
  Download,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Copy,
  AlertCircle,
  ShieldAlert,
  Link2,
  Terminal,
  Wrench,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  isValidAppsScriptUrl,
} from '../../services/appsScriptSyncService';
import { extractSpreadsheetId, GOOGLE_SAMPLE_READONLY_ID } from '../../services/googleSheetsService';
import { Modal } from '../common/Modal';

export const SyncSheetsDriveView: React.FC = () => {
  const {
    currentUser,
    hasPermission,
    syncedFiles,
    medicines,
    beneficiaries,
    receipts,
    issues,
    prescriptions,
    transactions,
    templateSettings,
    updateTemplateSettings,
    backupLogs,
    isGoogleAuthenticated,
    googleUser,
    loginWithGoogle,
    logoutFromGoogle,
    syncNowToGoogleSheets,
    testAppsScriptSync,
    isSyncingSheets,
    syncSheetsError,
    lastSheetsSyncResult,
  } = useApp();

  const [appsScriptInput, setAppsScriptInput] = useState(templateSettings.appsScriptUrl || '');
  const [sheetUrlInput, setSheetUrlInput] = useState(templateSettings.googleSheetUrl || '');
  const [driveFolderInput, setDriveFolderInput] = useState(
    templateSettings.googleDriveFolder || 'QUAN_LY_THUOC_TRUNG_TAM/2026'
  );
  const [syncMode, setSyncMode] = useState<GoogleSyncMode>(templateSettings.syncMode || 'HYBRID');

  const [testingScript, setTestingScript] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  // Strict Admin-only access guard
  if (currentUser?.role !== 'ADMIN' || !hasPermission('canManageSync')) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Chỉ Quản Trị Viên (Admin) Được Phép Truy Cập</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Tính năng cấu hình và đồng bộ dữ liệu lên Google Sheets / Google Drive được bảo vệ nghiêm ngặt cho tài khoản Quản trị viên.
        </p>
      </div>
    );
  }

  const hasValidScript = isValidAppsScriptUrl(appsScriptInput);
  const extractedSheetId = extractSpreadsheetId(sheetUrlInput);
  const isReadonlyDemoSheet = extractedSheetId === GOOGLE_SAMPLE_READONLY_ID;

  const sheetsSchema = [
    {
      name: 'Sheet Phiếu nhập',
      desc: 'Trích xuất phiếu nhập kho theo đối tượng (mỗi đối tượng 1 dòng)',
      rows: beneficiaries.length,
    },
    {
      name: 'Sheet Phiếu xuất',
      desc: 'Trích xuất phiếu xuất kho cấp phát thuốc theo đối tượng',
      rows: beneficiaries.length,
    },
    {
      name: 'Sheet Báo cáo',
      desc: 'Bảng tổng hợp Tồn đầu, Nhập, Xuất, Tồn cuối kỳ từng đối tượng',
      rows: beneficiaries.length,
    },
    { name: 'MEDICINES', desc: 'Danh mục thuốc, hoạt chất, quy cách', rows: medicines.length },
    { name: 'BENEFICIARIES', desc: 'Hồ sơ đối tượng bảo trợ và số thẻ BHYT', rows: beneficiaries.length },
    { name: 'STOCK_RECEIPTS', desc: `Chứng từ phiếu nhập kho (${templateSettings.receiptFormCode})`, rows: receipts.length },
    { name: 'STOCK_ISSUES', desc: `Chứng từ phiếu xuất kho (${templateSettings.issueFormCode})`, rows: issues.length },
    { name: 'STOCK_TRANSACTIONS', desc: 'Sổ nhật ký biến động kho Dược', rows: transactions.length },
    { name: 'FILES_DRIVE', desc: 'Bảng theo dõi chứng từ đã lưu Google Drive', rows: syncedFiles.length },
  ];

  const handleSaveConnectionSettings = () => {
    const cleanSheetUrl = isReadonlyDemoSheet ? '' : sheetUrlInput.trim();
    updateTemplateSettings({
      syncMode,
      appsScriptUrl: appsScriptInput.trim(),
      googleSheetUrl: cleanSheetUrl,
      googleSpreadsheetId: extractSpreadsheetId(cleanSheetUrl),
      googleDriveFolder: driveFolderInput.trim() || 'QUAN_LY_THUOC_TRUNG_TAM/2026',
    });
    setTestResult({
      success: true,
      message: 'Đã lưu cấu hình kênh kết nối Google Sheets & Drive!',
    });
    setTimeout(() => setTestResult(null), 4000);
  };

  const handleTestAppsScript = async () => {
    setTestingScript(true);
    setTestResult(null);
    updateTemplateSettings({
      appsScriptUrl: appsScriptInput.trim(),
      syncMode,
      googleDriveFolder: driveFolderInput.trim() || 'QUAN_LY_THUOC_TRUNG_TAM/2026',
    });
    const res = await testAppsScriptSync(appsScriptInput.trim());
    setTestingScript(false);
    if (res.success) {
      if (res.spreadsheetUrl) setSheetUrlInput(res.spreadsheetUrl);
      setTestResult({
        success: true,
        message: `Kết nối thành công tới bảng tính "${res.spreadsheetName || 'Google Sheets'}"! Dữ liệu sẵn sàng tự động đồng bộ không hết hạn phiên.`,
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Không thể kết nối tới Apps Script URL.',
      });
    }
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleTriggerSync = async () => {
    handleSaveConnectionSettings();
    setShowConfirmModal(true);
  };

  const handleConfirmSync = async () => {
    setShowConfirmModal(false);
    const result = await syncNowToGoogleSheets();
    if (result && result.success) {
      if (result.spreadsheetUrl) setSheetUrlInput(result.spreadsheetUrl);
      setSyncSuccessMessage(
        `Đồng bộ trực tiếp lên Google Sheets thành công qua ${
          result.channel === 'APPS_SCRIPT' ? 'Google Apps Script Bridge' : 'Google OAuth API'
        }! (${result.rowCounts.receipts} PNK, ${result.rowCounts.issues} PXK, ${result.rowCounts.reports} báo cáo)`
      );
      setTimeout(() => setSyncSuccessMessage(null), 7000);
    }
  };

  const currentSheetUrl =
    lastSheetsSyncResult?.spreadsheetUrl ||
    (sheetUrlInput && !isReadonlyDemoSheet ? sheetUrlInput : '') ||
    templateSettings.googleSheetUrl ||
    (templateSettings.googleSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${templateSettings.googleSpreadsheetId}/edit`
      : '');

  const handleExportAllJSON = () => {
    const backupData = {
      agency: templateSettings.agencyName,
      department: templateSettings.deptName,
      budgetCode: templateSettings.qhnsCode,
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
    <div className="space-y-6 pb-10">
      {/* Top Action & Status Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold mb-1">
            <Cloud className="w-4 h-4" />
            <span>Kiến Trúc Đồng Bộ Lai · Chỉ Quản Trị Viên (ADMIN)</span>
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            Đồng Bộ Google Sheets & Lưu Trữ Google Drive
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Kết hợp cầu nối Google Apps Script Web App (ổn định 24/7, không hết hạn token, không chặn popup iFrame) và Google OAuth API v4/Drive v3.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleExportAllJSON}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Backup (JSON)</span>
          </button>

          {currentSheetUrl && (
            <a
              href={currentSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-teal-600/30 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-teal-600" />
              <span>Mở Google Sheets</span>
            </a>
          )}

          <button
            onClick={handleTriggerSync}
            disabled={isSyncingSheets}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheets ? 'Đang đồng bộ...' : 'Đồng Bộ Lên Google Sheets'}</span>
          </button>
        </div>
      </div>

      {syncSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {syncSheetsError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Chi tiết lỗi kết nối đồng bộ:</div>
            <div className="mt-0.5">{syncSheetsError}</div>
          </div>
        </div>
      )}

      {/* Hybrid Connection Diagnostic & Setup Console */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-teal-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              Cấu Hình Kết Nối & Chẩn Đoán Kênh Đồng Bộ
            </h4>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            {(
              [
                { id: 'HYBRID', label: 'Kết hợp thông minh' },
                { id: 'APPS_SCRIPT', label: 'Chỉ Apps Script' },
                { id: 'OAUTH', label: 'Chỉ Google OAuth' },
              ] as { id: GoogleSyncMode; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setSyncMode(mode.id);
                  updateTemplateSettings({ syncMode: mode.id });
                }}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  syncMode === mode.id
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Diagnostic Signals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-2xs text-slate-500 font-medium">1. Kênh Apps Script Bridge</div>
            <div className={`font-bold mt-1 ${hasValidScript ? 'text-emerald-700' : 'text-amber-700'}`}>
              {hasValidScript ? 'Đã gắn URL hợp lệ' : 'Chưa cấu hình URL'}
            </div>
            <div className="text-3xs text-slate-500 mt-0.5">Chạy ngầm bền vững, không cần popup</div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-2xs text-slate-500 font-medium">2. Phiên Google OAuth</div>
            <div className={`font-bold mt-1 ${isGoogleAuthenticated ? 'text-emerald-700' : 'text-slate-700'}`}>
              {isGoogleAuthenticated ? 'Đang hoạt động' : 'Chưa đăng nhập phiên'}
            </div>
            <div className="text-3xs text-slate-500 mt-0.5 truncate">
              {googleUser?.email || 'Token bộ nhớ hết hạn khi tải lại trang'}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-2xs text-slate-500 font-medium">3. Google Spreadsheet ID</div>
            <div className="font-mono font-bold mt-1 text-slate-800 truncate">
              {extractedSheetId && !isReadonlyDemoSheet
                ? extractedSheetId
                : templateSettings.googleSpreadsheetId || 'Tự tạo khi đồng bộ'}
            </div>
            <div className="text-3xs text-slate-500 mt-0.5">
              {isReadonlyDemoSheet ? 'Đã lọc bỏ URL mẫu chỉ đọc' : 'Trích xuất tự động từ URL'}
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-2xs text-slate-500 font-medium">4. Lưu trữ Google Drive</div>
            <div className="font-mono font-bold mt-1 text-teal-800 truncate">
              {driveFolderInput}
            </div>
            <div className="text-3xs text-slate-500 mt-0.5">Tạo thư mục & tải tệp thực tế</div>
          </div>
        </div>

        {/* Apps Script URL + Spreadsheet URL + Drive Folder Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
          {/* Left: Apps Script Web App Setup */}
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-teal-700" />
                <span>Cầu Nối Google Apps Script Web App (Khuyên dùng)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                className="text-2xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{showScriptCode ? 'Ẩn mã nguồn .gs' : 'Xem & chép mã .gs'}</span>
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-2xs text-slate-600">
              <li>Mở bảng tính Google Sheets của đơn vị → <strong>Tiện ích mở rộng → Apps Script</strong>.</li>
              <li>Dán đoạn mã cầu nối và chọn <strong>Triển khai → Ứng dụng web (Quyền: Bất kỳ ai)</strong>.</li>
              <li>Dán đường dẫn Web App (<code>.../exec</code>) vào ô bên dưới và bấm kiểm tra.</li>
            </ol>

            <div className="flex gap-2">
              <input
                type="url"
                value={appsScriptInput}
                onChange={(e) => setAppsScriptInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 p-2 border border-slate-300 rounded-lg bg-white font-mono text-2xs focus:outline-none focus:border-teal-600"
              />
              <button
                type="button"
                onClick={handleTestAppsScript}
                disabled={testingScript || !appsScriptInput.trim()}
                className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-xs disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {testingScript ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </button>
            </div>

            {showScriptCode && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-2xs font-semibold text-slate-700">Mã nguồn Google Apps Script (Code.gs):</span>
                  <button
                    type="button"
                    onClick={handleCopyScriptCode}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-2xs font-semibold text-slate-700"
                  >
                    {copiedScript ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Đã sao chép mã .gs' : 'Sao chép toàn bộ mã'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-300 p-3 rounded-lg font-mono text-3xs max-h-56 overflow-y-auto leading-relaxed">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            )}
          </div>

          {/* Right: OAuth & Target Sheet/Drive Paths */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Thông Số Google OAuth & Thư Mục Đích</span>
              {isGoogleAuthenticated ? (
                <button
                  type="button"
                  onClick={logoutFromGoogle}
                  className="text-2xs text-rose-600 hover:underline font-semibold"
                >
                  Ngắt phiên OAuth
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="text-2xs text-teal-700 hover:underline font-semibold"
                >
                  Đăng nhập Google OAuth
                </button>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Đường dẫn Google Sheets đích (URL hoặc để trống để tự tạo mới)
              </label>
              <input
                type="text"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-2xs focus:outline-none focus:border-teal-600"
              />
              {isReadonlyDemoSheet && (
                <p className="text-3xs text-rose-600 mt-1">
                  Đường dẫn mẫu của Google không cho phép ghi dữ liệu. Vui lòng xóa để tự tạo bảng tính mới hoặc nhập URL bảng tính của bạn.
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Thư mục gốc trên Google Drive
              </label>
              <input
                type="text"
                value={driveFolderInput}
                onChange={(e) => setDriveFolderInput(e.target.value)}
                placeholder="QUAN_LY_THUOC_TRUNG_TAM/2026"
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-2xs focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveConnectionSettings}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors"
              >
                Lưu Thông Số Kết Nối
              </button>
            </div>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Two Columns: Sheets Schema vs Drive Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Google Sheets Schemas */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <h4 className="font-bold text-slate-900 text-sm">Cấu Trúc Bảng Dữ Liệu Google Sheets</h4>
            </div>
            <span className="text-2xs text-teal-700 font-semibold">Khớp chuẩn 03 Sheet chính</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {sheetsSchema.map((s) => (
              <div key={s.name} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-slate-900">{s.name}</div>
                  <div className="text-2xs text-slate-500">{s.desc}</div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="font-semibold text-slate-800">{s.rows}</span>
                  <span className="text-slate-400 text-2xs ml-1">dòng</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Google Drive Folder Structure & Files + Backup History */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">Tệp Chứng Từ Lưu Google Drive</h4>
              </div>
              <span className="text-2xs text-slate-400">Phân loại tự động theo thư mục</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {syncedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{file.fileName}</div>
                      <div className="text-2xs text-slate-400 font-mono truncate">
                        {file.docCode} · {file.driveFolder}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xs font-mono tabular-nums font-medium text-slate-500">
                      {file.fileSize}
                    </span>
                    <div className="text-3xs font-semibold">
                      {file.webViewLink ? (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Mở trên Drive</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className={file.syncedToSheets ? 'text-emerald-600' : 'text-amber-600'}>
                          {file.syncedToSheets ? 'Đã lưu Drive' : 'Chờ kết nối Drive'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-bold text-xs text-slate-800 mb-2">
              Nhật Ký Đồng Bộ Gần Nhất ({backupLogs.length})
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-2xs">
              {backupLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{log.action}</div>
                    <div className="text-slate-500 truncate">{log.details}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-bold ${
                        log.status === 'SUCCESS'
                          ? 'text-emerald-700'
                          : log.status === 'FAILED'
                          ? 'text-rose-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {log.status === 'SUCCESS' ? 'Thành công' : log.status === 'FAILED' ? 'Lỗi' : 'Chờ xử lý'}
                    </span>
                    <div className="text-3xs text-slate-400 font-mono tabular-nums">{log.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Xác nhận đồng bộ dữ liệu lên Google Sheets"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">Cập nhật đồng bộ 03 trang tính</div>
              <p className="text-amber-800 leading-relaxed">
                Dữ liệu hiện tại của <strong>Phiếu nhập</strong>, <strong>Phiếu xuất</strong> và <strong>Báo cáo</strong> sẽ được ghi lên Google Sheets thông qua kênh{' '}
                <strong>{hasValidScript ? 'Google Apps Script Bridge' : 'Google OAuth API'}</strong>.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmSync}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Xác nhận đồng bộ ngay</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
