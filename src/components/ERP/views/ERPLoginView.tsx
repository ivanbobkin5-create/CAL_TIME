import React, { useState } from 'react';
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
  Cpu,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const companyName = company?.name || 'Мебельное производство';
  const logoUrl = company?.landingPage?.logoUrl || (company?.photos && company.photos[0]);

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
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-md">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-wide">
              ERP MES Engine
            </span>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              Production Suite v2.4
            </div>
          </div>
        </div>

        <a
          href={`/${aliasOrId}`}
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <span>Витрина компании</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/60 relative overflow-hidden"
        >
          {/* Card Accent Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500" />

          {/* Company Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
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

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wider uppercase mb-2">
              <Layers className="w-3 h-3" />
              <span>ERP Управление производством</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white">
              {companyName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Вход для мастеров, операторов станков и руководства
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-start gap-3 text-rose-300 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </motion.div>
          )}

          {/* Form */}
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
                <span className="text-[10px] text-slate-500 font-medium">
                  Пароль сотрудника
                </span>
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
              className="w-full mt-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Проверка учетных данных...</span>
                </>
              ) : (
                <>
                  <span>Войти в ERP систему</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Card Info */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
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

      {/* Page Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {companyName} • Система планирования и диспетчеризации цехов</p>
      </footer>
    </div>
  );
};
