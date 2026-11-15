import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
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
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { loginWithCredentials, registerNewAccount, templateSettings } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [heroLoaded, setHeroLoaded] = useState(true);

  // Login form state - MUST start completely empty with zero leaked credentials
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginIdentifier.trim()) {
      setLoginError('Vui lòng nhập Email, Số điện thoại hoặc Tên đăng nhập cán bộ.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Vui lòng nhập mật khẩu đăng nhập.');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 grid grid-cols-1 lg:grid-cols-12 items-stretch">
      {/* Left Column: Clinical Pharmacy Editorial Hero & Workflow Overview */}
      <aside className="lg:col-span-7 relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-950 to-slate-950 flex flex-col justify-between min-h-[340px] lg:min-h-screen">
        {heroLoaded && (
          <img
            src="/src/assets/images/auth_pharmacy_hero_1794757706231.jpg"
            alt="Phòng Dược & Kho Thuốc Trung tâm Bảo trợ xã hội Đà Nẵng"
            referrerPolicy="no-referrer"
            onError={() => setHeroLoaded(false)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        )}
        {/* Multi-stop Scrim for Crisp Typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-teal-950/60" />

        {/* Top Institutional Identity */}
        <div className="relative z-10 p-6 sm:p-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-400/40 backdrop-blur-md flex items-center justify-center text-teal-300 shadow-lg">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-teal-300 tracking-widest uppercase">
                {templateSettings.parentOrg}
              </p>
              <div className="text-sm font-bold text-white tracking-tight mt-0.5">
                {templateSettings.agencyName} — {templateSettings.deptName}
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Mã QHNS</div>
            <div className="font-mono text-sm font-bold text-teal-300 tabular-nums">{templateSettings.qhnsCode}</div>
          </div>
        </div>

        {/* Center / Bottom Editorial Narrative */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-12 space-y-8">
          <div className="max-w-xl space-y-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-teal-400">
              Hệ thống quản lý dược & vật tư y tế nội bộ
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
              Minh bạch tồn kho theo lô, chuẩn hóa chứng từ BHYT theo mẫu BTC
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Quản lý toàn trình từ phiếu nhập kho mua ngoài (C20-HD), phiếu xuất cấp phát theo đối tượng (C21-HD), đơn thuốc điều trị đến tổng hợp báo cáo nhập – xuất – tồn cuối kỳ.
            </p>
          </div>

          {/* 3 Concrete Operational Capabilities (Clean architectural cards, zero pill badges, zero border-l-4) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl">
            <div className="p-4 rounded-xl bg-slate-900/75 border border-slate-700/70 backdrop-blur-md">
              <ClipboardCheck className="w-5 h-5 text-teal-400 mb-2" />
              <div className="text-xs font-bold text-white">Chứng từ {templateSettings.receiptFormCode.replace('Mẫu số: ', '')} / {templateSettings.issueFormCode.replace('Mẫu số: ', '')}</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Kiểm soát chính xác số lô, đơn giá nguyên bản và khóa xuất âm tự động.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/75 border border-slate-700/70 backdrop-blur-md">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-xs font-bold text-white">Báo cáo BHYT đối tượng</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Tổng hợp 05 nhóm tồn đầu, nhập, tổng nhập, xuất và tồn cuối trên 1 dòng.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/75 border border-slate-700/70 backdrop-blur-md">
              <Building2 className="w-5 h-5 text-sky-400 mb-2" />
              <div className="text-xs font-bold text-white">Phân quyền 5 vai trò</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Tách bạch quyền hạn Quản trị viên, Dược sĩ, Bác sĩ, Kế toán và Lãnh đạo.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>© 2026 {templateSettings.agencyName} ({templateSettings.facilityAddress})</span>
            <span>Truy cập nội bộ được kiểm toán bởi Nhật ký hệ thống</span>
          </div>
        </div>
      </aside>

      {/* Right Column: Clean Interactive Authentication Surface */}
      <main className="lg:col-span-5 bg-slate-50 text-slate-900 flex flex-col justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md mx-auto">
          {/* Segmented Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/80 border border-slate-300/80 mb-7">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegMessage(null);
              }}
              className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Đăng Ký Tài Khoản</span>
            </button>
          </div>

          {/* Tab 1: Login Form */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Đăng nhập cổng cán bộ
                </h2>
                <p className="text-xs text-slate-500 mt-1.5">
                  Sử dụng tài khoản nội bộ đã được cấp hoặc phê duyệt bởi đơn vị để làm việc.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleFormLogin} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tài khoản đăng nhập (Email / Số điện thoại / Họ tên)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="canbo@donvi.gov.vn"
                      autoComplete="username"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Nhập mật khẩu bảo mật..."
                      autoComplete="current-password"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Đăng Nhập Hệ Thống</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Cán bộ mới nhận nhiệm vụ?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setRegMessage(null);
                    }}
                    className="text-teal-700 hover:text-teal-900 font-semibold"
                  >
                    Đăng ký cấp tài khoản
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Register Form */}
          {activeTab === 'register' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Đăng ký hồ sơ cán bộ
                </h2>
                <p className="text-xs text-slate-500 mt-1.5">
                  Điền thông tin công tác và vai trò đề xuất để Ban quản trị xét duyệt kích hoạt.
                </p>
              </div>

              {regMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    regMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {regMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{regMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleFormRegister} className="space-y-3.5" autoComplete="off">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên cán bộ <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="BS. Nguyễn Văn An"
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Địa chỉ Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="canbo@donvi.gov.vn"
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0905 xxx xxx"
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phòng ban / Đơn vị <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      <option value="Phòng Y tế - PHCN">Phòng Y tế & PHCN</option>
                      <option value="Kho Dược Trung Tâm">Kho Dược Trung Tâm</option>
                      <option value="Phòng Kế Toán - Tài Chính">Phòng Kế Toán - Tài Chính</option>
                      <option value="Ban Giám Đốc Trung Tâm">Ban Giám Đốc Trung Tâm</option>
                      <option value="Tổ Y Tế Khu Chăm Sóc">Tổ Y Tế Khu Chăm Sóc</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò công tác đề xuất <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-teal-600"
                  >
                    <option value="PHARMACIST">Dược sĩ / Thủ kho (Nhập xuất, quản lý kho dược, báo cáo)</option>
                    <option value="DOCTOR">Bác sĩ / Y sĩ kê đơn (Kê đơn điều trị, xuất cấp phát)</option>
                    <option value="ACCOUNTANT">Kế toán viên (Kiểm tra chứng từ, xuất tệp Excel 03 sheet)</option>
                    <option value="LEADER">Lãnh đạo đơn vị (Xem báo cáo tổng hợp, kiểm toán)</option>
                    <option value="ADMIN">Quản trị viên hệ thống (Toàn quyền quản trị)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tài khoản sau khi gửi sẽ ở trạng thái chờ Quản trị viên phê duyệt và cấp quyền truy cập.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 3 ký tự"
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Xác nhận mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {regLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Gửi Yêu Cầu Đăng Ký Tài Khoản</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Đã có tài khoản hoạt động?</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-teal-700 hover:text-teal-900 font-semibold"
                  >
                    Quay lại Đăng nhập
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
