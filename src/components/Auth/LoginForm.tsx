import React, { useState } from 'react';
import { Building2, Mail, Lock, ArrowRight, Key, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';

interface LoginData {
  email: string;
  password: string;
}

export const LoginForm = ({ 
  onLogin, 
  onGoToRegister 
}: { 
  onLogin: (data: LoginData) => Promise<void> | void;
  onGoToRegister: () => void;
}) => {
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [data, setData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (data.email && data.password) {
      setIsLoading(true);
      setMessage(null);
      try {
        await onLogin({
          email: data.email.trim().toLowerCase(),
          password: data.password
        });
      } catch (e: any) {
        let errorMsg = 'Ошибка входа. Проверьте правильность email и пароля.';
        const msg = e.message?.toLowerCase() || '';
        if (msg.includes('404') || msg.includes('not found') || msg.includes('не найден')) {
          errorMsg = 'Аккаунт с таким email не найден.';
        } else if (msg.includes('403') || msg.includes('verified')) {
          errorMsg = 'Email не подтвержден. Пожалуйста, проверьте почту для подтверждения.';
        } else if (msg.includes('401') || msg.includes('auth/wrong-password') || msg.includes('неверный') || msg.includes('password')) {
          errorMsg = 'Неверный пароль. Для сотрудников пароль по умолчанию: 123456';
        }
        setMessage({ 
          type: 'error', 
          text: errorMsg
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Инструкции отправлены на вашу почту (проверьте также папку Спам)' });
        setTimeout(() => setView('reset'), 2000);
      } else {
        setMessage({ type: 'error', text: 'Ошибка. Проверьте правильность email' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Сетевая ошибка' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Пароль успешно изменен! Теперь вы можете войти.' });
        setTimeout(() => setView('login'), 2000);
      } else {
        setMessage({ type: 'error', text: 'Неверный или просроченный код' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Сетевая ошибка' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-10 px-6 shadow-2xl sm:rounded-3xl border border-gray-100 animate-in fade-in zoom-in duration-300">
      <div className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            {view === 'login' && <Lock className="w-8 h-8" />}
            {view === 'forgot' && <Key className="w-8 h-8" />}
            {view === 'reset' && <ShieldCheck className="w-8 h-8" />}
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">
          {view === 'login' && 'Вход в систему'}
          {view === 'forgot' && 'Восстановление'}
          {view === 'reset' && 'Новый пароль'}
        </h2>
        <p className="mt-2 text-sm text-gray-400 font-medium">
          {view === 'login' && 'Добро пожаловать обратно!'}
          {view === 'forgot' && 'Введите ваш email для получения кода'}
          {view === 'reset' && 'Введите код из письма и новый пароль'}
        </p>
      </div>

      {message && (
        <div className={cn(
          "mb-6 p-4 rounded-xl text-sm font-bold flex items-center gap-3",
          message.type === 'success' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        )}>
          {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {view === 'login' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email-адрес</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                required
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="admin@company.ru"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Пароль</label>
              <button 
                type="button"
                onClick={() => setView('forgot')}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
              >
                Забыли?
              </button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                required
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!data.email || !data.password || isLoading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Проверка и вход...</span>
              </>
            ) : (
              <>
                <span>Войти в систему</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={handleForgot} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email-адрес</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                required
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="admin@company.ru"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!data.email || isLoading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
          >
            {isLoading ? 'Отправка...' : 'Отправить код'}
          </button>

          <button 
            type="button"
            onClick={() => setView('login')}
            className="w-full text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
          >
            Вспомнили пароль?
          </button>
        </form>
      )}

      {view === 'reset' && (
        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Код восстановления</label>
            <input
              type="text"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all tracking-widest text-center"
              placeholder="Введите код"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Новый пароль</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-gray-900 font-bold focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!resetToken || !newPassword || isLoading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
          >
            {isLoading ? 'Смена пароля...' : 'Сбросить пароль'}
          </button>
        </form>
      )}

      <div className="mt-8 pt-8 border-t border-gray-50 text-center">
        <p className="text-sm text-gray-400 font-medium">
          Нет аккаунта?{' '}
          <button 
            onClick={onGoToRegister}
            className="font-black text-blue-600 hover:text-blue-700 transition-colors"
          >
            Создать сейчас
          </button>
        </p>
      </div>
    </div>
  );
};

// Helper for cn (though it should be imported from lib/utils, I'll use simple logic if needed, but App.tsx has it)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
