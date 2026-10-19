import React, { useState, useEffect, Suspense, lazy } from 'react';
import { LandingPage } from './components/Landing/LandingPage';
import { LoginForm } from './components/Auth/LoginForm';
import { RegistrationForm, RegistrationData } from './components/Auth/RegistrationForm';
import { Calculator } from 'lucide-react';
import { LegalDocumentsView } from './components/Legal/LegalDocumentsView';

// Lazy-load the heavy App module with automatic retry so transient dev/network hiccups never fail
const loadAppModule = async (): Promise<{ default: React.ComponentType<any> }> => {
  const maxRetries = 4;
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt === 0) {
        return await import('./App');
      }
      // Wait briefly before retrying (e.g. while Vite finishes transforming App.tsx)
      await new Promise((r) => setTimeout(r, 700 * attempt));
      try {
        return await import('./App');
      } catch {
        return await import(/* @vite-ignore */ `./App.tsx?t=${Date.now()}`);
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

const App = lazy(loadAppModule);

function getInitialView(): 'landing' | 'login' | 'register' | 'app' | 'legal' {
  if (typeof window === 'undefined') return 'landing';

  const s = window.location.search || '';
  const p = window.location.pathname || '/';
  const h = window.location.hash || '';

  // Legal routes
  if (p === '/privacy' || p === '/privacy-policy' || p === '/politika' || 
      p === '/terms' || p === '/license' || p === '/eula' || p === '/oferta') {
    return 'legal';
  }

  // 1. Bitrix24 embedded mode explicitly
  const hasB24Params = s.includes('DOMAIN=') || s.includes('member_id=') || s.includes('PLACEMENT=') || s.includes('AUTH_ID=');
  if (hasB24Params) return 'app';

  // 2. Direct explicit Admin or App routes
  if (p === '/admin' || p.startsWith('/admin/') || s.includes('admin=true') || h === '#admin' || p === '/app') {
    return 'app';
  }

  // 3. Auth routes
  if (p === '/login') return 'login';
  if (p === '/register') return 'register';

  // Default: Always show Landing Page directly on home route /
  return 'landing';
}

function LoadingSpinner() {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-white font-medium text-base">Загрузка личного кабинета...</span>
      </div>
      {showTimeout && (
        <div className="mt-4 animate-fadeIn">
          <p className="text-slate-400 text-sm mb-3">Загрузка занимает больше времени, чем обычно.</p>
          <button
            onClick={() => {
              sessionStorage.removeItem('mebel_in_app');
              window.location.href = '/';
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
          >
            ← Вернуться на главную страницу
          </button>
        </div>
      )}
    </div>
  );
}

export default function RootApp() {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'app' | 'legal'>(getInitialView);

  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    const preloadTimer = setTimeout(() => {
      loadAppModule().catch(() => {});
    }, 300);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(preloadTimer);
    };
  }, []);

  const handleEnterApp = () => {
    sessionStorage.setItem('mebel_in_app', 'true');
    setView('app');
  };

  const handleLandingLoginClick = () => {
    const hasUid = typeof window !== 'undefined' && localStorage.getItem('auth_uid');
    if (hasUid) {
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

  if (view === 'landing') {
    return (
      <LandingPage
        onLogin={handleLandingLoginClick}
        onRegister={handleLandingRegisterClick}
      />
    );
  }

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

  if (view === 'legal') {
    const p = window.location.pathname || '/';
    const initialDoc = (p === '/privacy' || p === '/privacy-policy' || p === '/politika') ? 'privacy' : 'terms';
    return (
      <LegalDocumentsView
        initialDoc={initialDoc}
        onBack={() => {
          window.history.pushState(null, '', '/');
          setView('landing');
        }}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <App />
    </Suspense>
  );
}
