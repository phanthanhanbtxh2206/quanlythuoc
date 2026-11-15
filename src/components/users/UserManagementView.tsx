import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole, UserStatus, ROLE_PERMISSIONS } from '../../types';
import {
  ShieldCheck,
  UserPlus,
  Check,
  X,
  AlertCircle,
  TableProperties,
  Users as UsersIcon,
  Lock,
  Unlock,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { formatDate } from '../../utils/formatters';

export const UserManagementView: React.FC = () => {
  const {
    users,
    currentUser,
    hasPermission,
    registerNewAccount,
    approveUser,
    rejectUser,
    changeUserRole,
    toggleUserStatus,
    updateUserAccount,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED_OR_DISABLED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Create User Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newFullName, setNewFullName] = useState('');
  const [newDepartment, setNewDepartment] = useState('Phòng Y tế - PHCN');
  const [newPhone, setNewPhone] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('DOCTOR');
  const [autoActivate, setAutoActivate] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  // Full Edit User Modal State (Admin Only)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('DOCTOR');
  const [editStatus, setEditStatus] = useState<UserStatus>('ACTIVE');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Quản trị viên',
    DOCTOR: 'Bác sĩ / Y sĩ',
    PHARMACIST: 'Dược sĩ / Kho Dược',
    ACCOUNTANT: 'Kế toán viên',
    LEADER: 'Lãnh đạo đơn vị',
  };

  const roleBadgeStyles: Record<UserRole, string> = {
    ADMIN: 'bg-purple-50 text-purple-800 border-purple-200',
    PHARMACIST: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    DOCTOR: 'bg-blue-50 text-blue-800 border-blue-200',
    ACCOUNTANT: 'bg-amber-50 text-amber-800 border-amber-200',
    LEADER: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  };

  const statusLabels: Record<UserStatus, { label: string; style: string }> = {
    ACTIVE: { label: 'Hoạt động', style: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    PENDING_APPROVAL: { label: 'Chờ duyệt', style: 'text-amber-700 bg-amber-50 border-amber-200' },
    LOCKED: { label: 'Đang khóa', style: 'text-rose-700 bg-rose-50 border-rose-200' },
    DISABLED: { label: 'Ngưng hoạt động', style: 'text-slate-600 bg-slate-100 border-slate-300' },
    REJECTED: { label: 'Đã từ chối', style: 'text-rose-700 bg-rose-50 border-rose-200' },
  };

  const isAdmin = currentUser.role === 'ADMIN' && hasPermission('canManageUsers');

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackToast({ type, text });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setCreateError(null);
    setNewEmail('');
    setNewPassword('123456');
    setNewFullName('');
    setNewDepartment('Phòng Y tế - PHCN');
    setNewPhone('');
    setRequestedRole('DOCTOR');
    setAutoActivate(true);
    setIsRegisterModalOpen(true);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newEmail.trim() || !newFullName.trim()) {
      setCreateError('Vui lòng điền đầy đủ Email và Họ tên cán bộ.');
      return;
    }
    if (newPassword.length < 3) {
      setCreateError('Mật khẩu khởi tạo phải có ít nhất 3 ký tự.');
      return;
    }

    const res = registerNewAccount({
      email: newEmail.trim(),
      fullName: newFullName.trim(),
      department: newDepartment.trim() || 'Phòng Y tế - PHCN',
      phone: newPhone.trim(),
      role: requestedRole,
      password: newPassword,
      autoApprove: autoActivate,
    });

    if (!res.success) {
      setCreateError(res.message);
      return;
    }

    setIsRegisterModalOpen(false);
    showToast('success', `Đã thêm tài khoản ${newFullName.trim()} thành công.`);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setEditFullName(u.fullName);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditDepartment(u.department);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditNewPassword('');
    setShowEditPassword(false);
    setEditError(null);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editFullName.trim() || !editEmail.trim()) {
      setEditError('Họ tên và Email đăng nhập không được để trống.');
      return;
    }
    if (editNewPassword && editNewPassword.length < 3) {
      setEditError('Mật khẩu đặt lại phải có ít nhất 3 ký tự.');
      return;
    }

    const res = updateUserAccount(editingUser.id, {
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      department: editDepartment.trim(),
      role: editRole,
      status: editStatus,
      password: editNewPassword.trim() ? editNewPassword.trim() : undefined,
    });

    if (!res.success) {
      setEditError(res.error || 'Không thể cập nhật thông tin tài khoản.');
      return;
    }

    setEditingUser(null);
    showToast('success', `Đã cập nhật đầy đủ thông tin tài khoản ${editFullName.trim()}.`);
  };

  const pendingUsers = users.filter((u) => u.status === 'PENDING_APPROVAL');
  const directoryUsers = users
    .filter((u) => u.status !== 'PENDING_APPROVAL')
    .filter((u) => {
      if (statusFilter === 'ACTIVE') return u.status === 'ACTIVE';
      if (statusFilter === 'LOCKED_OR_DISABLED') return u.status === 'LOCKED' || u.status === 'DISABLED';
      if (statusFilter === 'REJECTED') return u.status === 'REJECTED';
      return true;
    })
    .filter((u) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
      );
    });

  // Permission Matrix Feature Definitions (including Admin-only Cloud Sync)
  const permissionFeatures: { key: keyof typeof ROLE_PERMISSIONS['ADMIN']; name: string; desc: string }[] = [
    { key: 'canCreateReceipt', name: 'Lập Phiếu Nhập Kho', desc: 'Tạo phiếu nhập mới C20-HD, thêm thuốc tự do, nhập đơn giá chi tiết' },
    { key: 'canEditReceipt', name: 'Chỉnh Sửa Phiếu Nhập', desc: 'Sửa nội dung chứng từ, số lô, số lượng phiếu nhập đã lập' },
    { key: 'canDeleteReceipt', name: 'Xóa Phiếu Nhập', desc: 'Xóa phiếu nhập và trừ lại số lượng trong kho' },
    { key: 'canCreateIssue', name: 'Lập Phiếu Xuất Kho', desc: 'Tạo phiếu xuất C21-HD, trích xuất thuốc theo đối tượng' },
    { key: 'canEditIssue', name: 'Chỉnh Sửa Phiếu Xuất', desc: 'Sửa thuốc xuất, người nhận, lý do xuất kho' },
    { key: 'canDeleteIssue', name: 'Xóa Phiếu Xuất', desc: 'Hủy phiếu xuất và hoàn trả thuốc về kho' },
    { key: 'canEditReport', name: 'Hiệu Chỉnh Biểu Mẫu Báo Cáo', desc: 'Bật chế độ sửa số liệu, đơn giá, ngày tháng trên bảng báo cáo' },
    { key: 'canExportReport', name: 'Xuất Báo Cáo & In Ấn', desc: 'Xuất file Excel 03 sheet, CSV, in trực tiếp theo khổ A4' },
    { key: 'canManageSettings', name: 'Cấu Hình Biểu Mẫu Mặc Định', desc: 'Thay đổi tiêu ngữ, tiêu đề, tên cột, ghi chú và chữ ký' },
    { key: 'canManageUsers', name: 'Phân Quyền & Cán Bộ', desc: 'Duyệt tài khoản mới, chỉnh sửa toàn bộ hồ sơ, đặt lại mật khẩu, khóa/mở tài khoản' },
    { key: 'canViewAudit', name: 'Xem Nhật Ký Kiểm Toán', desc: 'Theo dõi nhật ký truy vết chi tiết mọi thao tác trong hệ thống' },
    { key: 'canManageSync', name: 'Sao Lưu & Đồng Bộ Google Sheets / Drive', desc: 'Kết nối Apps Script & OAuth, tự động đồng bộ 03 Sheet và lưu chứng từ lên Drive (Chỉ Admin)' },
  ];

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const lockedCount = users.filter((u) => u.status === 'LOCKED' || u.status === 'DISABLED').length;

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-slate-900 text-base">Quản Trị Cán Bộ & Phân Quyền (RBAC)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Quản lý toàn bộ hồ sơ tài khoản, vai trò nghiệp vụ, khóa/mở truy cập, đặt lại mật khẩu và phê duyệt cán bộ đăng ký mới.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'users' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span className="tabular-nums">Danh Sách Cán Bộ ({users.length})</span>
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
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Cán Bộ</span>
            </button>
          )}
        </div>
      </div>

      {feedbackToast && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 shadow-2xs ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedbackToast.text}</span>
        </div>
      )}

      {/* Permission Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Bảng So Sánh Quyền Hạn 05 Vai Trò Nghiệp Vụ</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quyền hạn được kiểm soát chặt chẽ trên toàn hệ thống giao diện, chứng từ và kênh đồng bộ đám mây.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-1/3">Tính năng & Thao tác</th>
                  {(['ADMIN', 'PHARMACIST', 'DOCTOR', 'ACCOUNTANT', 'LEADER'] as UserRole[]).map((r) => (
                    <th key={r} className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadgeStyles[r]}`}>
                        {roleLabels[r]}
                      </span>
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
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-400">
                              –
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
          {!isAdmin && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bạn đang xem với vai trò <strong>{roleLabels[currentUser.role]}</strong>. Chỉ Quản trị viên hệ thống (ADMIN) mới có quyền phê duyệt, chỉnh sửa thông tin, đặt lại mật khẩu hoặc khóa/mở tài khoản cán bộ.
              </span>
            </div>
          )}

          {/* Pending Approvals Queue */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span>Yêu Cầu Đăng Ký Chờ Phê Duyệt</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 font-mono tabular-nums text-[11px]">
                  {pendingUsers.length}
                </span>
              </h3>
              <span className="text-[11px] text-slate-600 font-medium">Chỉ Admin có quyền kích hoạt</span>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400">
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
                      <th className="py-2.5 px-4">Ngày gửi</th>
                      <th className="py-2.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-mono">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400 tabular-nums">{u.phone}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{u.department}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadgeStyles[u.role]}`}>
                            {roleLabels[u.role]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 tabular-nums">{formatDate(u.createdAt)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Chỉnh sửa</span>
                              </button>
                            )}
                            <button
                              onClick={() => approveUser(u.id, u.role)}
                              disabled={!isAdmin}
                              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold disabled:opacity-40 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Phê Duyệt</span>
                            </button>
                            <button
                              onClick={() => rejectUser(u.id)}
                              disabled={!isAdmin}
                              className="flex items-center gap-1 px-2.5 py-1 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-md text-[11px] font-semibold disabled:opacity-40 transition-colors"
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

          {/* Complete User Directory (Active, Locked, Disabled, Rejected) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-xs text-slate-900 mr-2">Danh Sách Tài Khoản Cán Bộ</h3>
                <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[11px]">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({users.length - pendingUsers.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      statusFilter === 'ACTIVE' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hoạt động ({activeCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('LOCKED_OR_DISABLED')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      statusFilter === 'LOCKED_OR_DISABLED' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đang khóa ({lockedCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('REJECTED')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      statusFilter === 'REJECTED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Từ chối
                  </button>
                </div>
              </div>

              <div className="relative w-full lg:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên, email, SĐT, phòng..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-hidden focus:border-teal-500"
                />
              </div>
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
                    <th className="py-2.5 px-4 text-right">Quản trị tài khoản</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {directoryUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Không có tài khoản nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    directoryUsers.map((u) => {
                      const isSelf = currentUser.id === u.id;
                      const st = statusLabels[u.status] || statusLabels.ACTIVE;
                      const isLocked = u.status === 'LOCKED' || u.status === 'DISABLED';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200 font-semibold">
                                  Đang đăng nhập
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div className="font-mono">{u.email}</div>
                            {u.phone && <div className="text-[10px] text-slate-400 tabular-nums">{u.phone}</div>}
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
                            <span className={`inline-flex items-center text-[11px] font-semibold border px-2 py-0.5 rounded ${st.style}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-800 text-[11px] font-semibold transition-colors"
                                  title="Chỉnh sửa toàn bộ thông tin, vai trò, trạng thái và mật khẩu"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Chỉnh sửa</span>
                                </button>
                                {!isSelf && (
                                  <button
                                    onClick={() => toggleUserStatus(u.id, isLocked ? 'ACTIVE' : 'LOCKED')}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                                      isLocked
                                        ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                        : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                    }`}
                                    title={isLocked ? 'Mở khóa tài khoản để cho phép đăng nhập lại' : 'Khóa tạm thời quyền truy cập'}
                                  >
                                    {isLocked ? (
                                      <>
                                        <Unlock className="w-3 h-3" />
                                        <span>Mở khóa</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-3 h-3" />
                                        <span>Khóa</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Chỉ xem</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal (Admin Only) */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Thêm Hồ Sơ Cán Bộ Mới"
        subtitle="Quản trị viên trực tiếp khai báo tài khoản và phân quyền cho cán bộ đơn vị"
        maxWidth="md"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
          {createError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Email đăng nhập *</label>
            <input
              type="email"
              required
              placeholder="canbo@donvi.gov.vn"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Họ và tên cán bộ *</label>
            <input
              type="text"
              required
              placeholder="vd: BS. Lê Văn Minh"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Phòng ban / Đơn vị *</label>
              <input
                type="text"
                required
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số điện thoại liên hệ</label>
              <input
                type="tel"
                placeholder="0905..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Vai trò nghiệp vụ *</label>
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                className="w-full p-2 border border-slate-200 rounded-lg font-semibold"
              >
                <option value="PHARMACIST">Dược sĩ / Thủ kho</option>
                <option value="DOCTOR">Bác sĩ / Y sĩ</option>
                <option value="ACCOUNTANT">Kế toán viên</option>
                <option value="LEADER">Lãnh đạo đơn vị</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mật khẩu khởi tạo *</label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={autoActivate}
              onChange={(e) => setAutoActivate(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="font-medium text-slate-700">Kích hoạt tài khoản hoạt động ngay</span>
          </label>

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

      {/* Full Edit User Modal (Admin Only) */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Chỉnh Sửa Tài Khoản: ${editingUser?.fullName || ''}`}
        subtitle="Admin có quyền cập nhật toàn bộ thông tin cá nhân, vai trò, trạng thái khóa/mở và đặt lại mật khẩu"
        maxWidth="md"
      >
        <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
          {editError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Họ và tên cán bộ *</label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email đăng nhập *</label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="0905 xxx xxx"
                className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Phòng ban / Đơn vị *</label>
              <input
                type="text"
                required
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Vai trò phân quyền *</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white focus:border-teal-600"
              >
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                <option value="PHARMACIST">Dược sĩ / Kho Dược</option>
                <option value="DOCTOR">Bác sĩ / Y sĩ</option>
                <option value="ACCOUNTANT">Kế toán viên</option>
                <option value="LEADER">Lãnh đạo đơn vị</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Trạng thái tài khoản *</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                className="w-full p-2 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white focus:border-teal-600"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="LOCKED">Đang khóa (LOCKED)</option>
                <option value="DISABLED">Ngưng sử dụng (DISABLED)</option>
                <option value="PENDING_APPROVAL">Chờ phê duyệt (PENDING)</option>
                <option value="REJECTED">Từ chối (REJECTED)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <label className="block text-slate-800 font-semibold">
              Đặt lại mật khẩu mới (tùy chọn)
            </label>
            <div className="relative">
              <input
                type={showEditPassword ? 'text' : 'password'}
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                placeholder="Để trống nếu giữ nguyên mật khẩu hiện tại"
                className="w-full p-2 pr-9 border border-slate-300 rounded-lg bg-white text-slate-900 focus:border-teal-600"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Nếu nhập mật khẩu mới, tài khoản sẽ sử dụng mật khẩu mới ngay trong lần đăng nhập kế tiếp.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Lưu Tất Cả Thay Đổi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
