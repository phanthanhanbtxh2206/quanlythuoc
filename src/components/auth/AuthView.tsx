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
  KeyRound,
  ArrowRight,
  RefreshCw,
  Clock,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { REGISTRATION_DEPARTMENTS, UserRole } from '../../types';
import { isValidAppsScriptUrl } from '../../services/appsScriptSyncService';
import authHudHeroImg from '../../assets/images/auth_medical_hud_hero_1794844041635.jpg';

interface AuthViewProps {
  onSuccess?: () => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const FLOATING_NODES = [
  { id: 'n1', left: '14%', top: '24%', size: 6, duration: 7.5, delay: 0 },
  { id: 'n2', left: '84%', top: '20%', size: 8, duration: 9, delay: 0.8 },
  { id: 'n3', left: '22%', top: '76%', size: 7, duration: 8.5, delay: 1.4 },
  { id: 'n4', left: '78%', top: '72%', size: 5, duration: 6.8, delay: 0.4 },
  { id: 'n5', left: '50%', top: '12%', size: 6, duration: 10, delay: 1.1 },
  { id: 'n6', left: '34%', top: '52%', size: 5, duration: 8, delay: 2.0 },
  { id: 'n7', left: '68%', top: '48%', size: 7, duration: 9.2, delay: 0.6 },
];

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const {
    loginWithCredentials,
    registerNewAccount,
    templateSettings,
    sessionNotice,
    clearSessionNotice,
    pullFromSheetsAndDrive,
    isPullingFromCloud,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [heroLoaded, setHeroLoaded] = useState(true);

  // Login form state - starts completely empty with zero exposed credentials
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<string | null>(null);

  // Register form state - strictly restricted to the 3 official departments
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState<string>(REGISTRATION_DEPARTMENTS[0]);
  const [regRole, setRegRole] = useState<UserRole>('DOCTOR');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const hasCloudBridge = isValidAppsScriptUrl(templateSettings.appsScriptUrl);
  const parentOrgTitle = templateSettings.parentOrg || 'SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG';
  const centerTitle = /đà\s*nẵng/i.test(templateSettings.agencyName)
    ? templateSettings.agencyName
    : `${templateSettings.agencyName} ĐÀ NẴNG`;

  const handleManualCloudPull = async () => {
    setCloudSyncFeedback(null);
    setLoginError(null);
    const res = await pullFromSheetsAndDrive(false);
    if (res.success) {
      setCloudSyncFeedback(
        `Đã đồng bộ ${res.usersUpdated || 0} tài khoản mới nhất từ Google Sheets.`
      );
    } else {
      setLoginError(res.error || 'Chưa thể kết nối tới Google Sheets / Drive.');
    }
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setCloudSyncFeedback(null);

    if (!loginIdentifier.trim()) {
      setLoginError('Vui lòng nhập tài khoản đăng nhập.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoginLoading(true);
    try {
      if (hasCloudBridge) {
        await pullFromSheetsAndDrive(true);
      }

      const res = loginWithCredentials(loginIdentifier, loginPassword);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setLoginError(res.error || 'Thông tin đăng nhập không chính xác.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFormRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegMessage(null);

    if (!regFullName.trim()) {
      setRegMessage({ type: 'error', text: 'Vui lòng nhập Họ và tên.' });
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegMessage({ type: 'error', text: 'Vui lòng nhập Email hợp lệ.' });
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
    }, 200);
  };

  return (
    <div
      className="min-h-screen bg-[#050912] text-slate-100 relative overflow-hidden flex flex-col items-center justify-center p-5 sm:p-8"
      style={{
        backgroundImage:
          'linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px)',
        backgroundSize: '42px 42px',
      }}
    >
      {/* Atmospheric Futuristic Medical Backdrop */}
      {heroLoaded && (
        <img
          src={authHudHeroImg}
          alt="Kho dược"
          referrerPolicy="no-referrer"
          onError={() => setHeroLoaded(false)}
          className="pointer-events-none fixed inset-0 w-full h-full object-cover animate-backdrop-breathe"
        />
      )}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#050912]/88 via-[#050912]/78 to-[#050912]/94" />

      {/* Vivid Ambient Aurora Orbs */}
      <div
        className="pointer-events-none fixed -top-32 -left-28 w-[580px] h-[580px] rounded-full blur-3xl animate-aurora"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.48) 0%, transparent 68%)' }}
      />
      <div
        className="pointer-events-none fixed -bottom-36 -right-28 w-[560px] h-[560px] rounded-full blur-3xl animate-aurora-reverse"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.42) 0%, transparent 68%)' }}
      />

      {/* Concentric Animated Orbital HUD Backdrop Behind Centered Card */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
        <div className="relative w-[620px] h-[620px] sm:w-[760px] sm:h-[760px] opacity-55">
          <div className="absolute inset-0 rounded-full border border-cyan-400/20 border-dashed animate-hud-orbit" />
          <div className="absolute inset-12 rounded-full border border-emerald-400/25 border-t-transparent border-l-transparent animate-hud-orbit-reverse" />
          <div className="absolute inset-24 rounded-full border border-cyan-300/15 animate-hud-orbit" />
        </div>
      </div>

      {/* Floating Luminous Particle Nodes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {FLOATING_NODES.map((node) => (
          <motion.span
            key={node.id}
            style={{
              left: node.left,
              top: node.top,
              width: node.size,
              height: node.size,
            }}
            animate={{
              y: [0, -28, 0],
              x: [0, 12, 0],
              opacity: [0.25, 0.85, 0.25],
              scale: [0.9, 1.25, 0.9],
            }}
            transition={{
              duration: node.duration,
              delay: node.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]"
          />
        ))}
      </div>

      {/* Centered Minimal Auth Stage */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.48, ease: EASE_OUT }}
        className="relative z-10 w-full max-w-[440px] space-y-6"
      >
        {/* Clean Agency Header: Sở Y tế TP Đà Nẵng ABOVE Trung tâm Bảo trợ xã hội Đà Nẵng */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.08, ease: EASE_OUT }}
          className="text-center space-y-3"
        >
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-cyan-400/50 animate-hud-ripple" />
            <span className="absolute inset-0 rounded-full border border-dashed border-cyan-400/55 animate-hud-orbit" />
            <span className="absolute inset-1.5 rounded-full border border-emerald-400/45 border-t-transparent animate-hud-orbit-reverse" />
            <motion.div
              whileHover={{ scale: 1.08, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
              className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
            >
              <ShieldCheck className="w-5 h-5" />
            </motion.div>
          </div>

          <div className="space-y-1">
            <div className="text-xs sm:text-[13px] font-bold tracking-[0.12em] uppercase text-cyan-300">
              {parentOrgTitle}
            </div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight uppercase text-white">
              {centerTitle}
            </h1>
          </div>
        </motion.div>

        {/* Session Auto-Logout Notice */}
        <AnimatePresence>
          {sessionNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/45 text-amber-200 text-xs flex items-start justify-between gap-2.5 backdrop-blur-md"
            >
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{sessionNotice}</span>
              </div>
              <button
                type="button"
                onClick={clearSessionNotice}
                className="text-amber-300/80 hover:text-amber-100 shrink-0"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal Glass HUD Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.14, ease: EASE_OUT }}
          className="relative overflow-hidden p-6 sm:p-7 rounded-2xl bg-[#0B1324]/88 backdrop-blur-xl border border-cyan-400/30 shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
        >
          {/* Vivid sweeping cyan beam across top hairline */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-hud-sweep" />
          </div>

          {/* Segmented Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#050912]/90 border border-cyan-500/25 mb-5 relative">
            {(['login', 'register'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setLoginError(null);
                    setRegMessage(null);
                  }}
                  className={`relative z-10 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                    isActive ? 'text-cyan-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="auth-active-tab"
                      transition={{ type: 'spring', stiffness: 440, damping: 28 }}
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] -z-10"
                    />
                  )}
                  {tab === 'login' ? (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Đăng Nhập</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Đăng Ký</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Animated Tab Switch */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.div
                key="login-panel"
                initial={{ opacity: 0, x: -22, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 22, scale: 0.97 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="space-y-4"
              >
                {hasCloudBridge && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleManualCloudPull}
                      disabled={isPullingFromCloud}
                      className="text-[11px] text-cyan-300 hover:text-cyan-200 font-medium flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPullingFromCloud ? 'animate-spin' : ''}`} />
                      <span>{isPullingFromCloud ? 'Đang tải...' : 'Đồng bộ tài khoản'}</span>
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {cloudSyncFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/45 text-emerald-200 text-xs flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{cloudSyncFeedback}</span>
                    </motion.div>
                  )}

                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/45 text-rose-200 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleFormLogin} className="space-y-3.5" autoComplete="off">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Tài khoản
                    </label>
                    <div className="relative group">
                      <Mail className="w-4 h-4 text-cyan-400/70 group-focus-within:text-cyan-300 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Email / Số điện thoại / Họ tên"
                        autoComplete="username"
                        required
                        className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Mật khẩu
                    </label>
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-cyan-400/70 group-focus-within:text-cyan-300 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                        className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300"
                        aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.015, boxShadow: '0 0 28px rgba(6, 182, 212, 0.45)' }}
                    whileTap={{ scale: 0.975 }}
                    type="submit"
                    disabled={loginLoading}
                    className="relative overflow-hidden w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-[#050912] font-bold text-sm shadow-[0_8px_24px_rgba(6,182,212,0.32)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/35 blur-xs animate-cta-gleam" />
                    {loginLoading ? (
                      <div className="w-5 h-5 border-2 border-[#050912] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="relative z-10">Đăng Nhập</span>
                        <ArrowRight className="w-4 h-4 relative z-10" />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="register-panel"
                initial={{ opacity: 0, x: 22, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -22, scale: 0.97 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="space-y-3"
              >
                <AnimatePresence>
                  {regMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                        regMessage.type === 'success'
                          ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                          : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
                      }`}
                    >
                      {regMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>{regMessage.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleFormRegister} className="space-y-3" autoComplete="off">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Họ và tên <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 text-cyan-400/70 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Họ và tên cán bộ"
                          required
                          className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl pl-8.5 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Email <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-cyan-400/70 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="canbo@donvi.gov.vn"
                          required
                          className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl pl-8.5 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Số điện thoại</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-cyan-400/70 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0905 xxx xxx"
                          className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl pl-8.5 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Phòng ban <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        {REGISTRATION_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept} className="bg-[#0B1324] text-white">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Vai trò công tác <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="PHARMACIST" className="bg-[#0B1324] text-white">
                        Dược sĩ / Thủ kho
                      </option>
                      <option value="DOCTOR" className="bg-[#0B1324] text-white">
                        Bác sĩ / Y sĩ
                      </option>
                      <option value="ACCOUNTANT" className="bg-[#0B1324] text-white">
                        Kế toán viên
                      </option>
                      <option value="LEADER" className="bg-[#0B1324] text-white">
                        Lãnh đạo đơn vị
                      </option>
                      <option value="ADMIN" className="bg-[#0B1324] text-white">
                        Quản trị viên
                      </option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Mật khẩu <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-cyan-400/70 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mật khẩu"
                          required
                          className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl pl-8.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Xác nhận mật khẩu <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-cyan-400/70 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu"
                          required
                          className="w-full bg-[#050912]/90 border border-cyan-500/25 rounded-xl pl-8.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300"
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.015, boxShadow: '0 0 28px rgba(6, 182, 212, 0.45)' }}
                    whileTap={{ scale: 0.975 }}
                    type="submit"
                    disabled={regLoading}
                    className="relative overflow-hidden w-full mt-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-[#050912] font-bold text-sm shadow-[0_8px_24px_rgba(6,182,212,0.32)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/35 blur-xs animate-cta-gleam" />
                    {regLoading ? (
                      <div className="w-5 h-5 border-2 border-[#050912] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Đăng Ký Tài Khoản</span>
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};
