import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole, UserStatus, ROLE_PERMISSIONS } from '../../types';
import {
  ShieldCheck,
  UserPlus,
  Check,
  X,
  UserX,
  AlertCircle,
  Building2,
  TableProperties,
  Users as UsersIcon,
  Crown,
  Pill,
  Stethoscope,
  Calculator,
  Lock,
  Unlock,
  Key,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { formatDate } from '../../utils/formatters';

export const UserManagementView: React.FC = () => {
  const {
    users,
    currentUser,
    hasPermission,
    registerUser,
    approveUser,
    rejectUser,
    changeUserRole,
    toggleUserStatus,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Form State for User Registration
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Phòng Y Tế - PHCN');
  const [phone, setPhone] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('DOCTOR');
  const [autoActivate, setAutoActivate] = useState(true);

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Quản trị viên',
    DOCTOR: 'Bác sĩ / Y sĩ',
    PHARMACIST: 'Dược sĩ / Kho Dược',
    ACCOUNTANT: 'Kế toán viên',
    LEADER: 'Lãnh đạo đơn vị',
  };

  const roleBadgeStyles: Record<UserRole, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    PHARMACIST: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    DOCTOR: 'bg-blue-100 text-blue-700 border-blue-200',
    ACCOUNTANT: 'bg-amber-100 text-amber-800 border-amber-200',
    LEADER: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };

  const isAdmin = currentUser.role === 'ADMIN' || hasPermission('canManageUsers');

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      alert('Vui lòng điền đủ email và họ tên!');
      return;
    }
    registerUser(email, fullName, department, phone, requestedRole);
    setIsRegisterModalOpen(false);
    setEmail('');
    setFullName('');
    setPhone('');
    setPassword('123');
  };

  const pendingUsers = users.filter((u) => u.status === 'PENDING_APPROVAL');
  const activeUsers = users.filter((u) => u.status === 'ACTIVE');
  const otherUsers = users.filter((u) => u.status !== 'PENDING_APPROVAL' && u.status !== 'ACTIVE');

  // Permission Matrix Feature Definitions
  const permissionFeatures: { key: keyof typeof ROLE_PERMISSIONS['ADMIN']; name: string; desc: string }[] = [
    { key: 'canCreateReceipt', name: 'Lập Phiếu Nhập Kho', desc: 'Tạo phiếu nhập mới C20-HD, thêm thuốc tự do, nhập đơn giá thập phân' },
    { key: 'canEditReceipt', name: 'Chỉnh Sửa Phiếu Nhập', desc: 'Sửa nội dung chứng từ, số lô, số lượng phiếu nhập đã lập' },
    { key: 'canDeleteReceipt', name: 'Xóa Phiếu Nhập', desc: 'Xóa phiếu nhập và trừ lại số lượng trong kho' },
    { key: 'canCreateIssue', name: 'Lập Phiếu Xuất Kho', desc: 'Tạo phiếu xuất C21-HD, trích xuất thuốc theo đối tượng' },
    { key: 'canEditIssue', name: 'Chỉnh Sửa Phiếu Xuất', desc: 'Sửa thuốc xuất, người nhận, lý do xuất kho' },
    { key: 'canDeleteIssue', name: 'Xóa Phiếu Xuất', desc: 'Hủy phiếu xuất và hoàn trả thuốc về kho' },
    { key: 'canEditReport', name: 'Hiệu Chỉnh Biểu Mẫu Báo Cáo', desc: 'Bật chế độ sửa số liệu, đơn giá, ngày tháng trên bảng báo cáo' },
    { key: 'canExportReport', name: 'Xuất Báo Cáo & In Ấn', desc: 'Xuất file Excel 03 sheet, PDF, in trực tiếp theo khổ A4' },
    { key: 'canManageSettings', name: 'Cấu Hình Mặc Định', desc: 'Thay đổi tiêu ngữ, người ký, mã QHNS, tài khoản đồng bộ Google' },
    { key: 'canManageUsers', name: 'Phân Quyền & Cán Bộ', desc: 'Duyệt tài khoản mới, thay đổi vai trò, khóa/mở khóa cán bộ' },
    { key: 'canViewAudit', name: 'Xem Nhật Ký Kiểm Toán', desc: 'Theo dõi nhật ký truy vết chi tiết mọi thao tác trong hệ thống' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-slate-900 text-base">Hệ Thống Phân Quyền Người Dùng (RBAC)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Quản trị tài khoản cán bộ Trung tâm Bảo trợ xã hội Đà Nẵng theo 5 nhóm vai trò chuyên môn: Quản trị viên, Dược sĩ, Bác sĩ, Kế toán và Lãnh đạo.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          {/* Sub-tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'users' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Danh Sách Cán Bộ ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'matrix' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Ma Trận Quyền Hạn</span>
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Cán Bộ</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Bảng So Sánh Quyền Hạn 05 Vai Trò Nghiệp Vụ</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quyền hạn được thực thi nghiêm ngặt trên toàn hệ thống giao diện và thao tác dữ liệu.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-1/3">Tính năng & Thao tác</th>
                  {(['ADMIN', 'PHARMACIST', 'DOCTOR', 'ACCOUNTANT', 'LEADER'] as UserRole[]).map((r) => (
                    <th key={r} className="py-3 px-3 text-center">
                      <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadgeStyles[r]}`}>
                        {roleLabels[r]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissionFeatures.map((feat) => (
                  <tr key={feat.key} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{feat.name}</div>
                      <div className="text-[11px] text-slate-500">{feat.desc}</div>
                    </td>
                    {(['ADMIN', 'PHARMACIST', 'DOCTOR', 'ACCOUNTANT', 'LEADER'] as UserRole[]).map((r) => {
                      const allowed = ROLE_PERMISSIONS[r][feat.key];
                      return (
                        <td key={r} className="py-3 px-3 text-center">
                          {allowed ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300">
                              ✕
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Notice if current user is not admin */}
          {!isAdmin && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Bạn đang thao tác với vai trò <strong>{roleLabels[currentUser.role]}</strong> (Chế độ xem thông tin).
                  Để duyệt cán bộ hoặc đổi vai trò, vui lòng chuyển sang tài khoản <strong>Quản trị viên (Lê Minh Tuấn)</strong> từ menu góc trên bên phải.
                </span>
              </div>
            </div>
          )}

          {/* Pending Approvals Queue */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="font-bold text-slate-900 text-xs">
                  Yêu Cầu Đăng Ký Chờ Phê Duyệt ({pendingUsers.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Chỉ Admin mới có quyền kích hoạt</span>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Không có tài khoản nào đang chờ phê duyệt.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Họ và tên cán bộ</th>
                      <th className="py-2.5 px-4">Email / SĐT</th>
                      <th className="py-2.5 px-4">Đơn vị công tác</th>
                      <th className="py-2.5 px-4">Vai trò đề xuất</th>
                      <th className="py-2.5 px-4">Thời gian gửi</th>
                      <th className="py-2.5 px-4 text-right">Thao tác phê duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-mono">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{u.department}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadgeStyles[u.role]}`}>
                            {roleLabels[u.role]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(u.createdAt)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approveUser(u.id, u.role)}
                              disabled={!isAdmin}
                              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold disabled:opacity-40 transition-colors shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Phê Duyệt</span>
                            </button>
                            <button
                              onClick={() => rejectUser(u.id)}
                              disabled={!isAdmin}
                              className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold disabled:opacity-40 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Từ Chối</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Users List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800">
                Danh Sách Cán Bộ Đang Hoạt Động ({activeUsers.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                {isAdmin ? 'Quản trị viên có thể thay đổi trực tiếp vai trò' : 'Đã phân quyền bảo mật'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Họ và tên</th>
                    <th className="py-2.5 px-4">Email / SĐT</th>
                    <th className="py-2.5 px-4">Phòng ban</th>
                    <th className="py-2.5 px-4">Vai trò nghiệp vụ</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4 text-right">Phân quyền vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeUsers.map((u) => {
                    const isSelf = currentUser.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.2 rounded border border-teal-200">
                                Bạn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-mono">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{u.department}</td>
                        <td className="py-3 px-4">
                          {isAdmin ? (
                            <select
                              value={u.role}
                              onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                              className="text-xs font-semibold rounded-md border border-slate-300 py-1 px-2 bg-white text-slate-800 focus:outline-none focus:border-teal-500"
                            >
                              <option value="ADMIN">Quản trị viên (ADMIN)</option>
                              <option value="PHARMACIST">Dược sĩ / Kho Dược</option>
                              <option value="DOCTOR">Bác sĩ / Y sĩ</option>
                              <option value="ACCOUNTANT">Kế toán viên</option>
                              <option value="LEADER">Lãnh đạo đơn vị</option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${roleBadgeStyles[u.role]}`}>
                              {roleLabels[u.role]}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoạt động
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAdmin && !isSelf && (
                            <button
                              onClick={() => toggleUserStatus(u.id, 'DISABLED')}
                              className="text-[11px] text-slate-500 hover:text-red-600 font-medium px-2 py-1 rounded border border-transparent hover:border-red-200 transition-colors"
                              title="Tạm khóa quyền truy cập"
                            >
                              Khóa tài khoản
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal for Admin */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Thêm Hồ Sơ Cán Bộ Mới"
        subtitle="Quản trị viên trực tiếp khai báo và phân quyền cho cán bộ y tế, dược hoặc kế toán"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Email đăng nhập *</label>
            <input
              type="email"
              required
              placeholder="ten.nv@btxhdanang.gov.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Họ và tên cán bộ *</label>
            <input
              type="text"
              required
              placeholder="vd: BS. Lê Văn Minh"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Phòng ban / Đơn vị trực thuộc *</label>
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
            <input
              type="tel"
              placeholder="0905..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Vai trò nghiệp vụ đề xuất *</label>
            <select
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as UserRole)}
              className="w-full p-2 border border-slate-200 rounded-lg font-semibold"
            >
              <option value="PHARMACIST">Dược sĩ / Thủ kho (Quản lý nhập xuất, kho thuốc, báo cáo)</option>
              <option value="DOCTOR">Bác sĩ / Y sĩ (Kê đơn, theo dõi điều trị đối tượng)</option>
              <option value="ACCOUNTANT">Kế toán viên (Kiểm toán chứng từ, xuất tệp sao lưu)</option>
              <option value="LEADER">Lãnh đạo đơn vị (Xem báo cáo tổng hợp, giám sát)</option>
              <option value="ADMIN">Quản trị viên (Toàn quyền hệ thống)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Tạo Hồ Sơ & Cấp Quyền
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
