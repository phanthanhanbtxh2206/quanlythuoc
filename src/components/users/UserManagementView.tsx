/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { ShieldCheck, UserPlus, Check, X, UserX, AlertCircle, Building2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { formatDate } from '../../utils/formatters';

export const UserManagementView: React.FC = () => {
  const { users, currentUser, registerUser, approveUser, rejectUser } = useApp();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Form State for User Registration
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Phòng Y Tế - PHCN');
  const [phone, setPhone] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('DOCTOR');

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Quản trị hệ thống',
    DOCTOR: 'Bác sĩ / Y sĩ kê đơn',
    PHARMACIST: 'Dược sĩ / Quản lý kho',
    ACCOUNTANT: 'Kế toán viên',
    LEADER: 'Lãnh đạo đơn vị',
  };

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
  };

  const pendingUsers = users.filter((u) => u.status === 'PENDING_APPROVAL');
  const activeUsers = users.filter((u) => u.status === 'ACTIVE');
  const rejectedUsers = users.filter((u) => u.status === 'REJECTED');

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header & Registration Trigger */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Quản Lý Tài Khoản, Phê Duyệt & Phân Quyền (RBAC)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy trình phê duyệt chặt chẽ: Tài khoản đăng ký mới ở trạng thái Chờ duyệt; Quản trị viên kiểm tra thông
            tin và gán vai trò tương ứng trước khi cho phép truy cập dữ liệu y tế.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Đăng Ký Tài Khoản Mới</span>
        </button>
      </div>

      {/* Warning if current user is not admin */}
      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Bạn đang đăng nhập với vai trò <strong>{roleLabels[currentUser.role]}</strong>. Để phê duyệt tài khoản, hãy
            dùng menu trên Header chuyển sang tài khoản <strong>Quản trị viên (Lê Minh Tuấn)</strong>.
          </span>
        </div>
      )}

      {/* Pending Approvals Queue */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="font-bold text-slate-900 text-xs">Yêu Cầu Chờ Quản Trị Viên Phê Duyệt ({pendingUsers.length})</h4>
          </div>
          <span className="text-2xs text-slate-500">Chặn truy cập dữ liệu cho đến khi được duyệt</span>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Hiện không có yêu cầu đăng ký nào đang chờ duyệt.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-2xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Họ và tên</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Bộ phận / Phòng ban</th>
                <th className="py-2.5 px-4">Vai trò yêu cầu</th>
                <th className="py-2.5 px-4">Ngày gửi</th>
                <th className="py-2.5 px-4 text-right">Hành động của Quản trị viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                  <td className="py-3 px-4 text-slate-700">{u.department}</td>
                  <td className="py-3 px-4 font-semibold text-teal-800">{roleLabels[u.role]}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => approveUser(u.id, u.role)}
                        disabled={!isAdmin}
                        className="flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-2xs font-semibold disabled:opacity-40 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Phê Duyệt</span>
                      </button>
                      <button
                        onClick={() => rejectUser(u.id)}
                        disabled={!isAdmin}
                        className="flex items-center gap-1 px-3 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-2xs font-semibold disabled:opacity-40 transition-colors"
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
        )}
      </div>

      {/* Active Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
          Danh Sách Tài Khoản Đang Hoạt Động ({activeUsers.length})
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/50 text-slate-600 uppercase text-2xs font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Họ và tên</th>
              <th className="py-2.5 px-4">Email</th>
              <th className="py-2.5 px-4">Phòng ban</th>
              <th className="py-2.5 px-4">Vai trò hệ thống</th>
              <th className="py-2.5 px-4">Trạng thái</th>
              <th className="py-2.5 px-4">Người duyệt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                <td className="py-3 px-4 text-slate-700">{u.department}</td>
                <td className="py-3 px-4 font-semibold text-teal-800">{roleLabels[u.role]}</td>
                <td className="py-3 px-4">
                  <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Đang hoạt động
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">{u.approvedBy || 'Mặc định'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Register Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Đăng Ký Tài Khoản Sử Dụng Phần Mềm"
        subtitle="Sau khi đăng ký, tài khoản sẽ ở trạng thái Chờ duyệt cho đến khi Quản trị viên kích hoạt"
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
            <label className="block text-slate-700 font-semibold mb-1">Họ và tên *</label>
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
              <option value="DOCTOR">Bác sĩ / Y sĩ (Kê đơn, theo dõi điều trị đối tượng)</option>
              <option value="PHARMACIST">Dược sĩ / Thủ kho (Nhập xuất kho, theo dõi hạn dùng)</option>
              <option value="ACCOUNTANT">Kế toán viên (Kiểm toán số liệu, đối soát hóa đơn)</option>
              <option value="LEADER">Lãnh đạo đơn vị (Xem báo cáo, ký duyệt chứng từ)</option>
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
              Gửi Đăng Ký
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
