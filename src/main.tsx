import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import * as ReactNS from 'react';
import {createRoot} from 'react-dom/client';
import RootApp from './RootApp.tsx';
import './index.css';

// Polyfill React.forwardRef for older or bundled vendor libraries running on React 19
try {
  const r: any = React || ReactNS;
  if (r) {
    if (!r.forwardRef && ReactNS.forwardRef) r.forwardRef = ReactNS.forwardRef;
    if (!r.memo && ReactNS.memo) r.memo = ReactNS.memo;
    if (!r.useCallback && ReactNS.useCallback) r.useCallback = ReactNS.useCallback;
    if (!r.useEffect && ReactNS.useEffect) r.useEffect = ReactNS.useEffect;
    if (!r.useState && ReactNS.useState) r.useState = ReactNS.useState;
    if (!r.useRef && ReactNS.useRef) r.useRef = ReactNS.useRef;
    if (!r.useMemo && ReactNS.useMemo) r.useMemo = ReactNS.useMemo;
    (window as any).React = r;
  }
} catch (e) {}

const appVersion = "1.0.1";
console.log("App version: ", appVersion);

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: '#b91c1c', fontFamily: 'sans-serif' }}>
          <h2>Критическая ошибка приложения</h2>
          <p>Пожалуйста, сделайте скриншот этой ошибки или скопируйте текст, чтобы мы могли её исправить:</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fee2e2', padding: 10, fontSize: '12px', borderRadius: 8, overflowX: 'auto' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => {
              if (window.confirm("Это удалит локальные черновики. Продолжить?")) {
                localStorage.clear(); 
                sessionStorage.clear();
                window.location.reload();
              }
            }}
            style={{ marginTop: 20, padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
          >
            Сбросить локальные данные и перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RootApp />
    </ErrorBoundary>
  </StrictMode>,
);

// Unregister service worker to prevent stale offline grey screen caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

