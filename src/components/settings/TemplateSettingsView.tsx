/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TemplateSettings, DEFAULT_TEMPLATE_SETTINGS, GoogleSyncMode } from '../../types';
import {
  Sliders,
  Building2,
  FileText,
  UserCheck,
  Cloud,
  Save,
  RotateCcw,
  Check,
  Download,
  BookOpen,
  ClipboardList,
  Table2,
  AlertCircle,
} from 'lucide-react';
import { downloadBackupGuideFile } from '../../utils/backupGuideContent';

type SettingsSectionTab =
  | 'GENERAL'
  | 'RECEIPT'
  | 'ISSUE'
  | 'REPORT'
  | 'SIGNATURES'
  | 'CLOUD_SYNC';

export const TemplateSettingsView: React.FC = () => {
  const {
    templateSettings,
    updateTemplateSettings,
    resetTemplateSettings,
    triggerAutoBackup,
    syncNowToGoogleSheets,
    hasPermission,
    currentUser,
  } = useApp();

  const canManageSettings = hasPermission('canManageSettings');
  const isAdmin = currentUser?.role === 'ADMIN' && hasPermission('canManageSync');

  const [activeSubTab, setActiveSubTab] = useState<SettingsSectionTab>('GENERAL');
  const [form, setForm] = useState<TemplateSettings>({ ...templateSettings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Sync local form whenever store templateSettings resets or updates externally
  useEffect(() => {
    setForm({ ...templateSettings });
  }, [templateSettings]);

  // Ensure non-admin never stays on CLOUD_SYNC tab
  useEffect(() => {
    if (!isAdmin && activeSubTab === 'CLOUD_SYNC') {
      setActiveSubTab('GENERAL');
    }
  }, [isAdmin, activeSubTab]);

  const updateField = <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    updateTemplateSettings(form);
    if (isAdmin) {
      triggerAutoBackup('Cập nhật toàn bộ cấu hình biểu mẫu mặc định');
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleConfirmReset = () => {
    resetTemplateSettings();
    setForm({ ...DEFAULT_TEMPLATE_SETTINGS });
    setConfirmResetOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleManualSyncTest = async () => {
    if (!isAdmin) return;
    updateTemplateSettings(form);
    setSyncNotice('Đang kiểm tra và đồng bộ lên Google Sheets...');
    const res = await syncNowToGoogleSheets(true);
    if (res?.success) {
      const totalRows = res.rowCounts.receipts + res.rowCounts.issues + res.rowCounts.reports;
      setSyncNotice(`Đã đồng bộ thành công lúc ${new Date().toLocaleTimeString('vi-VN')} (${totalRows} dòng).`);
    } else {
      setSyncNotice(res?.error || 'Không thể đồng bộ Google Sheets. Vui lòng kiểm tra cấu hình tại mục Đồng bộ Google Sheets & Drive.');
    }
  };

  const subTabs: { id: SettingsSectionTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'GENERAL', label: 'Quốc Hiệu & Cơ Quan', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'RECEIPT', label: 'Phiếu Nhập (C20-HD)', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'ISSUE', label: 'Phiếu Xuất (C21-HD)', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'REPORT', label: 'Báo Cáo BHYT', icon: <Table2 className="w-3.5 h-3.5" /> },
    { id: 'SIGNATURES', label: 'Chữ Ký (5 Vị Trí)', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { id: 'CLOUD_SYNC', label: 'Sao Lưu Google Sheets & Drive', icon: <Cloud className="w-3.5 h-3.5" />, adminOnly: true },
  ];

  const visibleTabs = subTabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-teal-600" />
            <span>Hiệu Chỉnh Toàn Bộ Biểu Mẫu Mặc Định</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tùy chỉnh 100% nội dung biểu mẫu hành chính: quốc hiệu, tiêu đề, nhãn thông tin, tên các cột bảng kê, ghi chú và 5 khung chữ ký.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManageSettings ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {saveSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
                <span>{saveSuccess ? 'Đã lưu cấu hình!' : 'Lưu toàn bộ cấu hình'}</span>
              </button>
            </>
          ) : (
            <span className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
              Chế độ chỉ xem (Cần quyền ADMIN để hiệu chỉnh)
            </span>
          )}
        </div>
      </div>

      {/* Inline Reset Confirmation Banner */}
      {confirmResetOpen && canManageSettings && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Xác nhận khôi phục mặc định:</strong> Toàn bộ tiêu ngữ, tiêu đề, tên cột, ghi chú và chữ ký sẽ trở về mẫu chuẩn ban đầu.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 font-semibold"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold"
            >
              Đồng ý khôi phục
            </button>
          </div>
        </div>
      )}

      {!canManageSettings && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
          <span className="font-semibold">Lưu ý phân quyền:</span>
          <span>
            Bạn đang đăng nhập với vai trò <strong>{currentUser.role}</strong>. Bạn có thể xem nội dung mẫu nhưng không thể lưu thay đổi cấu hình mặc định.
          </span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center gap-2 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Đã lưu cấu hình thành công!</strong> Mọi biểu mẫu Phiếu Nhập (C20-HD), Phiếu Xuất (C21-HD), Báo cáo BHYT và bản in A4 sẽ cập nhật ngay theo nội dung mới.
          </span>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex flex-wrap gap-1.5">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === tab.id
                ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <fieldset disabled={!canManageSettings} className="space-y-6 disabled:opacity-75">
          {/* TAB 1: QUỐC HIỆU & ĐƠN VỊ HÀNH CHÍNH */}
          {activeSubTab === 'GENERAL' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
              <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900">1. Quốc Hiệu, Tiêu Ngữ & Thông Tin Cơ Quan</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quốc hiệu (dòng trên)</label>
                  <input
                    type="text"
                    value={form.nationalMottoTop}
                    onChange={(e) => updateField('nationalMottoTop', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold uppercase text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiêu ngữ (dòng dưới)</label>
                  <input
                    type="text"
                    value={form.nationalMottoSub}
                    onChange={(e) => updateField('nationalMottoSub', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cơ quan cấp trên</label>
                  <input
                    type="text"
                    value={form.parentOrg}
                    onChange={(e) => updateField('parentOrg', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên cơ sở / đơn vị *</label>
                  <input
                    type="text"
                    required
                    value={form.agencyName}
                    onChange={(e) => updateField('agencyName', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng ban / Bộ phận chuyên môn</label>
                  <input
                    type="text"
                    value={form.deptName}
                    onChange={(e) => updateField('deptName', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã quan hệ ngân sách (Mã QHNS) *</label>
                  <input
                    type="text"
                    required
                    value={form.qhnsCode}
                    onChange={(e) => updateField('qhnsCode', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-teal-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Địa danh hành chính</label>
                  <input
                    type="text"
                    value={form.facilityAddress}
                    onChange={(e) => updateField('facilityAddress', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dòng ngày tháng trên báo cáo A4</label>
                  <input
                    type="text"
                    value={form.datePlaceLine}
                    onChange={(e) => updateField('datePlaceLine', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg italic text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhãn dòng cộng tiền bảng kê</label>
                  <input
                    type="text"
                    value={form.totalAmountLabel}
                    onChange={(e) => updateField('totalAmountLabel', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhãn dòng tổng số tiền viết bằng chữ</label>
                  <input
                    type="text"
                    value={form.totalAmountWordsLabel}
                    onChange={(e) => updateField('totalAmountWordsLabel', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHIẾU NHẬP KHO C20-HD */}
          {activeSubTab === 'RECEIPT' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5 text-xs">
              <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900">2. Toàn Bộ Nội Dung Biểu Mẫu Phiếu Nhập Kho (C20-HD)</h2>
              </div>

              {/* Tiêu đề & Thông tin chung */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mẫu số chứng từ</label>
                  <input
                    type="text"
                    value={form.receiptFormCode}
                    onChange={(e) => updateField('receiptFormCode', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú ban hành thông tư</label>
                  <input
                    type="text"
                    value={form.receiptNotice}
                    onChange={(e) => updateField('receiptNotice', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiêu đề chính phiếu nhập</label>
                  <input
                    type="text"
                    value={form.receiptTitle}
                    onChange={(e) => updateField('receiptTitle', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên kho nhập mặc định</label>
                  <input
                    type="text"
                    value={form.receiptDefaultWarehouse}
                    onChange={(e) => updateField('receiptDefaultWarehouse', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* 6 nhãn thông tin đầu phiếu */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800">Nhãn 6 dòng thông tin hành chính trên Phiếu Nhập Kho</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn người giao hàng</label>
                    <input
                      type="text"
                      value={form.receiptLabelDeliverer}
                      onChange={(e) => updateField('receiptLabelDeliverer', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn bộ phận giao</label>
                    <input
                      type="text"
                      value={form.receiptLabelDelivererDept}
                      onChange={(e) => updateField('receiptLabelDelivererDept', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn hóa đơn kèm theo</label>
                    <input
                      type="text"
                      value={form.receiptLabelInvoice}
                      onChange={(e) => updateField('receiptLabelInvoice', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn nội dung nhập</label>
                    <input
                      type="text"
                      value={form.receiptLabelContent}
                      onChange={(e) => updateField('receiptLabelContent', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn đối tượng liên quan</label>
                    <input
                      type="text"
                      value={form.receiptLabelBeneficiary}
                      onChange={(e) => updateField('receiptLabelBeneficiary', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn nhập tại kho</label>
                    <input
                      type="text"
                      value={form.receiptLabelWarehouse}
                      onChange={(e) => updateField('receiptLabelWarehouse', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 9 tên cột bảng chi tiết */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800">Tên 09 cột bảng kê hàng hóa Phiếu Nhập Kho</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột A (STT)</label>
                    <input type="text" value={form.receiptColStt} onChange={(e) => updateField('receiptColStt', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột B (Tên thuốc & quy cách)</label>
                    <input type="text" value={form.receiptColName} onChange={(e) => updateField('receiptColName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột C (Mã số)</label>
                    <input type="text" value={form.receiptColCode} onChange={(e) => updateField('receiptColCode', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột D (Đơn vị tính)</label>
                    <input type="text" value={form.receiptColUnit} onChange={(e) => updateField('receiptColUnit', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột E (Số lô)</label>
                    <input type="text" value={form.receiptColBatch} onChange={(e) => updateField('receiptColBatch', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 1 (SL chứng từ)</label>
                    <input type="text" value={form.receiptColDocQty} onChange={(e) => updateField('receiptColDocQty', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 2 (Thực nhập)</label>
                    <input type="text" value={form.receiptColActualQty} onChange={(e) => updateField('receiptColActualQty', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 3 (Đơn giá)</label>
                    <input type="text" value={form.receiptColUnitPrice} onChange={(e) => updateField('receiptColUnitPrice', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 4 (Thành tiền)</label>
                    <input type="text" value={form.receiptColTotalPrice} onChange={(e) => updateField('receiptColTotalPrice', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>
              </div>

              {/* Ghi chú & Chức danh người giao */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chức danh cột chữ ký 1 (Người giao hàng)</label>
                  <input
                    type="text"
                    value={form.receiptDelivererRoleLabel}
                    onChange={(e) => updateField('receiptDelivererRoleLabel', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú ký dưới cột 1</label>
                  <input
                    type="text"
                    value={form.receiptDelivererSignNote}
                    onChange={(e) => updateField('receiptDelivererSignNote', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú cuối Phiếu Nhập Kho</label>
                  <textarea
                    rows={2}
                    value={form.receiptFooterNote}
                    onChange={(e) => updateField('receiptFooterNote', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHIẾU XUẤT KHO C21-HD */}
          {activeSubTab === 'ISSUE' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5 text-xs">
              <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900">3. Toàn Bộ Nội Dung Biểu Mẫu Phiếu Xuất Kho (C21-HD)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mẫu số chứng từ</label>
                  <input
                    type="text"
                    value={form.issueFormCode}
                    onChange={(e) => updateField('issueFormCode', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú ban hành thông tư</label>
                  <input
                    type="text"
                    value={form.issueNotice}
                    onChange={(e) => updateField('issueNotice', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiêu đề chính phiếu xuất</label>
                  <input
                    type="text"
                    value={form.issueTitle}
                    onChange={(e) => updateField('issueTitle', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên kho xuất mặc định</label>
                  <input
                    type="text"
                    value={form.issueDefaultWarehouse}
                    onChange={(e) => updateField('issueDefaultWarehouse', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800">Nhãn 6 dòng thông tin hành chính trên Phiếu Xuất Kho</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn người nhận hàng</label>
                    <input type="text" value={form.issueLabelReceiver} onChange={(e) => updateField('issueLabelReceiver', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn bộ phận / địa chỉ</label>
                    <input type="text" value={form.issueLabelReceiverDept} onChange={(e) => updateField('issueLabelReceiverDept', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn lý do xuất kho</label>
                    <input type="text" value={form.issueLabelReason} onChange={(e) => updateField('issueLabelReason', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn đối tượng nhận thuốc</label>
                    <input type="text" value={form.issueLabelBeneficiary} onChange={(e) => updateField('issueLabelBeneficiary', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn xuất tại kho</label>
                    <input type="text" value={form.issueLabelWarehouse} onChange={(e) => updateField('issueLabelWarehouse', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhãn địa điểm sử dụng</label>
                    <input type="text" value={form.issueLabelUsageLocation} onChange={(e) => updateField('issueLabelUsageLocation', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800">Tên 09 cột bảng kê hàng hóa Phiếu Xuất Kho</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột A (STT)</label>
                    <input type="text" value={form.issueColStt} onChange={(e) => updateField('issueColStt', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột B (Tên thuốc & quy cách)</label>
                    <input type="text" value={form.issueColName} onChange={(e) => updateField('issueColName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột C (Mã số)</label>
                    <input type="text" value={form.issueColCode} onChange={(e) => updateField('issueColCode', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột D (Đơn vị tính)</label>
                    <input type="text" value={form.issueColUnit} onChange={(e) => updateField('issueColUnit', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột E (Số lô)</label>
                    <input type="text" value={form.issueColBatch} onChange={(e) => updateField('issueColBatch', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 1 (SL yêu cầu)</label>
                    <input type="text" value={form.issueColReqQty} onChange={(e) => updateField('issueColReqQty', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 2 (Thực xuất)</label>
                    <input type="text" value={form.issueColActualQty} onChange={(e) => updateField('issueColActualQty', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 3 (Đơn giá)</label>
                    <input type="text" value={form.issueColUnitPrice} onChange={(e) => updateField('issueColUnitPrice', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột 4 (Thành tiền)</label>
                    <input type="text" value={form.issueColTotalPrice} onChange={(e) => updateField('issueColTotalPrice', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chức danh cột chữ ký 1 (Người nhận hàng)</label>
                  <input
                    type="text"
                    value={form.issueReceiverRoleLabel}
                    onChange={(e) => updateField('issueReceiverRoleLabel', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú ký dưới cột 1</label>
                  <input
                    type="text"
                    value={form.issueReceiverSignNote}
                    onChange={(e) => updateField('issueReceiverSignNote', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú cuối Phiếu Xuất Kho</label>
                  <textarea
                    rows={2}
                    value={form.issueFooterNote}
                    onChange={(e) => updateField('issueFooterNote', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BÁO CÁO BHYT ĐỐI TƯỢNG */}
          {activeSubTab === 'REPORT' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5 text-xs">
              <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
                <Table2 className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900">4. Toàn Bộ Nội Dung Báo Cáo Tổng Hợp BHYT Theo Đối Tượng</h2>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiêu đề chính báo cáo</label>
                  <input
                    type="text"
                    value={form.reportTitle}
                    onChange={(e) => updateField('reportTitle', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dòng mô tả phụ dưới tiêu đề</label>
                  <input
                    type="text"
                    value={form.reportSubtitle}
                    onChange={(e) => updateField('reportSubtitle', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800">Cột cố định & 5 nhóm cột Nhập – Xuất – Tồn</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột STT</label>
                    <input type="text" value={form.reportColStt} onChange={(e) => updateField('reportColStt', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột tên thuốc & hàm lượng</label>
                    <input type="text" value={form.reportColName} onChange={(e) => updateField('reportColName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột đơn vị tính</label>
                    <input type="text" value={form.reportColUnit} onChange={(e) => updateField('reportColUnit', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhóm 1 (Tồn đầu kỳ)</label>
                    <input type="text" value={form.reportGroupOpening} onChange={(e) => updateField('reportGroupOpening', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhóm 2 (Nhập trong kỳ)</label>
                    <input type="text" value={form.reportGroupIn} onChange={(e) => updateField('reportGroupIn', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhóm 3 (Tổng nhập)</label>
                    <input type="text" value={form.reportGroupTotalIn} onChange={(e) => updateField('reportGroupTotalIn', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhóm 4 (Xuất trong kỳ)</label>
                    <input type="text" value={form.reportGroupOut} onChange={(e) => updateField('reportGroupOut', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhóm 5 (Tồn cuối kỳ)</label>
                    <input type="text" value={form.reportGroupClosing} onChange={(e) => updateField('reportGroupClosing', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột con 1 (SL)</label>
                    <input type="text" value={form.reportSubColQty} onChange={(e) => updateField('reportSubColQty', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột con 2 (Đơn giá)</label>
                    <input type="text" value={form.reportSubColPrice} onChange={(e) => updateField('reportSubColPrice', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cột con 3 (Thành tiền)</label>
                    <input type="text" value={form.reportSubColAmount} onChange={(e) => updateField('reportSubColAmount', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhãn dòng tổng cộng cuối bảng</label>
                  <input
                    type="text"
                    value={form.reportGrandTotalLabel}
                    onChange={(e) => updateField('reportGrandTotalLabel', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú cuối báo cáo BHYT</label>
                  <textarea
                    rows={2}
                    value={form.reportFooterNote}
                    onChange={(e) => updateField('reportFooterNote', e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CHỮ KÝ & CHỨC DANH (5 VỊ TRÍ) */}
          {activeSubTab === 'SIGNATURES' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5 text-xs">
              <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900">5. Chức Danh, Họ Tên & Ghi Chú Ký Mặc Định (5 Vị Trí)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Người lập biểu */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="font-bold text-slate-900">Vị trí 1: Người lập biểu</div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiêu đề chức danh in đậm</label>
                    <input type="text" value={form.preparerTitle} onChange={(e) => updateField('preparerTitle', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ tên mặc định</label>
                    <input type="text" value={form.preparerName} onChange={(e) => updateField('preparerName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú hướng dẫn ký</label>
                    <input type="text" value={form.preparerSignNote} onChange={(e) => updateField('preparerSignNote', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white italic" />
                  </div>
                </div>

                {/* 2. Phụ trách Phòng Y tế */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="font-bold text-slate-900">Vị trí 2: Phụ trách chuyên môn Y tế</div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiêu đề chức danh in đậm</label>
                    <input type="text" value={form.deptLeaderTitle} onChange={(e) => updateField('deptLeaderTitle', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ tên mặc định</label>
                    <input type="text" value={form.deptLeaderName} onChange={(e) => updateField('deptLeaderName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú hướng dẫn ký</label>
                    <input type="text" value={form.deptLeaderSignNote} onChange={(e) => updateField('deptLeaderSignNote', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white italic" />
                  </div>
                </div>

                {/* 3. Thủ kho */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="font-bold text-slate-900">Vị trí 3: Thủ kho Dược</div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiêu đề chức danh in đậm</label>
                    <input type="text" value={form.warehouseKeeperTitle} onChange={(e) => updateField('warehouseKeeperTitle', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ tên mặc định</label>
                    <input type="text" value={form.warehouseKeeperName} onChange={(e) => updateField('warehouseKeeperName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú hướng dẫn ký</label>
                    <input type="text" value={form.warehouseKeeperSignNote} onChange={(e) => updateField('warehouseKeeperSignNote', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white italic" />
                  </div>
                </div>

                {/* 4. Kế toán trưởng */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="font-bold text-slate-900">Vị trí 4: Kế toán trưởng</div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiêu đề chức danh in đậm</label>
                    <input type="text" value={form.accountantTitle} onChange={(e) => updateField('accountantTitle', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ tên mặc định</label>
                    <input type="text" value={form.accountantName} onChange={(e) => updateField('accountantName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú hướng dẫn ký</label>
                    <input type="text" value={form.accountantSignNote} onChange={(e) => updateField('accountantSignNote', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white italic" />
                  </div>
                </div>

                {/* 5. Thủ trưởng đơn vị */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 md:col-span-2">
                  <div className="font-bold text-slate-900">Vị trí 5: Thủ trưởng đơn vị (Giám đốc)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiêu đề chức danh in đậm</label>
                      <input type="text" value={form.centerDirectorTitle} onChange={(e) => updateField('centerDirectorTitle', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ tên mặc định</label>
                      <input type="text" value={form.centerDirectorName} onChange={(e) => updateField('centerDirectorName', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ghi chú hướng dẫn ký</label>
                      <input type="text" value={form.centerDirectorSignNote} onChange={(e) => updateField('centerDirectorSignNote', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white italic" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CLOUD SYNC (ADMIN ONLY) */}
          {activeSubTab === 'CLOUD_SYNC' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
                <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-teal-600" />
                  <h2 className="text-sm font-bold text-slate-900">6. Cấu Hình Sao Lưu & Đồng Bộ Google Sheets / Drive (Chỉ Admin)</h2>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-teal-50/60 border border-teal-200 rounded-lg">
                  <div>
                    <div className="font-bold text-teal-900">Bật Chế Độ Tự Động Sao Lưu Ngầm (Auto-Backup)</div>
                    <div className="text-[11px] text-teal-800/80 mt-0.5">
                      Tự động đồng bộ dữ liệu lên Google Sheets mỗi khi phát sinh hoặc sửa chứng từ nhập/xuất.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={form.autoBackupEnabled}
                      onChange={(e) => updateField('autoBackupEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Chế độ đồng bộ ưu tiên</label>
                    <select
                      value={form.syncMode}
                      onChange={(e) => updateField('syncMode', e.target.value as GoogleSyncMode)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-semibold bg-white"
                    >
                      <option value="HYBRID">Kết hợp Apps Script + Google OAuth (Khuyên dùng)</option>
                      <option value="APPS_SCRIPT">Chỉ Google Apps Script Web App (Không hết hạn token)</option>
                      <option value="OAUTH">Chỉ Google OAuth trực tiếp (Popup)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Đường dẫn Apps Script Web App (/exec)</label>
                    <input
                      type="url"
                      value={form.appsScriptUrl}
                      onChange={(e) => updateField('appsScriptUrl', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-[11px]"
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Đường dẫn Google Sheets (URL hoặc ID)</label>
                    <input
                      type="text"
                      value={form.googleSheetUrl}
                      onChange={(e) => updateField('googleSheetUrl', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-[11px]"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Thư mục Lưu trữ Google Drive</label>
                    <input
                      type="text"
                      value={form.googleDriveFolder}
                      onChange={(e) => updateField('googleDriveFolder', e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono text-[11px]"
                      placeholder="QUAN_LY_THUOC_TRUNG_TAM/2026"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="space-y-0.5 text-slate-600">
                    <div>
                      Lần đồng bộ gần nhất: <strong className="text-slate-800">{form.lastBackupTime || 'Chưa đồng bộ'}</strong> ({form.lastSyncChannel || 'Chưa đồng bộ'})
                    </div>
                    {syncNotice && <div className="text-teal-800 font-medium">{syncNotice}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={handleManualSyncTest}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold shrink-0"
                  >
                    Đồng bộ Google Sheets ngay
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-slate-50 rounded-xl border border-teal-200 shadow-xs p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-teal-700" />
                      <h3 className="text-sm font-bold text-teal-900">Tài Liệu Hướng Dẫn Sao Lưu & Khôi Phục (.MD)</h3>
                    </div>
                    <p className="text-xs text-teal-950/80">
                      Mô tả cấu trúc 04 Sheet trên Google Sheets (gồm tab Tài khoản đồng bộ 2 chiều), sơ đồ lưu trữ Google Drive JSON và quy trình phục hồi dữ liệu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadBackupGuideFile}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải File Hướng Dẫn (.MD)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* Bottom Save Bar */}
        {canManageSettings && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Khôi phục mặc định
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Tất Cả Cấu Hình Mặc Định</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
