import React, { useState, useEffect, useRef } from 'react';
import { 
  Factory, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Layers,
  QrCode,
  Camera,
  Scan,
  Sparkles,
  CheckCircle2,
  UserCheck,
  HelpCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MobileCameraScannerModal } from '../components/MobileCameraScannerModal';
import { ERPEmployee } from '../types';
import { convertRuCharToEn, convertRuToEnLayout, normalizeBarcodeScan } from '../utils';

interface ERPLoginViewProps {

  company: any;
  aliasOrId: string;
  onSuccessLogin: (userData: any, token: string) => void;
}

export const ERPLoginView: React.FC<ERPLoginViewProps> = ({
  company,
  aliasOrId,
  onSuccessLogin,
}) => {
  const [loginMode, setLoginMode] = useState<'password' | 'badge'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBadgeUser, setSuccessBadgeUser] = useState<ERPEmployee | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [manualBadgeInput, setManualBadgeInput] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const companyName = company?.name || 'Мебельное производство';
  const logoUrl = company?.logoUrl || company?.landingPage?.logoUrl || (company?.photos && company.photos[0]);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Play audio confirmation
  const playLoginSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  // Process Scanned Badge Code
  const handleProcessBadgeCode = async (scannedCode: string) => {
    if (!scannedCode || !scannedCode.trim()) return;
    const cleanCode = normalizeBarcodeScan(scannedCode);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch company employees
      let companyEmployees: ERPEmployee[] = [];
      const targetCompanyId = company?.id || aliasOrId;

      if (targetCompanyId) {
        try {
          const empRes = await fetch(`/api/erp/${targetCompanyId}/employees`);
          if (empRes.ok) {
            const empData = await empRes.json();
            if (Array.isArray(empData.employees)) {
              companyEmployees = empData.employees;
            }
          }
        } catch (fetchErr) {
          console.warn('Failed to load employees for badge match:', fetchErr);
        }
      }

      // Parse payload: ERP_BADGE:<empId>:<companyId>:<badgeCode> or raw empId or badgeCode
      let empId = '';
      let badgeCodePart = '';

      if (cleanCode.startsWith('ERP_BADGE:')) {
        const parts = cleanCode.split(':');
        empId = parts[1] || '';
        badgeCodePart = parts[3] || '';
      } else {
        empId = cleanCode;
        badgeCodePart = cleanCode;
      }

      // Find matching employee
      let matched = companyEmployees.find(e => 
        (empId && e.id === empId) ||
        (badgeCodePart && e.badgeCode === badgeCodePart) ||
        e.id === cleanCode ||
        e.badgeCode === cleanCode ||
        (e.phone && e.phone.replace(/\D/g, '') === cleanCode.replace(/\D/g, ''))
      );

      // If no employee exists in list yet and it's a test or first login
      if (!matched && (cleanCode.startsWith('ERP_BADGE:') || cleanCode.startsWith('EMP_'))) {
        // Fallback: check if we can synthesize profile from code
        const fallbackName = empId ? `Сотрудник #${empId}` : 'Сотрудник цеха';
        matched = {
          id: empId || `emp-${Date.now()}`,
          name: fallbackName,
          role: 'Распиловщик',
          productionRole: 'Распиловщик',
          isProductionEmployee: true,
          department: 'cutting',
          rateType: 'piecework',
          baseRate: 55000,
          shiftType: '2/2',
          status: 'active'
        };
      }

      if (!matched) {
        setErrorMsg(`Сотрудник по данному QR-коду бейджа не найден (${cleanCode}). Обратитесь к начальнику цеха для выпуска карточки.`);
        setIsLoading(false);
        return;
      }

      // Successful badge login!
      playLoginSuccessSound();
      setSuccessBadgeUser(matched);

      const syntheticToken = `badge_token_${matched.id}_${Date.now()}`;
      const finalUserData = {
        uid: matched.userId || matched.id,
        id: matched.id,
        email: matched.email || `employee_${matched.id}@erp.local`,
        displayName: matched.name,
        name: matched.name,
        role: matched.productionRole || matched.role || 'employee',
        productionRole: matched.productionRole || matched.role || 'Распиловщик',
        companyId: targetCompanyId,
        avatar: matched.avatarUrl || null,
        badgeLogin: true,
        department: matched.department,
        shiftType: matched.shiftType
      };

      try {
        localStorage.setItem('currentUser', JSON.stringify(finalUserData));
        localStorage.setItem('token', syntheticToken);
        localStorage.setItem(`erp_session_${targetCompanyId}`, JSON.stringify({
          user: finalUserData,
          token: syntheticToken,
          loggedAt: new Date().toISOString(),
          badgeLogin: true
        }));
      } catch (storageErr) {
        console.warn('LocalStorage error:', storageErr);
      }

      // Swift login without long blocking wait
      setTimeout(() => {
        setIsLoading(false);
        onSuccessLogin(finalUserData, syntheticToken);
      }, 150);

    } catch (err: any) {
      console.error('Badge login error:', err);
      setErrorMsg('Ошибка верификации бейджа. Попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  // Global Hardware Barcode / QR Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input field other than scanner
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && (activeEl as HTMLInputElement).name !== 'badge_scanner_input';

      if (isTyping) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 250) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const fullBuffer = normalizeBarcodeScan(barcodeBufferRef.current);
        if (fullBuffer.length >= 2) {
          e.preventDefault();
          handleProcessBadgeCode(fullBuffer);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [company, aliasOrId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Пожалуйста, заполните email и пароль');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: password.trim() })
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        let msg = 'Неверный логин или пароль';
        if (loginData.error === 'Email not verified') {
          msg = 'Email не подтвержден. Пожалуйста, подтвердите email перед входом.';
        } else if (loginData.error) {
          msg = loginData.error;
        }
        setErrorMsg(msg);
        setIsLoading(false);
        return;
      }

      const uid = loginData.uid;
      const token = loginData.token;

      // Fetch user profile data to verify access and permissions
      let userProfile: any = null;
      try {
        const userDocRes = await fetch(`/api/db/doc/users/${uid}`);
        if (userDocRes.ok) {
          const userDocJson = await userDocRes.json();
          userProfile = userDocJson.data ? JSON.parse(userDocJson.data) : null;
        }
      } catch (err) {
        console.error('Failed to load user profile doc', err);
      }

      const isSuperAdmin = cleanEmail === 'lk.ivanbobkin@gmail.com' || userProfile?.role === 'superadmin' || userProfile?.isSuperAdmin;
      const userCompanyId = userProfile?.companyId;
      const targetCompanyId = company?.id;

      // Access validation: User should belong to this company OR be superadmin
      if (!isSuperAdmin && userCompanyId && targetCompanyId && userCompanyId !== targetCompanyId) {
        setErrorMsg('У вас нет доступа к ERP системе данного производства. Ваш аккаунт привязан к другой компании.');
        setIsLoading(false);
        return;
      }

      const finalUserData = {
        uid,
        id: uid || userProfile?.id || userProfile?.uid,
        email: cleanEmail,
        displayName: userProfile?.displayName || userProfile?.name || cleanEmail.split('@')[0],
        role: userProfile?.role || (isSuperAdmin ? 'admin' : 'employee'),
        companyId: targetCompanyId || userCompanyId,
        avatar: userProfile?.avatar || userProfile?.photoURL || null,
        ...userProfile
      };

      // Save persistent session in localStorage for this company and global user
      try {
        localStorage.setItem('currentUser', JSON.stringify(finalUserData));
        localStorage.setItem('token', token);
        localStorage.setItem(`erp_session_${targetCompanyId || aliasOrId}`, JSON.stringify({
          user: finalUserData,
          token,
          loggedAt: new Date().toISOString()
        }));
      } catch (storageErr) {
        console.warn('LocalStorage error:', storageErr);
      }

      onSuccessLogin(finalUserData, token);
    } catch (err: any) {
      console.error('ERP Login error:', err);
      setErrorMsg('Ошибка подключения к серверу. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Header Info */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-end">
        <a
          href={`/${aliasOrId}`}
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <span>Витрина компании</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-7 shadow-2xl shadow-black/60 relative overflow-hidden"
        >
          {/* Card Accent Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500" />

          {/* Company Branding */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 text-indigo-400 mb-3 shadow-inner overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={companyName} 
                  className="w-12 h-12 object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Factory className="w-8 h-8 text-indigo-400" />
              )}
            </div>

            <h1 className="text-xl font-black tracking-tight text-white mb-1">
              {companyName}
            </h1>

            <div className="text-xs font-medium text-slate-400 tracking-wide">
              Управление производством
            </div>
          </div>

          {/* Login Mode Tabs (Password vs QR-Badge) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'password'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>По паролю</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('badge');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'badge'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-300" />
              <span>По QR-бейджу</span>
            </button>
          </div>

          {/* Success Badge User Welcome Animation */}
          {successBadgeUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              </div>
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                Успешный вход по бейджу
              </div>
              <div className="text-base font-black text-white">
                Здравствуйте, {successBadgeUser.name}!
              </div>
              <div className="text-xs text-emerald-300">
                {successBadgeUser.productionRole || successBadgeUser.role || 'Сотрудник цеха'} • Переход в рабочее пространство...
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-2xl flex items-start gap-2.5 text-rose-300 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </motion.div>
          )}

          {/* TAB 1: Password Login */}
          {loginMode === 'password' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 tracking-wide">
                  Email / Логин сотрудника
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="master@mebel.ru"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 tracking-wide">
                    Пароль доступа
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
                  >
                    Забыли пароль?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Проверка учетных данных...</span>
                  </>
                ) : (
                  <>
                    <span>Войти</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: QR Badge Fast Login */}
          {loginMode === 'badge' && (
            <div className="space-y-4 text-center">
              {/* Badge Scanning Visual Animation */}
              <div className="p-6 bg-slate-950/90 rounded-2xl border-2 border-dashed border-indigo-500/40 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Laser animation */}
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 relative mb-3 shadow-inner">
                  <QrCode className="w-10 h-10 animate-pulse" />
                  <div className="absolute inset-x-2 h-0.5 bg-indigo-400 shadow-[0_0_8px_#818cf8] animate-bounce" />
                </div>

                <div className="text-xs font-black text-white mb-1">
                  Ожидание сканирования бейджа
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-[260px]">
                  Поднесите ваш QR-бейдж к аппаратному сканеру штрихкодов или отсканируйте камерой
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  disabled={isLoading}
                  className="md:hidden w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Сканировать бейдж камерой</span>
                </button>

                {/* Manual input fallback */}
                <div className="pt-2">
                  <div className="relative">
                    <input
                      name="badge_scanner_input"
                      type="text"
                      lang="en"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Или введите код бейджа вручную (Enter)..."
                      value={manualBadgeInput}
                      onChange={(e) => setManualBadgeInput(convertRuToEnLayout(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualBadgeInput.trim()) {
                          e.preventDefault();
                          handleProcessBadgeCode(manualBadgeInput);
                          setManualBadgeInput('');
                        }
                      }}
                      className="w-full pl-3 pr-20 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (manualBadgeInput.trim()) {
                          handleProcessBadgeCode(manualBadgeInput);
                          setManualBadgeInput('');
                        }
                      }}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      Вход
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/20 text-left text-[11px] text-indigo-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <span>
                  Карточку сотрудника с персональным QR-кодом можно распечатать в разделе <strong>«Сотрудники»</strong> в ERP-системе.
                </span>
              </div>
            </div>
          )}

          {/* Footer Card Info */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Защищенное MES-соединение</span>
            </div>
            <a
              href="/"
              className="hover:text-slate-300 transition-colors font-medium"
            >
              В калькулятор
            </a>
          </div>
        </motion.div>
      </main>

      {/* Forgot Password Modal Dialog */}
      <AnimatePresence>
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-white text-center space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-md">
                <HelpCircle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-black text-white">Восстановление пароля</h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  Обратитесь к администратору сервиса.
                </p>
              </div>

              <button
                onClick={() => setShowForgotPasswordModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Camera Scanner for QR Badge */}
      {showCameraScanner && (
        <MobileCameraScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScan={(code) => {
            setShowCameraScanner(false);
            handleProcessBadgeCode(code);
          }}
          title="Сканирование QR-бейджа сотрудника"
          subtitle="Наведите камеру на QR-код вашей персональной карточки сотрудника"
        />
      )}

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-slate-500">
        <p>2026 {companyName.startsWith('ООО') || companyName.startsWith('ИП') ? companyName : `ООО "${companyName}"`} Система планирования и управления производством.</p>
      </footer>
    </div>
  );
};

