/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TemplateSettings } from '../../types';
import {
  Sliders,
  Building2,
  FileText,
  UserCheck,
  Cloud,
  Save,
  RotateCcw,
  Check,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
  Download,
  BookOpen,
} from 'lucide-react';
import { downloadBackupGuideFile } from '../../utils/backupGuideContent';

export const TemplateSettingsView: React.FC = () => {
  const {
    templateSettings,
    updateTemplateSettings,
    resetTemplateSettings,
    triggerAutoBackup,
    backupLogs,
    hasPermission,
    currentUser,
  } = useApp();

  const canManageSettings = hasPermission('canManageSettings');
  const [form, setForm] = useState<TemplateSettings>({ ...templateSettings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTemplateSettings(form);
    triggerAutoBackup('Cập nhật cấu hình biểu mẫu mặc định');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Khôi phục toàn bộ cấu hình biểu mẫu mặc định về giá trị ban đầu?')) {
      resetTemplateSettings();
      setForm({ ...templateSettings });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-teal-600" />
            <span>Hiệu Chỉnh Biểu Mẫu Mặc Định</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tùy biến tiêu đề cơ quan, mã quan hệ ngân sách, mẫu số chứng từ, chữ ký và tham số sao lưu Google Sheet & Drive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageSettings ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {saveSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
                <span>{saveSuccess ? 'Đã lưu cấu hình!' : 'Lưu cấu hình mặc định'}</span>
              </button>
            </>
          ) : (
            <span
              className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
              title="Chỉ Quản trị viên (ADMIN) mới có quyền lưu cấu hình"
            >
              Chế độ chỉ xem (Cần quyền ADMIN để lưu)
            </span>
          )}
        </div>
      </div>

      {!canManageSettings && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
          <span className="font-semibold">Lưu ý phân quyền:</span>
          <span>
            Bạn đang đăng nhập với vai trò <strong>{currentUser.role}</strong>. Bạn có thể xem cấu hình nhưng không thể thay đổi thông tin mặc định của đơn vị.
          </span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center gap-2 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Đã cập nhật thành công!</strong> Mọi phiếu nhập, phiếu xuất, báo cáo và bản in khổ A4 tiếp theo sẽ tự động áp dụng thông tin biểu mẫu mặc định này.
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: Thông tin Đơn vị & Cơ quan chủ quản */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>1. Thông Tin Đơn Vị & Cơ Quan Chủ Quản (Đầu Biểu Mẫu)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên cơ quan cấp trên</label>
              <input
                type="text"
                value={form.parentOrg}
                onChange={(e) => setForm({ ...form, parentOrg: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                placeholder="vd: SỞ LAO ĐỘNG - THƯƠNG BINH VÀ XÃ HỘI TP ĐÀ NẴNG"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên cơ sở / đơn vị *</label>
              <input
                type="text"
                required
                value={form.agencyName}
                onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 font-bold"
                placeholder="vd: TRUNG TÂM BẢO TRỢ XÃ HỘI"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên bộ phận / phòng ban phụ trách</label>
              <input
                type="text"
                value={form.deptName}
                onChange={(e) => setForm({ ...form, deptName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-900"
                placeholder="vd: PHÒNG Y TẾ - PHCN"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mã quan hệ ngân sách (Mã QHNS) *</label>
              <input
                type="text"
                required
                value={form.qhnsCode}
                onChange={(e) => setForm({ ...form, qhnsCode: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-teal-800"
                placeholder="vd: 1041008"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Tiêu đề & Mẫu số chứng từ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>2. Tiêu Đề & Mẫu Số Chứng Từ Mặc Định</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Nhập kho */}
            <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-teal-900 block border-b border-slate-200 pb-1">
                Biểu Mẫu Phiếu Nhập Kho:
              </span>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mẫu số chứng từ</label>
                <input
                  type="text"
                  value={form.receiptFormCode}
                  onChange={(e) => setForm({ ...form, receiptFormCode: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  placeholder="Mẫu số: C20-HD"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề phiếu nhập</label>
                <input
                  type="text"
                  value={form.receiptTitle}
                  onChange={(e) => setForm({ ...form, receiptTitle: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold"
                  placeholder="PHIẾU NHẬP KHO"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên kho nhập mặc định</label>
                <input
                  type="text"
                  value={form.receiptDefaultWarehouse}
                  onChange={(e) => setForm({ ...form, receiptDefaultWarehouse: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Xuất kho */}
            <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-teal-900 block border-b border-slate-200 pb-1">
                Biểu Mẫu Phiếu Xuất Kho:
              </span>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mẫu số chứng từ</label>
                <input
                  type="text"
                  value={form.issueFormCode}
                  onChange={(e) => setForm({ ...form, issueFormCode: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                  placeholder="Mẫu số: C21-HD"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề phiếu xuất</label>
                <input
                  type="text"
                  value={form.issueTitle}
                  onChange={(e) => setForm({ ...form, issueTitle: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold"
                  placeholder="PHIẾU XUẤT KHO"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên kho xuất mặc định</label>
                <input
                  type="text"
                  value={form.issueDefaultWarehouse}
                  onChange={(e) => setForm({ ...form, issueDefaultWarehouse: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Báo cáo BHYT */}
            <div className="md:col-span-2 p-3.5 bg-slate-50/80 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                Tiêu đề Bảng Tổng Hợp Thuốc Theo Đối Tượng (BHYT)
              </label>
              <input
                type="text"
                value={form.reportTitle}
                onChange={(e) => setForm({ ...form, reportTitle: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold text-slate-900"
                placeholder="BẢNG TỔNG HỢP NHẬP, XUẤT THUỐC MUA NGOÀI CHO ĐỐI TƯỢNG CÓ BẢO HIỂM Y TẾ"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Họ tên & Chức danh người ký mặc định */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-teal-600" />
            <span>3. Họ Tên & Chức Danh Người Ký Mặc Định (4 - 5 Khung Chữ Ký)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* Người lập biểu */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <label className="block font-semibold text-slate-700 mb-1">Người lập biểu</label>
              <input
                type="text"
                value={form.preparerName}
                onChange={(e) => setForm({ ...form, preparerName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded bg-white font-semibold"
                placeholder="DS. Lê Thu Hà"
              />
              <div className="text-3xs text-slate-400 mt-1 italic">Ký, họ tên trên phiếu & báo cáo</div>
            </div>

            {/* Phụ trách Phòng Y tế */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <label className="block font-semibold text-slate-700 mb-1">Phụ trách Phòng Y tế - PHCN</label>
              <input
                type="text"
                value={form.deptLeaderName}
                onChange={(e) => setForm({ ...form, deptLeaderName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded bg-white font-semibold"
                placeholder="BS. CKI. Nguyễn Thanh Long"
              />
              <div className="text-3xs text-slate-400 mt-1 italic">Xác nhận nghiệp vụ chuyên môn</div>
            </div>

            {/* Thủ kho */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <label className="block font-semibold text-slate-700 mb-1">Thủ kho</label>
              <input
                type="text"
                value={form.warehouseKeeperName}
                onChange={(e) => setForm({ ...form, warehouseKeeperName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded bg-white font-semibold"
                placeholder="Trần Văn Kho"
              />
              <div className="text-3xs text-slate-400 mt-1 italic">Ký nhận thủ kho trên phiếu nhập/xuất</div>
            </div>

            {/* Kế toán trưởng */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <label className="block font-semibold text-slate-700 mb-1">Kế toán trưởng</label>
              <input
                type="text"
                value={form.accountantName}
                onChange={(e) => setForm({ ...form, accountantName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded bg-white font-semibold"
                placeholder="Trần Đình Trọng"
              />
              <div className="text-3xs text-slate-400 mt-1 italic">Ký kế toán trưởng trên phiếu nhập/xuất</div>
            </div>

            {/* Thủ trưởng đơn vị */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2 lg:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Thủ trưởng đơn vị (Giám đốc)</label>
              <input
                type="text"
                value={form.centerDirectorName}
                onChange={(e) => setForm({ ...form, centerDirectorName: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded bg-white font-semibold"
                placeholder="Lê Minh Tuấn"
              />
              <div className="text-3xs text-slate-400 mt-1 italic">Ký tên, đóng dấu thủ trưởng đơn vị</div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Cấu hình Tự Động Sao Lưu Google Sheet & Drive */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Cloud className="w-4 h-4 text-teal-600" />
            <span>4. Cấu Hình Tự Động Sao Lưu Google Sheet & Google Drive</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-teal-50/60 border border-teal-200 rounded-lg">
              <div>
                <div className="font-bold text-teal-900">Bật Chế Độ Tự Động Sao Lưu Ngầm (Auto-Backup)</div>
                <div className="text-2xs text-teal-800/80 mt-0.5">
                  Tự động đồng bộ số liệu và tài liệu chứng từ mỗi khi phát sinh giao dịch nhập, xuất kho hoặc điều chỉnh báo cáo.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.autoBackupEnabled}
                  onChange={(e) => setForm({ ...form, autoBackupEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đường dẫn Bảng tính Google Sheets (URL)
                </label>
                <input
                  type="text"
                  value={form.googleSheetUrl}
                  onChange={(e) => setForm({ ...form, googleSheetUrl: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-2xs"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thư mục Lưu trữ Google Drive
                </label>
                <input
                  type="text"
                  value={form.googleDriveFolder}
                  onChange={(e) => setForm({ ...form, googleDriveFolder: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-2xs"
                  placeholder="QUAN_LY_THUOC_TRUNG_TAM/2026"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-2xs">
              <span className="text-slate-600">
                Thời gian sao lưu gần nhất: <strong className="text-slate-800">{form.lastBackupTime || '10:00:00 26/10/2026'}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerAutoBackup('Kiểm tra sao lưu thử nghiệm');
                  setForm({
                    ...form,
                    lastBackupTime: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
                  });
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 3000);
                }}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-semibold"
              >
                Kiểm tra sao lưu ngay
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 5: Tài Liệu Hướng Dẫn Sao Lưu Chi Tiết */}
        <div className="bg-gradient-to-r from-teal-50 to-blue-50/60 rounded-xl border border-teal-200 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-teal-900">
                  Tài Liệu Hướng Dẫn Chi Tiết Quy Trình Sao Lưu (.MD)
                </h3>
              </div>
              <p className="text-xs text-teal-950/80">
                Bao gồm toàn bộ nguyên lý tự động sao lưu, cấu trúc tối ưu 03 Sheet trên Google Sheets (mỗi tên đối tượng nằm trên 1 dòng), sơ đồ cây thư mục Google Drive và quy trình phục hồi số liệu khi có sự cố.
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

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={handleReset}
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
      </form>
    </div>
  );
};
