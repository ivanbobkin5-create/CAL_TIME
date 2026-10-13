import React, { useState, useEffect, Suspense, lazy } from 'react';
import { LandingPage } from './components/Landing/LandingPage';
import { LoginForm } from './components/Auth/LoginForm';
import { RegistrationForm, RegistrationData } from './components/Auth/RegistrationForm';
import { Calculator, Cpu, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

// Lazy-load the heavy App (ERP + Calculator + 3D Engine) only when the user enters the workspace
const LazyApp = lazy(() => import('./App'));

function getInitialView(): 'landing' | 'login' | 'register' | 'app' {
  if (typeof window === 'undefined') return 'landing';

  // 1. Bitrix24 embedded mode
  const s = window.location.search || '';
  const isFramed = window.parent !== window;
  const hasB24Params = s.includes('DOMAIN=') || s.includes('member_id=') || s.includes('PLACEMENT=') || s.includes('AUTH_ID=');
  if (isFramed || hasB24Params) {
    return 'app';
  }

  // 2. Direct Admin / hash route
  const p = window.location.pathname || '/';
  const h = window.location.hash || '';
  if (p === '/admin' || p.startsWith('/admin/') || s.includes('admin=true') || h === '#admin') {
    return 'app';
  }

  // 3. User explicitly entered the workspace during this browser session
  if (sessionStorage.getItem('mebel_in_app') === 'true') {
    return 'app';
  }

  // 4. Custom company direct slug route (e.g., /mebelfaktura or /mebelfaktura/erp)
  const segments = p.split('/').filter(Boolean);
  const reservedSystemRoutes = [
    '', 'login', 'register', 'admin', 'dashboard', 'api', 'assets', 'static', 'favicon.ico', 'c',
    'calculator', 'projects', 'products', 'services', 'service-section', 'price', 'production', 
    'employees', 'settings', 'promotions', 'specification', 'profile', 'procurement', 
    'procurement_plan', 'arrivals', 'summary', 'checkout_current', 'ready_made',
    'moduli', 'kuhni', 'fasady', 'stoleshnicy', 'petli', 'posudosushiteli', 'catalog', 'all', 'vse'
  ];
  if (segments.length > 0 && !reservedSystemRoutes.includes(segments[0].toLowerCase())) {
    return 'app';
  }

  // 5. Deep-links to auth
  if (p === '/login') return 'login';
  if (p === '/register') return 'register';

  // Default: Instant Landing Page!
  return 'landing';
}

// Clean animated preloader for workspace entry
const WorkspaceLoader = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50/50 to-white text-slate-900 overflow-hidden select-none">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none" />
    <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-sky-200 mb-6 animate-pulse">
        <Calculator className="w-8 h-8 text-white drop-shadow" />
      </div>
      <div className="text-center mb-6">
        <div className="text-[11px] font-bold tracking-widest text-sky-600 uppercase mb-1 flex items-center justify-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" /> Mebel-Plan.ru
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 mb-1">
          Система управления <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500">производством</span>
        </h1>
        <p className="text-xs text-slate-500">
          Загрузка калькулятора, каталога и рабочего пространства...
        </p>
      </div>
      <div className="w-full bg-white/90 border border-sky-100 rounded-2xl p-5 shadow-xl shadow-sky-500/10 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            Подключение модулей...
          </span>
          <span className="font-mono text-blue-600">Загрузка</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 rounded-full w-full animate-pulse" />
        </div>
      </div>
    </div>
    <div className="absolute bottom-6 text-[11px] text-slate-400 font-medium text-center">
      Mebel-Plan © {new Date().getFullYear()} • Все права защищены
    </div>
  </div>
);

export default function RootApp() {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'app'>(getInitialView);

  // Handle browser back/forward or hash changes
  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleEnterApp = () => {
    sessionStorage.setItem('mebel_in_app', 'true');
    setView('app');
  };

  const handleLandingLoginClick = () => {
    const hasUid = typeof window !== 'undefined' && localStorage.getItem('auth_uid');
    if (hasUid) {
      // If already logged in, enter the app workspace directly
      handleEnterApp();
    } else {
      setView('login');
    }
  };

  const handleLandingRegisterClick = () => {
    setView('register');
  };

  const handleLoginSubmit = async (data: { email: string; password: string }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password })
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(text);
      } catch (_) {}
      throw new Error(errorData.error || errorData.message || "Неверный email или пароль");
    }

    const authUser = await response.json();
    localStorage.setItem('auth_uid', authUser.uid);
    localStorage.setItem('auth_email', authUser.email);
    if (authUser.token) {
      localStorage.setItem('auth_token', authUser.token);
    }
    handleEnterApp();
  };

  const handleRegisterSubmit = async (data: RegistrationData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.adminEmail,
        password: data.adminPassword,
        adminName: data.adminName,
        phone: data.adminPhone,
        companyName: data.companyName,
        companyType: data.companyType,
        city: data.city,
        workFormat: data.workFormat
      })
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(text);
      } catch (_) {}
      const code = errorData.error || errorData.code;
      if (code === "auth/email-already-in-use") {
        throw new Error("Этот email уже зарегистрирован. Пожалуйста, войдите в систему.");
      }
      throw new Error(errorData.error || "Не удалось создать аккаунт");
    }

    const user = await response.json();
    const companyId = Math.random().toString(36).substr(2, 9);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 14);

    const rawRegType = (data.companyType || "") as string;
    const normalizedRegType = (rawRegType === "Производство" || rawRegType === "Мебельное производство" || rawRegType.toLowerCase().includes('производств'))
      ? "Мебельное производство"
      : (data.companyType || "Мебельное производство");
    const prodFormat = normalizedRegType === "Мебельное производство" ? "own" : "contract";

    await fetch(`/api/db/doc/companies/${companyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {
        name: data.companyName,
        type: normalizedRegType,
        companyType: normalizedRegType,
        city: data.city,
        phone: data.adminPhone || "",
        adminPhone: data.adminPhone || "",
        ownerUid: user.uid,
        tariffExpiration: expirationDate.toISOString(),
        productionFormat: prodFormat,
      }})
    });

    await fetch(`/api/db/doc/users/${user.uid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {
        uid: user.uid,
        email: data.adminEmail,
        displayName: data.adminName,
        phone: data.adminPhone || "",
        role: "admin",
        companyId: companyId,
        createdAt: new Date().toISOString(),
      }})
    });

    localStorage.setItem('auth_uid', user.uid);
    localStorage.setItem('auth_email', data.adminEmail);
    handleEnterApp();
  };

  // 1. Landing Page (Default for root URL, loads in milliseconds!)
  if (view === 'landing') {
    return (
      <LandingPage
        onLogin={handleLandingLoginClick}
        onRegister={handleLandingRegisterClick}
      />
    );
  }

  // 2. Login View
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Calculator className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Мебельный <span className="text-blue-600">калькулятор</span>
            </span>
          </div>
          <LoginForm
            onLogin={handleLoginSubmit}
            onGoToRegister={() => setView('register')}
          />
          <button
            type="button"
            onClick={() => setView('landing')}
            className="mt-6 w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  // 3. Register View
  if (view === 'register') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Calculator className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Мебельный <span className="text-blue-600">калькулятор</span>
            </span>
          </div>
          <RegistrationForm
            onRegister={handleRegisterSubmit}
            onGoToLogin={() => setView('login')}
          />
          <button
            type="button"
            onClick={() => setView('landing')}
            className="mt-6 w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  // 4. App Workspace (Lazy loaded with smooth animated progress bar)
  return (
    <Suspense fallback={<WorkspaceLoader />}>
      <LazyApp />
    </Suspense>
  );
}
