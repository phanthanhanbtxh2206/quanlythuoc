/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cloud,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Copy,
  BookOpen,
  RefreshCw,
  LogOut,
  AlertCircle,
  Link2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { BACKUP_GUIDE_MARKDOWN, downloadBackupGuideFile } from '../../utils/backupGuideContent';
import { isValidAppsScriptUrl } from '../../services/appsScriptSyncService';

export const GoogleSyncGuidanceBar: React.FC = () => {
  const {
    currentUser,
    hasPermission,
    templateSettings,
    updateTemplateSettings,
    exportFullGoogleSheetData,
    exportFullGoogleSheetCSV,
    backupLogs,
    isGoogleAuthenticated,
    googleUser,
    loginWithGoogle,
    logoutFromGoogle,
    syncNowToGoogleSheets,
    isSyncingSheets,
    syncSheetsError,
    lastSheetsSyncResult,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'fulltext'>('visual');
  const [copied, setCopied] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // Strict ADMIN-only visibility guard
  if (currentUser?.role !== 'ADMIN' || !hasPermission('canManageSync')) {
    return null;
  }

  const hasAppsScript = isValidAppsScriptUrl(templateSettings.appsScriptUrl);
  const isReadyToSync = hasAppsScript || isGoogleAuthenticated;

  const handleConnectGoogle = async () => {
    const res = await loginWithGoogle();
    if (res.success) {
      setSyncSuccessToast('Kết nối Google Sheets thành công và đã tự động đồng bộ dữ liệu!');
      setTimeout(() => setSyncSuccessToast(null), 5000);
    }
  };

  const handleRequestSync = () => {
    if (!isReadyToSync) {
      handleConnectGoogle();
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSync = async () => {
    setShowConfirmModal(false);
    const result = await syncNowToGoogleSheets();
    if (result && result.success) {
      setSyncSuccessToast(
        `Đồng bộ lên Google Sheets thành công! (${result.rowCounts.receipts} PNK, ${result.rowCounts.issues} PXK, ${result.rowCounts.reports} báo cáo)`
      );
      setTimeout(() => setSyncSuccessToast(null), 5000);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(BACKUP_GUIDE_MARKDOWN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentSheetUrl =
    lastSheetsSyncResult?.spreadsheetUrl ||
    templateSettings.googleSheetUrl ||
    (templateSettings.googleSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${templateSettings.googleSpreadsheetId}/edit`
      : 'https://docs.google.com/spreadsheets');

  return (
    <>
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl mb-5 overflow-hidden transition-all">
        <div className="px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
          {/* Status Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
              {isSyncingSheets ? (
                <RefreshCw className="w-4 h-4 animate-spin text-teal-100" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-slate-900">
                  Đồng Bộ Google Sheets & Drive (Admin)
                </span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                {hasAppsScript ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <Link2 className="w-3.5 h-3.5" />
                    Apps Script Bridge sẵn sàng
                  </span>
                ) : isGoogleAuthenticated ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    OAuth: {googleUser?.email || templateSettings.googleUserEmail}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Chưa gắn Apps Script hoặc OAuth
                  </span>
                )}
              </div>
              <div className="text-2xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="truncate max-w-md">
                  {templateSettings.lastBackupMessage || 'Sẵn sàng tự động sao lưu dữ liệu'}
                </span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-600 font-medium">
                  {templateSettings.lastBackupTime || 'Chưa đồng bộ'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!isReadyToSync ? (
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                title="Đăng nhập tài khoản Google để kết nối OAuth"
              >
                <Cloud className="w-3.5 h-3.5 text-teal-600" />
                <span>Kết nối Google OAuth</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleRequestSync}
                  disabled={isSyncingSheets}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheets'}</span>
                </button>

                {currentSheetUrl && currentSheetUrl !== 'https://docs.google.com/spreadsheets' && (
                  <a
                    href={currentSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-600/30 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                    <span>Mở Sheets</span>
                  </a>
                )}
              </>
            )}

            <button
              onClick={() => {
                setActiveTab('visual');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
              <span>Hướng dẫn</span>
            </button>

            <button
              onClick={exportFullGoogleSheetData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất 03 Sheet (.xlsx)</span>
            </button>

            {isGoogleAuthenticated && (
              <button
                onClick={logoutFromGoogle}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Đăng xuất phiên Google OAuth"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {syncSuccessToast && (
          <div className="px-4 py-2 bg-emerald-700 text-white text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{syncSuccessToast}</span>
            </div>
            {currentSheetUrl && (
              <a
                href={currentSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="underline font-bold text-emerald-100 hover:text-white inline-flex items-center gap-1 ml-4"
              >
                <span>Mở Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {syncSheetsError && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{syncSheetsError}</span>
          </div>
        )}

        {isExpanded && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Kênh Đồng Bộ Hiện Tại</span>
              </div>
              <p className="text-2xs text-slate-500">
                Chế độ: <strong>{templateSettings.syncMode}</strong> · Kênh gần nhất:{' '}
                <strong>{templateSettings.lastSyncChannel || 'Chưa chạy'}</strong>
              </p>
              {templateSettings.googleSheetUrl && (
                <a
                  href={templateSettings.googleSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-2xs text-teal-700 font-medium hover:underline inline-flex items-center gap-1"
                >
                  <span>Mở bảng tính liên kết</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>Thư Mục Google Drive</span>
              </div>
              <p className="text-2xs text-slate-500">
                Tự động lưu chứng từ theo cây thư mục năm và phân loại chứng từ.
              </p>
              <div className="font-mono text-3xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
                {templateSettings.googleDriveFolder}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-teal-600" />
                <span>Nhật Ký Đồng Bộ Gần Nhất</span>
              </div>
              <p className="text-2xs text-slate-500">
                {backupLogs[0]?.details || 'Sẵn sàng ghi vết tự động mọi biến động kho.'}
              </p>
              <div className="text-3xs text-slate-400 font-mono tabular-nums">
                Tổng cộng {backupLogs.length} lần ghi nhận
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guidance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Hướng Dẫn Tự Động Sao Lưu Google Sheets & Google Drive (Dành Riêng Cho Admin)"
        subtitle="Cơ chế đồng bộ kết hợp Apps Script Bridge và Google OAuth cho Trung tâm BTXH Đà Nẵng"
        maxWidth="5xl"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setActiveTab('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                  activeTab === 'visual'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Sơ đồ & Cấu trúc bảng</span>
              </button>

              <button
                onClick={() => setActiveTab('fulltext')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                  activeTab === 'fulltext'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Toàn văn tài liệu hướng dẫn</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-2xs transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép văn bản'}</span>
              </button>

              <button
                onClick={downloadBackupGuideFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File .MD Về Máy</span>
              </button>
            </div>
          </div>

          {activeTab === 'visual' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200">
                <h3 className="text-sm font-bold text-teal-900 mb-1.5">
                  1. Cơ Chế Kết Hợp Apps Script Bridge + Google OAuth
                </h3>
                <p className="text-teal-950/80 leading-relaxed">
                  Khi Quản trị viên gắn URL Google Apps Script Web App trong phân hệ <strong>Đồng Bộ Sheets & Drive</strong>, mọi giao dịch nhập/xuất kho sẽ tự động đẩy lên 3 trang tính mà không bị chặn popup iFrame hay hết hạn token 60 phút.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  2. Cấu Trúc 03 Sheet Chuẩn (Mỗi Tên Đối Tượng Một Dòng)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-2xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="font-bold text-teal-900 font-mono block border-b border-slate-200 pb-1">
                      1. Sheet "Phiếu nhập"
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Mỗi đối tượng nằm trên 1 dòng gồm số phiếu PNK, ngày nhập, hóa đơn, thuốc thực nhập và thành tiền.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="font-bold text-blue-900 font-mono block border-b border-slate-200 pb-1">
                      2. Sheet "Phiếu xuất"
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Mỗi đối tượng nằm trên 1 dòng gồm số phiếu PXK, ngày xuất, người nhận, lý do và giá trị xuất kho.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="font-bold text-emerald-900 font-mono block border-b border-slate-200 pb-1">
                      3. Sheet "Báo cáo"
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      Tổng hợp Tồn đầu kỳ, Nhập trong kỳ, Tổng nhập, Xuất trong kỳ, Tồn cuối kỳ theo từng đối tượng BHYT.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">Tải Tệp Dữ Liệu 03 Sheet Thủ Công:</div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    Hỗ trợ định dạng Excel (.XLSX) hoặc CSV chuẩn UTF-8.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      exportFullGoogleSheetCSV();
                      setIsModalOpen(false);
                    }}
                    className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải CSV (03 Sheet)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportFullGoogleSheetData();
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Tải Excel (.XLSX)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-5 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed font-mono text-slate-700">
              {BACKUP_GUIDE_MARKDOWN}
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Modal Before Mutating Google Sheets */}
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
              <div className="font-bold text-amber-900 mb-1">Xác nhận cập nhật dữ liệu Google Spreadsheet</div>
              <p className="leading-relaxed text-amber-800">
                Hệ thống sẽ cập nhật đồng bộ 03 trang tính (<strong>Phiếu nhập</strong>, <strong>Phiếu xuất</strong>, <strong>Báo cáo</strong>) qua kênh{' '}
                <strong>{hasAppsScript ? 'Google Apps Script Bridge' : googleUser?.email || 'Google OAuth API'}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="confirmAutoSync"
              checked={templateSettings.autoBackupEnabled}
              onChange={(e) => updateTemplateSettings({ autoBackupEnabled: e.target.checked })}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="confirmAutoSync" className="text-slate-700 cursor-pointer font-medium">
              Duy trì tự động đồng bộ mỗi khi Admin phát sinh chứng từ mới
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmSync}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Xác nhận & Đồng bộ ngay</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
