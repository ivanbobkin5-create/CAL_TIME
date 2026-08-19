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

interface ERPAppProps {
  aliasOrId: string;
}

export const ERPApp: React.FC<ERPAppProps> = ({ aliasOrId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [activeSection, setActiveSection] = useState<ERPSection>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));

  // ERP State
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [employees, setEmployees] = useState<ERPEmployee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
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
        const res = await fetch(`/api/public/company/${aliasOrId}`);
        if (!res.ok) {
          setIsAccessDenied(true);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const comp = data.company;
        setCompany(comp);

        // Check if ERP is allowed / enabled by Superadmin
        const erpAllowed = comp?.erpAllowed !== undefined ? !!comp.erpAllowed : !!comp?.erpEnabled;
        const isProductionType = comp?.type === 'Производство' || comp?.type === 'Мебельное производство' || (comp?.type && comp.type.toLowerCase().includes('производств'));

        if (!erpAllowed || !isProductionType) {
          setIsAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // Generate initial mock/real production orders from projects or default set
        const defaultOrders: ProductionOrder[] = [
          {
            id: 'ord-101',
            orderNumber: 'ПР-24/081',
            clientName: 'Салон «Кухни Премиум»',
            projectName: 'Кухня Модерн МДФ Эмаль',
            createdAt: '2026-08-18',
            deadlineDate: '2026-08-25',
            currentStage: 'cutting',
            priority: 'urgent',
            totalAreaM2: 24.8,
            totalEdgeM: 68,
            partsCount: 42,
            facadesCount: 14,
            status: 'in_progress',
            stageProgress: {
              queue: { status: 'done' },
              cutting: { status: 'in_progress' }
            }
          },
          {
            id: 'ord-102',
            orderNumber: 'ПР-24/082',
            clientName: 'Дизайнер Смирнова А.',
            projectName: 'Шкаф-купе в спальню (Egger Дуб)',
            createdAt: '2026-08-17',
            deadlineDate: '2026-08-27',
            currentStage: 'edging',
            priority: 'normal',
            totalAreaM2: 38.2,
            totalEdgeM: 112,
            partsCount: 56,
            facadesCount: 0,
            status: 'in_progress',
            stageProgress: {
              queue: { status: 'done' },
              cutting: { status: 'done' },
              edging: { status: 'in_progress' }
            }
          },
          {
            id: 'ord-103',
            orderNumber: 'ПР-24/083',
            clientName: 'ИП Григорьев (Салон)',
            projectName: 'Гардеробная система Квадро',
            createdAt: '2026-08-19',
            deadlineDate: '2026-08-29',
            currentStage: 'cnc',
            priority: 'high',
            totalAreaM2: 19.4,
            totalEdgeM: 45,
            partsCount: 28,
            facadesCount: 6,
            status: 'in_progress',
            stageProgress: {
              queue: { status: 'done' },
              cutting: { status: 'done' },
              edging: { status: 'done' },
              cnc: { status: 'in_progress' }
            }
          },
          {
            id: 'ord-104',
            orderNumber: 'ПР-24/084',
            clientName: 'Салон «Мебель Стиль»',
            projectName: 'Тумба под ТВ + навесные полки',
            createdAt: '2026-08-19',
            deadlineDate: '2026-08-30',
            currentStage: 'queue',
            priority: 'normal',
            totalAreaM2: 12.0,
            totalEdgeM: 32,
            partsCount: 18,
            facadesCount: 4,
            status: 'planned',
            stageProgress: {
              queue: { status: 'in_progress' }
            }
          },
          {
            id: 'ord-105',
            orderNumber: 'ПР-24/085',
            clientName: 'Дизайнер Волков Д.',
            projectName: 'Остров кухонный со скрытой фурнитурой',
            createdAt: '2026-08-16',
            deadlineDate: '2026-08-24',
            currentStage: 'assembly',
            priority: 'urgent',
            totalAreaM2: 15.6,
            totalEdgeM: 48,
            partsCount: 22,
            facadesCount: 8,
            status: 'in_progress',
            stageProgress: {
              queue: { status: 'done' },
              cutting: { status: 'done' },
              edging: { status: 'done' },
              cnc: { status: 'done' },
              assembly: { status: 'in_progress' }
            }
          }
        ];

        const defaultEmployees: ERPEmployee[] = [
          {
            id: 'emp-1',
            name: 'Сергеев Виктор Николаевич',
            role: 'Начальник цеха / Мастер смены',
            department: 'management',
            rateType: 'salary',
            baseRate: 95000,
            shiftType: '5/2',
            status: 'active',
            phone: '+7 (912) 345-67-89'
          },
          {
            id: 'emp-2',
            name: 'Иванов Алексей Петрович',
            role: 'Оператор форматно-раскроечного станка',
            department: 'cutting',
            rateType: 'piecework',
            baseRate: 55000,
            shiftType: '2/2',
            status: 'active',
            phone: '+7 (922) 111-22-33'
          },
          {
            id: 'emp-3',
            name: 'Кузнецов Дмитрий Олегович',
            role: 'Оператор кромкооблицовочного станка',
            department: 'edging',
            rateType: 'piecework',
            baseRate: 50000,
            shiftType: '2/2',
            status: 'active',
            phone: '+7 (922) 444-55-66'
          },
          {
            id: 'emp-4',
            name: 'Морозов Роман Игоревич',
            role: 'Оператор обрабатывающего центра ЧПУ',
            department: 'cnc',
            rateType: 'piecework',
            baseRate: 65000,
            shiftType: '2/2',
            status: 'active',
            phone: '+7 (922) 777-88-99'
          },
          {
            id: 'emp-5',
            name: 'Павлов Михаил Сергеевич',
            role: 'Мастер контрольной сборки и ОТК',
            department: 'assembly',
            rateType: 'piecework',
            baseRate: 55000,
            shiftType: '2/2',
            status: 'active',
            phone: '+7 (922) 000-11-22'
          }
        ];

        setOrders(defaultOrders);
        setEmployees(defaultEmployees);

      } catch (e) {
        console.error("Error loading ERP data:", e);
        setIsAccessDenied(true);
      }
    }

    loadCompanyData();
  }, [aliasOrId]);

  const handleUpdateOrderStatus = (orderId: string, nextStage: ProductionStageId) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          currentStage: nextStage,
          status: nextStage === 'ready' ? 'completed' : 'in_progress'
        };
      }
      return o;
    }));
  };

  const handleUpdateOrder = (updated: ProductionOrder) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  };

  const handleAddEmployee = (emp: Partial<ERPEmployee>) => {
    const newEmp: ERPEmployee = {
      id: `emp-${Date.now()}`,
      name: emp.name || 'Новый сотрудник',
      role: emp.role || 'Оператор',
      department: emp.department || 'cutting',
      rateType: emp.rateType || 'piecework',
      baseRate: emp.baseRate || 50000,
      shiftType: emp.shiftType || '2/2',
      status: emp.status || 'active',
      phone: emp.phone || ''
    };
    setEmployees(prev => [...prev, newEmp]);
  };

  const handleUpdateEmployee = (updated: ERPEmployee) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  // 1. Loading Splash
  if (isLoading) {
    return (
      <ERPLoader 
        companyName={company?.name || "Мебельное производство"} 
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

  // 3. Navigation items
  const menuItems: { id: ERPSection; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: '1. Дашборд', icon: LayoutDashboard },
    { id: 'planning', label: '2. Планирование', icon: Calendar, badge: orders.filter(o => o.status === 'planned').length },
    { id: 'schedule', label: '3. График работы', icon: CalendarDays },
    { id: 'production', label: '4. Производство', icon: Factory, badge: orders.filter(o => o.status === 'in_progress').length },
    { id: 'reports', label: '5. Отчеты', icon: BarChart3 },
    { id: 'salaries', label: '6. Зарплаты', icon: DollarSign },
    { id: 'employees', label: '7. Сотрудники', icon: Users, badge: employees.length },
    { id: 'settings', label: '8. Настройки', icon: Settings }
  ];

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
        <div className="mt-8 pt-4 border-t border-slate-900 space-y-2">
          <div className="flex items-center justify-between px-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Цех онлайн
            </span>
            <span>{currentTime}</span>
          </div>

          <a
            href="/"
            className="w-full py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            В мебельный калькулятор
          </a>
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
          </div>

          <div className="flex items-center gap-3">
            {/* Shift Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Дневная смена: 08:00 - 20:00</span>
            </div>

            {/* Operator Card */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                МП
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900">Начальник цеха</div>
                <div className="text-[10px] text-emerald-600 font-semibold">Мастер смены</div>
              </div>
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
              onSaveSettings={setSettings} 
            />
          )}
        </div>
      </main>
    </div>
  );
};
