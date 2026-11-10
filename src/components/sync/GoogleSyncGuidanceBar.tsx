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
  FolderSync,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Printer,
  Copy,
  BookOpen,
  RefreshCw,
  LogOut,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { BACKUP_GUIDE_MARKDOWN, downloadBackupGuideFile } from '../../utils/backupGuideContent';

export const GoogleSyncGuidanceBar: React.FC = () => {
  const {
    templateSettings,
    updateTemplateSettings,
    triggerAutoBackup,
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

  const handleConnectGoogle = async () => {
    const res = await loginWithGoogle();
    if (res.success) {
      setSyncSuccessToast('Kết nối Google Sheets thành công và đã tự động đồng bộ dữ liệu!');
      setTimeout(() => setSyncSuccessToast(null), 5000);
    }
  };

  const handleRequestSync = () => {
    if (!isGoogleAuthenticated) {
      handleConnectGoogle();
      return;
    }
    // Show confirmation dialog before mutating Google Spreadsheet data
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
      {/* Top Banner: Auto-backup Status & Quick Actions */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-xl mb-5 overflow-hidden transition-all">
        <div className="px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-gradient-to-r from-teal-50/70 via-white to-blue-50/50">
          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                {isSyncingSheets ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-100" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
              </div>
              {templateSettings.autoBackupEnabled && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 tracking-tight">
                  Tự Động Đồng Bộ Google Sheets:
                </span>
                {isGoogleAuthenticated ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Đã liên kết ({googleUser?.email || templateSettings.googleUserEmail || 'Google Account'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Chưa đăng nhập Google
                  </span>
                )}
              </div>
              <div className="text-2xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{templateSettings.lastBackupMessage || 'Sẵn sàng tự động sao lưu dữ liệu'}</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-600 font-medium">
                  {templateSettings.lastBackupTime || 'Chưa đồng bộ'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Google Authentication / Sync Button */}
            {!isGoogleAuthenticated ? (
              <button
                onClick={handleConnectGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-xs"
                title="Đăng nhập tài khoản Google để tự động đồng bộ lên Google Sheets"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Kết nối Google Sheets</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleRequestSync}
                  disabled={isSyncingSheets}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                  title="Đồng bộ toàn bộ số liệu 3 sheet lên Google Sheets của bạn"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Đang đồng bộ...' : 'Đồng bộ Google Sheets'}</span>
                </button>

                <a
                  href={currentSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-600/30 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors shadow-xs"
                  title="Mở bảng tính Google Sheets trực tuyến"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                  <span>Mở Google Sheets</span>
                </a>
              </>
            )}

            <button
              onClick={() => {
                setActiveTab('visual');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-teal-500 hover:bg-teal-50/60 text-slate-700 hover:text-teal-800 text-xs font-semibold transition-all shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
              <span>Hướng dẫn sao lưu</span>
            </button>

            <button
              onClick={exportFullGoogleSheetData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
              title="Tải về file Excel 03 Sheet tương thích trực tiếp Google Sheets (Mỗi đối tượng 1 dòng)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất File 03 Sheet (.xlsx)</span>
            </button>

            {isGoogleAuthenticated && (
              <button
                onClick={logoutFromGoogle}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Đăng xuất tài khoản Google"
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

        {/* Sync Success Notification Toast */}
        {syncSuccessToast && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{syncSuccessToast}</span>
            </div>
            <a
              href={currentSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="underline font-bold text-emerald-100 hover:text-white inline-flex items-center gap-1 ml-4"
            >
              <span>Xem ngay trên Google Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Sync Error Toast */}
        {syncSheetsError && (
          <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{syncSheetsError}</span>
          </div>
        )}

        {/* Collapsible Details Drawer */}
        {isExpanded && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-150">
            <div className="space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Google Sheets Liên Kết</span>
              </div>
              <p className="text-2xs text-slate-500">
                Lưu trữ toàn bộ danh mục thuốc, đối tượng, phiếu nhập, phiếu xuất và sổ giao dịch kho.
              </p>
              <a
                href={templateSettings.googleSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-2xs text-teal-700 font-medium hover:underline inline-flex items-center gap-1"
              >
                <span>Mở bảng tính Google Sheets mẫu</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>Thư Mục Google Drive</span>
              </div>
              <p className="text-2xs text-slate-500">
                Tự động lưu bản sao PDF các phiếu nhập kho C20-HD, phiếu xuất C21-HD và báo cáo tổng hợp.
              </p>
              <div className="font-mono text-3xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
                {templateSettings.googleDriveFolder}
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-teal-600" />
                <span>Nhật Ký Tự Động Gần Nhất</span>
              </div>
              <p className="text-2xs text-slate-500">
                {backupLogs[0]?.details || 'Sẵn sàng ghi vết tự động mọi biến động kho.'}
              </p>
              <div className="text-3xs text-slate-400">
                Tổng cộng {backupLogs.length} lần sao lưu đã ghi nhận.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Modal: Step-by-Step Guidance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tài Liệu Hướng Dẫn Chi Tiết Tự Động Sao Lưu Google Sheet & Drive"
        subtitle="Quy trình vận hành, cấu trúc lưu trữ và hướng dẫn đồng bộ dữ liệu kho dược Trung tâm BTXH Đà Nẵng"
        maxWidth="5xl"
      >
        <div className="space-y-4 text-xs text-slate-700">
          {/* Action & Tab Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                onClick={() => setActiveTab('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                  activeTab === 'visual'
                    ? 'bg-teal-600 text-white shadow-xs'
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
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Toàn văn tài liệu hướng dẫn (8 phần)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-2xs transition-colors shadow-2xs"
                title="Sao chép nội dung tài liệu vào bộ nhớ tạm"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép văn bản'}</span>
              </button>

              <button
                onClick={downloadBackupGuideFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-2xs transition-colors shadow-xs"
                title="Tải file HUONG_DAN_CHI_TIET_SAO_LUU_GOOGLE_SHEET_VA_DRIVE.md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File .MD Về Máy</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Visual Structure */}
          {activeTab === 'visual' ? (
            <div className="space-y-4">
              {/* Card 1: How Auto-Backup Works */}
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200">
                <h3 className="text-sm font-bold text-teal-900 mb-1.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  1. Nguyên Lý Tự Động Sao Lưu (Auto-sync Background Engine)
                </h3>
                <p className="text-teal-950/80 leading-relaxed">
                  Hệ thống được thiết kế với cơ chế <strong>tự động sao lưu ngầm tức thời</strong>: Mỗi khi bạn thực hiện
                  thao tác <strong>Lập phiếu nhập kho</strong>, <strong>Lập phiếu xuất kho</strong>, <strong>Hiệu chỉnh nội dung chứng từ</strong> hoặc <strong>Xóa chứng từ</strong>, hệ thống tự động:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-teal-900 font-medium">
                  <li>Cập nhật hàng đợi đồng bộ với số liệu thực tế mới nhất.</li>
                  <li>Tạo bản ghi kiểm toán (Audit Trail) có thời gian, tên người thực hiện và số tiền.</li>
                  <li>Cập nhật trạng thái thành công lên thanh thông báo của hệ thống.</li>
                </ul>
              </div>

              {/* Card 2: Optimized 03 Sheets Structure */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  2. Cấu Trúc Tối Ưu 03 Sheet (Mỗi Tên Đối Tượng Sẽ Nằm Trên Một Dòng)
                </h3>
                <p className="text-slate-600 mb-3 text-2xs">
                  Dữ liệu được tổ chức chuẩn hóa thành <strong>đúng 03 trang tính (Sheets)</strong> theo đúng quy trình nghiệp vụ; tại mỗi trang tính, <strong>mỗi tên đối tượng được bố trí trên một dòng riêng biệt</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-2xs">
                  <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200 space-y-1.5">
                    <span className="font-bold text-teal-900 font-mono block border-b border-teal-200 pb-1">
                      1. Sheet "Phiếu nhập":
                    </span>
                    <p className="text-slate-600 text-3xs leading-relaxed">
                      <strong>Mỗi tên đối tượng nằm trên 1 dòng</strong>: Thống kê số phiếu PNK, ngày nhập, người giao/nhà cung cấp, số hóa đơn tài chính, danh mục thuốc thực nhập, tổng số lượng và tổng tiền nhập kho mua ngoài.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 space-y-1.5">
                    <span className="font-bold text-blue-900 font-mono block border-b border-blue-200 pb-1">
                      2. Sheet "Phiếu xuất":
                    </span>
                    <p className="text-slate-600 text-3xs leading-relaxed">
                      <strong>Mỗi tên đối tượng nằm trên 1 dòng</strong>: Thống kê số phiếu PXK, ngày xuất, người nhận thuốc, lý do xuất kho, địa điểm sử dụng, danh mục thuốc cấp phát, tổng số lượng và tổng giá trị xuất kho.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                    <span className="font-bold text-emerald-900 font-mono block border-b border-emerald-200 pb-1">
                      3. Sheet "Báo cáo":
                    </span>
                    <p className="text-slate-600 text-3xs leading-relaxed">
                      <strong>Mỗi tên đối tượng nằm trên 1 dòng</strong>: Chuẩn mẫu BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BHYT gồm: Tồn đầu kỳ, Nhập trong kỳ, Tổng nhập, Xuất trong kỳ, Tồn cuối kỳ (SL & Tiền).
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Google Drive Storage */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  3. Cấu Trúc Lưu Trữ Chứng Từ Trên Google Drive
                </h3>
                <p className="text-slate-600 mb-2">
                  Các bản in PDF của phiếu nhập, phiếu xuất và bảng báo cáo được định dạng theo cây thư mục năm và loại chứng từ:
                </p>
                <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-2xs space-y-1">
                  <div className="text-emerald-400 font-bold">{templateSettings.googleDriveFolder}/</div>
                  <div className="pl-4 text-slate-400">├── PHIEU_NHAP/ (Chứa PNK-20261002-001.pdf, ...)</div>
                  <div className="pl-4 text-slate-400">├── PHIEU_XUAT/ (Chứa PXK-20261005-001.pdf, ...)</div>
                  <div className="pl-4 text-slate-400">└── BAO_CAO/ (Chứa BaoCao_BHYT_DT001_20261001.pdf, ...)</div>
                </div>
              </div>

              {/* Card 4: 1-Click Export and Connect */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">Tải File Dữ Liệu Tối Ưu 03 Sheet Cho Google Sheets:</div>
                  <div className="text-2xs text-slate-500 mt-0.5">
                    Tệp Excel (.XLSX) tự động mở thành đúng 3 tab trang tính trên Google Drive / Sheets. Tệp CSV phân chia rõ từng phân hệ.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => {
                      exportFullGoogleSheetCSV();
                      setIsModalOpen(false);
                    }}
                    className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                    title="Tải tệp CSV 03 Sheet chuẩn UTF-8 BOM"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Tải File CSV (03 Sheet)</span>
                  </button>

                  <button
                    onClick={() => {
                      exportFullGoogleSheetData();
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    title="Tải file Excel .XLSX mở trực tiếp thành 3 tab trên Google Sheets"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Tải Excel (.XLSX) 03 Sheet</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: Full Document Viewer */
            <div className="bg-white border border-slate-200 rounded-xl p-5 max-h-[60vh] overflow-y-auto space-y-6 font-sans">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-2xs font-bold uppercase tracking-wider text-teal-700">Tài liệu nghiệp vụ chuẩn</span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  HƯỚNG DẪN CHI TIẾT QUY TRÌNH TỰ ĐỘNG SAO LƯU DỮ LIỆU LÊN GOOGLE SHEETS VÀ GOOGLE DRIVE
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Trung tâm Bảo trợ xã hội Đà Nẵng • Phòng Y tế - Phục hồi chức năng • Mã QHNS: 1041008
                </p>
              </div>

              {/* Document Body */}
              <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-4">
                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-teal-900 border-l-4 border-teal-600 pl-2">
                    1. Tổng Quan Nguyên Lý Tự Động Sao Lưu
                  </h3>
                  <p>
                    Hệ thống áp dụng phương thức <strong>"Nhập liệu một lần - Dữ liệu xuyên suốt"</strong>. Cán bộ chỉ cần thao tác trên biểu mẫu web. Mọi nghiệp vụ phát sinh đều được tự động sao lưu kép: lưu bảng dữ liệu số liệu lên Google Sheets và lưu bản in chứng từ PDF lên Google Drive.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-teal-900 border-l-4 border-teal-600 pl-2">
                    2. Cơ Chế Tự Động Sao Lưu Ngầm (Background Auto-Backup)
                  </h3>
                  <p>
                    Hệ thống tự động kích hoạt tiến trình sao lưu trong nền ngay khi tạo mới, hiệu chỉnh hoặc xóa Phiếu Nhập, Phiếu Xuất, Báo Cáo. Người dùng có thể quan sát trạng thái qua chấm xanh và mốc thời gian sao lưu gần nhất tại thanh tác vụ phía trên cùng màn hình.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-teal-900 border-l-4 border-teal-600 pl-2">
                    3. Cấu Trúc Tối Ưu 03 Sheet Trên Google Sheets (Mỗi Đối Tượng 1 Dòng)
                  </h3>
                  <ul className="list-disc list-inside space-y-1.5 pl-2">
                    <li><strong>Sheet "Phiếu nhập"</strong>: Mỗi tên đối tượng nằm trên một dòng riêng biệt, thống kê các số phiếu PNK, ngày nhập, người giao/nhà cung ứng, số hóa đơn chứng từ, danh mục thuốc thực nhập, tổng số lượng và tổng tiền nhập kho.</li>
                    <li><strong>Sheet "Phiếu xuất"</strong>: Mỗi tên đối tượng nằm trên một dòng riêng biệt, thống kê các số phiếu PXK, ngày xuất, người nhận thuốc, lý do xuất, địa điểm sử dụng, danh mục thuốc thực xuất, tổng số lượng và tổng giá trị xuất kho.</li>
                    <li><strong>Sheet "Báo cáo"</strong>: Mỗi tên đối tượng nằm trên một dòng riêng biệt theo đúng mẫu BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BHYT gồm: Tồn đầu kỳ, Nhập trong kỳ, Tổng nhập, Xuất trong kỳ, Tồn cuối kỳ (SL & Tiền) và Đánh giá.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-teal-900 border-l-4 border-teal-600 pl-2">
                    4. Hướng Dẫn Thao Tác Nhập (Import) Vào Google Sheets
                  </h3>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <p><strong>Bước 1:</strong> Bấm <em>"Xuất Google Sheets (.CSV)"</em> trên thanh công cụ.</p>
                    <p><strong>Bước 2:</strong> Mở bảng tính mới tại <code>sheets.google.com</code>.</p>
                    <p><strong>Bước 3:</strong> Chọn <strong>Tệp (File) &gt; Nhập (Import) &gt; Tải lên</strong> và thả tệp CSV vừa tải về.</p>
                    <p><strong>Bước 4:</strong> Chọn <em>"Thay thế bảng tính hiện tại"</em> và bấm <strong>Nhập dữ liệu</strong>.</p>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-teal-900 border-l-4 border-teal-600 pl-2">
                    5. Cấu Trúc Cây Thư Mục Lưu Trữ Chứng Từ Trên Google Drive
                  </h3>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-2xs font-mono">
                    {`QUAN_LY_THUOC_TRUNG_TAM/
├── 2026/
│   ├── PHIEU_NHAP/ (PNK-20261002-001.pdf)
│   ├── PHIEU_XUAT/ (PXK-20261005-001.pdf)
│   └── BAO_CAO/    (BaoCao_BHYT_NguyenVanAn_202610.pdf)
└── 2027/`}
                  </pre>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-teal-900 border-l-4 border-teal-600 pl-2">
                    6. Quy Trình In Và Lưu Trữ PDF
                  </h3>
                  <p>
                    Mở bản in chứng từ (Phiếu nhập C20-HD, Phiếu xuất C21-HD hoặc Báo cáo BHYT) &gt; Bấm In chứng từ &gt; Chọn <strong>"Lưu dưới dạng PDF"</strong> &gt; Tải tệp lên đúng thư mục Google Drive theo năm và phân loại chứng từ.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-teal-900 border-l-4 border-teal-600 pl-2">
                    7. Lưu Ý Nghiệp Vụ Về Hạn Dùng & Đối Tượng Tự Do
                  </h3>
                  <p>
                    - <strong>Hạn dùng (HSD):</strong> Toàn bộ các biểu mẫu và bản in A4 không hiển thị hạn dùng của thuốc, chỉ ghi nhận số lô theo đúng chỉ đạo.
                  </p>
                  <p>
                    - <strong>Tên đối tượng hưởng:</strong> Cho phép cán bộ tự do gõ tên đối tượng mới hoặc chọn từ danh sách hồ sơ nuôi dưỡng có sẵn.
                  </p>
                  <p>
                    - <strong>Hiệu chỉnh mặc định:</strong> Tên đơn vị, mã QHNS (1041008) và họ tên 5 người ký có thể thay đổi bất kỳ lúc nào tại mục "Cấu Hình Mặc Định" trên thanh menu.
                  </p>
                </section>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                <span className="text-2xs text-slate-400 italic">Tài liệu nội bộ ban hành kèm hệ thống</span>
                <button
                  onClick={downloadBackupGuideFile}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Toàn Văn File Hướng Dẫn (.MD)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Modal for Overwriting Google Sheets Data */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Xác nhận đồng bộ toàn bộ dữ liệu lên Google Sheets"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 mb-1">Cập nhật và ghi đè dữ liệu trên Google Sheets</div>
              <p className="leading-relaxed text-amber-800">
                Thao tác này sẽ đồng bộ và cập nhật trực tiếp dữ liệu từ phần mềm sang Google Spreadsheet của bạn (tài khoản{' '}
                <strong>{googleUser?.email || templateSettings.googleUserEmail || 'Google Account'}</strong>).
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="font-semibold text-slate-800">Nội dung sẽ được cập nhật đồng bộ gồm 03 trang tính:</div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <strong>Sheet "Phiếu nhập":</strong> Danh mục chứng từ nhập kho, danh mục thuốc, số lượng và đơn giá thực tế.
              </li>
              <li>
                <strong>Sheet "Phiếu xuất":</strong> Toàn bộ chứng từ xuất kho và cấp phát thuốc theo đối tượng.
              </li>
              <li>
                <strong>Sheet "Báo cáo":</strong> Mỗi đối tượng 1 dòng duy nhất, tổng hợp Tồn đầu, Nhập, Xuất, Tồn cuối kỳ và kinh phí.
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="confirmAutoSync"
              checked={templateSettings.autoBackupEnabled}
              onChange={(e) => updateTemplateSettings({ autoBackupEnabled: e.target.checked })}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="confirmAutoSync" className="text-slate-700 cursor-pointer font-medium">
              Duy trì tự động đồng bộ ngầm mỗi khi có phát sinh phiếu nhập/xuất mới
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmSync}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
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
