import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Pill,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { loginWithCredentials, registerNewAccount } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state - prefill Admin for convenience
  const [loginIdentifier, setLoginIdentifier] = useState('admin@btxh.danang.gov.vn');
  const [loginPassword, setLoginPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('Phòng Y tế - PHCN');
  const [regRole, setRegRole] = useState<UserRole>('DOCTOR');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginIdentifier.trim()) {
      setLoginError('Vui lòng nhập Email, Số điện thoại hoặc Họ tên cán bộ.');
      return;
    }

    setLoginLoading(true);
    setTimeout(() => {
      const res = loginWithCredentials(loginIdentifier, loginPassword);
      setLoginLoading(false);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setLoginError(res.error || 'Đăng nhập không thành công.');
      }
    }, 200);
  };

  const handleFormRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage(null);

    if (!regFullName.trim()) {
      setRegMessage({ type: 'error', text: 'Vui lòng nhập Họ và tên cán bộ.' });
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegMessage({ type: 'error', text: 'Vui lòng nhập địa chỉ Email hợp lệ.' });
      return;
    }
    if (regPassword.length < 3) {
      setRegMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 3 ký tự.' });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setRegLoading(true);
    setTimeout(() => {
      // Default to standard registration: requires admin approval
      const res = registerNewAccount({
        fullName: regFullName,
        email: regEmail,
        phone: regPhone,
        department: regDepartment,
        role: regRole,
        password: regPassword,
        autoApprove: false,
      });
      setRegLoading(false);

      if (res.success) {
        setRegMessage({ type: 'success', text: res.message });
        setRegFullName('');
        setRegEmail('');
        setRegPhone('');
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        setRegMessage({ type: 'error', text: res.message });
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100">
      {/* Top Banner Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">
                SỞ LAO ĐỘNG - THƯƠNG BINH & XÃ HỘI TP ĐÀ NẴNG
              </p>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                TRUNG TÂM BẢO TRỢ XÃ HỘI - HỆ THỐNG QUẢN LÝ DƯỢC & KHO THUỐC BHYT
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Hệ thống phân quyền nội bộ
            </span>
          </div>
        </div>
      </header>

      {/* Main Container: Centered Authentication Card */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-700 bg-slate-900/60 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Đăng Nhập Cán Bộ
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Đăng Ký Tài Khoản Mới
            </button>
          </div>

          {/* Tab 1: Login Form */}
          {activeTab === 'login' && (
            <div className="p-6 sm:p-8">
              <div className="mb-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">Cổng Xác Thực Cán Bộ Đơn Vị</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Nhập thông tin tài khoản được cấp bởi Trung tâm Bảo trợ xã hội Đà Nẵng
                </p>
              </div>

              {loginError && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>{loginError}</div>
                </div>
              )}

              <form onSubmit={handleFormLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tài khoản đăng nhập (Email / Số điện thoại / Tên đăng nhập)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="ví dụ: admin@btxh.danang.gov.vn hoặc admin"
                      required
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      required
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Admin account hint card */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Tài khoản Quản trị viên (Admin) mặc định:</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-300 pt-0.5">
                    <span>Email: <strong className="text-white">admin@btxh.danang.gov.vn</strong> (hoặc <strong className="text-white">admin</strong>)</span>
                    <span>Mật khẩu: <strong className="text-white">admin</strong></span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Đăng Nhập Vào Hệ Thống
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Chưa có tài khoản cán bộ? Nhấn vào đây để Đăng ký mới
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Register Form */}
          {activeTab === 'register' && (
            <div className="p-6 sm:p-8">
              <div className="mb-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">Đăng Ký Hồ Sơ Cán Bộ Mới</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Khai báo thông tin cán bộ y tế, dược hoặc kế toán để được Quản trị viên cấp quyền
                </p>
              </div>

              {regMessage && (
                <div
                  className={`mb-5 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    regMessage.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : 'bg-red-950/60 border-red-500/50 text-red-200'
                  }`}
                >
                  {regMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>{regMessage.text}</div>
                </div>
              )}

              <form onSubmit={handleFormRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Họ và tên cán bộ <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="ví dụ: BS. Nguyễn Văn An"
                        required
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Địa chỉ Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="canbo@btxh.danang.gov.vn"
                        required
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0905 xxx xxx"
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Phòng ban / Đơn vị <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Phòng Y tế - PHCN">Phòng Y tế & PHCN</option>
                      <option value="Kho Dược Trung Tâm">Kho Dược Trung Tâm</option>
                      <option value="Phòng Kế Toán - Tài Chính">Phòng Kế Toán - Tài Chính</option>
                      <option value="Ban Giám Đốc Trung Tâm">Ban Giám Đốc Trung Tâm</option>
                      <option value="Tổ Y Tế Trại Dưỡng Lão">Tổ Y Tế Trại Dưỡng Lão</option>
                    </select>
                  </div>
                </div>

                {/* Role Requested Dropdown (Menu sổ xuống) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Vai trò công tác đề xuất <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="PHARMACIST">Dược sĩ / Quản lý kho dược (Nhập xuất, quản lý thuốc, báo cáo)</option>
                    <option value="DOCTOR">Bác sĩ / Y sĩ kê đơn (Kê đơn điều trị, cấp phát đối tượng)</option>
                    <option value="ACCOUNTANT">Kế toán viên (Kiểm toán chứng từ, xuất tệp sao lưu 03 sheet)</option>
                    <option value="LEADER">Lãnh đạo đơn vị (Xem báo cáo tổng hợp, giám sát)</option>
                    <option value="ADMIN">Quản trị viên hệ thống (Toàn quyền quản trị)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hồ sơ đăng ký sẽ được gửi tới Ban Giám Đốc / Quản trị viên để phê duyệt và cấp quyền truy cập.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mật khẩu đăng nhập <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 3 ký tự"
                        required
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Xác nhận mật khẩu <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        required
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {regLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-5 h-5" />
                        Gửi Yêu Cầu Đăng Ký Tài Khoản
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Đã có tài khoản? Quay lại trang Đăng nhập
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        <p>© 2026 Trung tâm Bảo trợ xã hội Đà Nẵng — Phòng Y tế & Phục hồi chức năng. Hệ thống quản trị nội bộ.</p>
      </footer>
    </div>
  );
};
