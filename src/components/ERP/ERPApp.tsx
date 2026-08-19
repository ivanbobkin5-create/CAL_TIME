import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  LayoutDashboard, 
  Calendar, 
  CalendarDays, 
  Layers, 
  BarChart3, 
  DollarSign, 
  Users, 
  Settings, 
  LogOut, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  Search, 
  ExternalLink,
  Cpu,
  RefreshCw,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ERPSection, 
  ProductionOrder, 
  ERPEmployee, 
  WorkShift, 
  ERPCompanySettings,
  ProductionStageId 
} from './types';
import { ERPLoader } from './ERPLoader';
import { ERPDashboardView } from './views/ERPDashboardView';
import { ERPPlanningView } from './views/ERPPlanningView';
import { ERPScheduleView } from './views/ERPScheduleView';
import { ERPProductionView } from './views/ERPProductionView';
import { ERPReportsView } from './views/ERPReportsView';
import { ERPSalariesView } from './views/ERPSalariesView';
import { ERPEmployeesView } from './views/ERPEmployeesView';
import { ERPSettingsView } from './views/ERPSettingsView';
import { ERPLoginView } from './views/ERPLoginView';

interface ERPAppProps {
  aliasOrId: string;
}

export const ERPApp: React.FC<ERPAppProps> = ({ aliasOrId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(() => {
    try {
      const erpUserStr = localStorage.getItem(`erp_session_${aliasOrId}`);
      if (erpUserStr) {
        return JSON.parse(erpUserStr).user;
      }
      const globalUserStr = localStorage.getItem('currentUser');
      if (globalUserStr) {
        return JSON.parse(globalUserStr);
      }
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [activeSection, setActiveSection] = useState<ERPSection>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));

  // ERP State
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [employees, setEmployees] = useState<ERPEmployee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<string>('projects');
  const [settings, setSettings] = useState<ERPCompanySettings>({
    erpEnabled: true,
    workDayStart: '08:00',
    workDayEnd: '20:00',
    defaultShiftDurationHours: 12,
    departments: [
      { id: 'cutting', name: 'Раскрой' },
      { id: 'edging', name: 'Кромкооблицовка' },
      { id: 'cnc', name: 'Присадка ЧПУ' },
      { id: 'facades', name: 'Фасады' },
      { id: 'assembly', name: 'Сборка и ОТК' }
    ],
    cuttingRatePerM2: 65,
    edgingRatePerM: 35,
    cncHoleRate: 8,
    assemblyModuleRate: 350,
    qcRatePerOrder: 500,
    autoScheduleOrders: true
  });

  // Clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Company & ERP Data
  useEffect(() => {
    async function loadCompanyData() {
      try {
        let comp: any = null;
        const res = await fetch(`/api/public/company/${aliasOrId}`);
        if (res.ok) {
          const data = await res.json();
          comp = data.company;
        } else {
          // Direct document lookup fallback
          try {
            const docRes = await fetch(`/api/db/doc/companies/${aliasOrId}`);
            if (docRes.ok) {
              const docData = await docRes.json();
              if (docData && docData.data) {
                comp = typeof docData.data === 'string' ? JSON.parse(docData.data) : docData.data;
                comp.id = docData.docId || aliasOrId;
              }
            }
          } catch (docErr) {
            console.warn('Fallback doc fetch failed:', docErr);
          }
        }

        if (!comp) {
          setIsAccessDenied(true);
          setIsLoading(false);
          return;
        }

        setCompany(comp);

        // Check for active login session (either from Calculator or ERP login)
        let parsedUser: any = authUser;
        try {
          const globalUserStr = localStorage.getItem('currentUser');
          const erpUserStr = localStorage.getItem(`erp_session_${comp.id || aliasOrId}`);

          if (erpUserStr) {
            const erpSession = JSON.parse(erpUserStr);
            parsedUser = erpSession.user;
          } else if (globalUserStr) {
            parsedUser = JSON.parse(globalUserStr);
          }

          if (parsedUser) {
            const isSuperAdmin = parsedUser.email === 'lk.ivanbobkin@gmail.com' || parsedUser.role === 'superadmin' || parsedUser.isSuperAdmin;
            const belongsToCompany = parsedUser.companyId === comp.id || isSuperAdmin || !comp.id;
            if (belongsToCompany) {
              setAuthUser(parsedUser);
            }
          }
        } catch (authCheckErr) {
          console.warn('ERP auth check error:', authCheckErr);
        }

        // Check if ERP is allowed / enabled by Superadmin
        const isSuperAdmin = parsedUser?.email === 'lk.ivanbobkin@gmail.com' || parsedUser?.role === 'superadmin' || parsedUser?.isSuperAdmin;
        const erpAllowed = comp?.erpAllowed !== undefined ? !!comp.erpAllowed : (comp?.erpEnabled !== undefined ? !!comp.erpEnabled : false);

        if (!erpAllowed && !isSuperAdmin) {
          setIsAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // Apply company ERP config to state if present
        const customErpConfig = comp.erpConfig || comp.erpSettings;
        if (customErpConfig) {
          setSettings(prev => ({
            ...prev,
            ...customErpConfig
          }));
        }

        // Fetch real company employees from ERP API
        let loadedEmployees: ERPEmployee[] = [];
        try {
          const empRes = await fetch(`/api/erp/${comp.id}/employees`);
          if (empRes.ok) {
            const empData = await empRes.json();
            if (Array.isArray(empData.employees) && empData.employees.length > 0) {
              loadedEmployees = empData.employees;
            }
          }
        } catch (empErr) {
          console.warn('Failed to fetch company employees:', empErr);
        }

        if (loadedEmployees.length === 0) {
          // If no employees found, add current logged-in user as company manager
          const currentUserName = parsedUser?.displayName || parsedUser?.name || parsedUser?.email?.split('@')[0] || 'Руководитель цеха';
          loadedEmployees = [
            {
              id: parsedUser?.id || 'emp-user-1',
              userId: parsedUser?.id,
              name: currentUserName,
              role: 'Начальник цеха',
              productionRole: 'Начальник цеха',
              isProductionEmployee: true,
              department: 'management',
              rateType: 'salary',
              baseRate: 100000,
              shiftType: '5/2',
              status: 'active',
              email: parsedUser?.email || '',
              isOwner: true
            }
          ];
        }

        setEmployees(loadedEmployees);

        // Fetch real orders from Bitrix24 or Projects via ERP API
        try {
          const ordersRes = await fetch(`/api/erp/${comp.id}/orders`);
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            if (ordersData.orders) {
              setOrders(ordersData.orders);
              setOrderSource(ordersData.orderSource || 'projects');
            }
          }
        } catch (ordErr) {
          console.warn("Failed to load real ERP orders:", ordErr);
        }

        setIsLoading(false);

      } catch (e) {
        console.error("Error loading ERP data:", e);
        setIsAccessDenied(true);
        setIsLoading(false);
      }
    }

    loadCompanyData();
  }, [aliasOrId]);

  const handleSyncOrders = async () => {
    if (!company?.id) return;
    setIsSyncingOrders(true);
    setSyncStatusText('Синхронизация с Bitrix24...');
    try {
      const res = await fetch(`/api/erp/${company.id}/orders`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
          setOrderSource(data.orderSource || 'projects');
          const count = data.orders.length;
          setSyncStatusText(
            data.orderSource === 'bitrix24'
              ? `Синхронизировано: ${count} сделок из CRM`
              : `Загружено: ${count} заказов из проектов`
          );
        }
      } else {
        setSyncStatusText('Ошибка синхронизации');
      }
    } catch (e) {
      console.error('Sync error:', e);
      setSyncStatusText('Ошибка подключения');
    } finally {
      setIsSyncingOrders(false);
      setTimeout(() => {
        setSyncStatusText(null);
      }, 4000);
    }
  };

  const handleSaveSettings = async (newSettings: ERPCompanySettings) => {
    setSettings(newSettings);
    if (company?.id) {
      try {
        await fetch(`/api/db/doc/companies/${company.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              erpConfig: newSettings,
              erpSettings: newSettings
            },
            merge: true
          })
        });
        // Reload orders after settings change (e.g. stage or source changed)
        handleSyncOrders();
      } catch (e) {
        console.warn('Failed to persist ERP settings:', e);
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStage: ProductionStageId) => {
    const isCompleted = nextStage === 'ready';
    const newStatus = isCompleted ? 'completed' : 'in_progress';
    
    // Instant UI update
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          currentStage: nextStage,
          status: newStatus,
          stageProgress: {
            ...o.stageProgress,
            [nextStage]: { status: isCompleted ? 'done' : 'in_progress' }
          }
        };
      }
      return o;
    }));

    // Server-side persistence and Bitrix24 CRM sync
    if (company?.id) {
      try {
        await fetch(`/api/erp/${company.id}/orders/${orderId}/stage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStage: nextStage,
            status: newStatus,
            stageProgress: {
              [nextStage]: { status: isCompleted ? 'done' : 'in_progress' }
            }
          })
        });
      } catch (e) {
        console.warn('Failed to persist order stage:', e);
      }
    }
  };

  const handleUpdateOrder = async (updated: ProductionOrder) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    if (company?.id) {
      try {
        await fetch(`/api/erp/${company.id}/orders/${updated.id}/stage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      } catch (e) {
        console.warn('Failed to persist order update:', e);
      }
    }
  };

  const saveEmployeesToBackend = async (newEmps: ERPEmployee[]) => {
    setEmployees(newEmps);
    if (company?.id) {
      try {
        await fetch(`/api/erp/${company.id}/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employees: newEmps })
        });
      } catch (e) {
        console.warn('Failed to persist employees to backend:', e);
      }
    }
  };

  const handleAddEmployee = (emp: Partial<ERPEmployee>) => {
    const roleVal = emp.productionRole || emp.role || 'Распиловщик';
    const newEmp: ERPEmployee = {
      id: `emp-${Date.now()}`,
      name: emp.name || 'Новый сотрудник',
      role: roleVal,
      productionRole: roleVal,
      isProductionEmployee: emp.isProductionEmployee !== false,
      department: emp.department || 'cutting',
      rateType: emp.rateType || 'piecework',
      baseRate: emp.baseRate || 55000,
      shiftType: emp.shiftType || '2/2',
      status: emp.status || 'active',
      phone: emp.phone || '',
      email: emp.email || ''
    };
    saveEmployeesToBackend([...employees, newEmp]);
  };

  const handleUpdateEmployee = (updated: ERPEmployee) => {
    const updatedList = employees.map(e => e.id === updated.id ? updated : e);
    saveEmployeesToBackend(updatedList);
  };

  const handleDeleteEmployee = (id: string) => {
    const updatedList = employees.filter(e => e.id !== id);
    saveEmployeesToBackend(updatedList);
  };

  const handleLogout = () => {
    setAuthUser(null);
    try {
      localStorage.removeItem(`erp_session_${company?.id || aliasOrId}`);
    } catch (e) {
      console.warn('Logout cleanup error:', e);
    }
  };

  // 1. Loading Splash (fast-through when ready)
  if (isLoading) {
    return (
      <ERPLoader 
        companyName={company?.name || "Мебельное производство"} 
        minDurationMs={300}
        onFinish={() => setIsLoading(false)}
      />
    );
  }

  // 2. Access Denied Screen (If not activated by superadmin)
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-md w-full text-center bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> ERP Доступ ограничен
          </div>

          <h2 className="text-xl font-black text-white mb-2">
            Модуль ERP не активирован
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            ERP-система управления производством активируется суперадминистратором платформы для производственных предприятий.
          </p>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-xs font-mono text-slate-400 mb-6">
            <div>Компания: <strong className="text-slate-200">{company?.name || aliasOrId}</strong></div>
            <div>Статус лицензии: <strong className="text-red-400">Не подключено</strong></div>
          </div>

          <a
            href="/"
            className="inline-flex items-center justify-center w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            Вернуться в калькулятор
          </a>
        </div>
      </div>
    );
  }

  // 3. User Authentication Gate (If opened via direct link without active session)
  if (!authUser) {
    return (
      <ERPLoginView 
        company={company} 
        aliasOrId={aliasOrId} 
        onSuccessLogin={(userData) => {
          setAuthUser(userData);
        }} 
      />
    );
  }

  // 4. Navigation items without numbering
  const menuItems: { id: ERPSection; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'planning', label: 'Планирование', icon: Calendar, badge: orders.filter(o => o.status === 'planned').length },
    { id: 'schedule', label: 'График работы', icon: CalendarDays },
    { id: 'production', label: 'Производство', icon: Factory, badge: orders.filter(o => o.status === 'in_progress').length },
    { id: 'reports', label: 'Отчеты', icon: BarChart3 },
    { id: 'salaries', label: 'Зарплаты', icon: DollarSign },
    { id: 'employees', label: 'Сотрудники', icon: Users, badge: employees.length },
    { id: 'settings', label: 'Настройки', icon: Settings }
  ];

  const userInitials = (authUser?.displayName || authUser?.email || 'MP')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const userRoleLabel = authUser?.email === 'lk.ivanbobkin@gmail.com' 
    ? 'Суперадминистратор'
    : authUser?.role === 'admin' || authUser?.role === 'owner'
    ? 'Руководитель производства'
    : (authUser?.role || 'Мастер смены');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 text-white p-4 md:p-6 flex flex-col justify-between border-r border-slate-800/80 shrink-0 z-20">
        <div>
          {/* Logo & Company Title */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Factory className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-blue-400 uppercase font-bold">
                <Cpu className="w-3 h-3" /> ERP ПРОИЗВОДСТВО
              </div>
              <h1 className="text-sm font-black text-white truncate">
                {company?.name || "Мебельный цех"}
              </h1>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="mt-8 pt-4 border-t border-slate-900 space-y-2.5">
          <div className="flex items-center justify-between px-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Смена: {settings?.defaultShiftDurationHours || 12} ч ({settings?.workDayStart || '08:00'}–{settings?.workDayEnd || '20:00'})</span>
            </span>
            <span className="shrink-0 pl-1">{currentTime}</span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {authUser?.displayName || authUser?.name || authUser?.email?.split('@')[0] || 'Сотрудник'}
                </div>
                <div className="text-[10px] text-indigo-400 font-medium truncate">
                  {userRoleLabel}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Выйти из ERP"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <a
              href={`/${aliasOrId}`}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
            >
              <span>Витрина</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
            >
              <span>Калькулятор</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-10 px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-slate-900 hidden sm:block">
              {menuItems.find(m => m.id === activeSection)?.label}
            </h2>

            {/* Sync Source Badge & Manual Sync Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncOrders}
                disabled={isSyncingOrders}
                title={orderSource === 'bitrix24' ? 'Синхронизировать сделки из Bitrix24 CRM' : 'Обновить заказы из проектов'}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncingOrders ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">
                  {isSyncingOrders ? 'Синхронизация...' : (orderSource === 'bitrix24' ? 'Bitrix24 CRM' : 'Проекты')}
                </span>
              </button>

              {syncStatusText && (
                <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 animate-fade-in">
                  {syncStatusText}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Shift Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Длительность смены: {settings?.defaultShiftDurationHours || 12} ч ({settings?.workDayStart || '08:00'} - {settings?.workDayEnd || '20:00'})</span>
            </div>

            {/* Operator Card */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {userInitials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900">
                  {authUser?.displayName || authUser?.name || authUser?.email?.split('@')[0] || 'Сотрудник'}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  {userRoleLabel}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Выйти из аккаунта ERP"
                className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Section View */}
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeSection === 'dashboard' && (
            <ERPDashboardView 
              orders={orders} 
              employees={employees} 
              shifts={shifts}
              onNavigateSection={setActiveSection}
              onSelectOrder={(order) => setActiveSection('production')}
            />
          )}

          {activeSection === 'planning' && (
            <ERPPlanningView 
              orders={orders} 
              employees={employees}
              onUpdateOrder={handleUpdateOrder}
              onSelectOrder={(order) => setActiveSection('production')}
            />
          )}

          {activeSection === 'schedule' && (
            <ERPScheduleView 
              employees={employees} 
              shifts={shifts} 
            />
          )}

          {activeSection === 'production' && (
            <ERPProductionView 
              orders={orders} 
              employees={employees}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onSelectOrder={() => {}}
            />
          )}

          {activeSection === 'reports' && (
            <ERPReportsView 
              orders={orders} 
              employees={employees} 
            />
          )}

          {activeSection === 'salaries' && (
            <ERPSalariesView 
              employees={employees} 
            />
          )}

          {activeSection === 'employees' && (
            <ERPEmployeesView 
              employees={employees} 
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {activeSection === 'settings' && (
            <ERPSettingsView 
              settings={settings} 
              onSaveSettings={handleSaveSettings} 
            />
          )}
        </div>
      </main>
    </div>
  );
};
