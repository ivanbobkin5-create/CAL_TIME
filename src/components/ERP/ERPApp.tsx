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
  ChevronLeft,
  Clock, 
  Search, 
  ExternalLink,
  Cpu,
  RefreshCw,
  Bell,
  AlertCircle,
  Camera,
  Menu,
  X,
  QrCode,
  Check,
  Archive,
  Truck,
  PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ERPSection, 
  ProductionOrder, 
  ERPEmployee, 
  WorkShift, 
  ERPCompanySettings,
  ProductionStageId,
  SalaryAdjustment 
} from './types';
import { ERPLoader } from './ERPLoader';
import { ERPDashboardView } from './views/ERPDashboardView';
import { ERPPlanningView } from './views/ERPPlanningView';
import { ERPScheduleView } from './views/ERPScheduleView';
import { ERPProductionView } from './views/ERPProductionView';
import { ERPDispatchView } from './views/ERPDispatchView';
import { ERPReportsView } from './views/ERPReportsView';
import { ERPSalariesView } from './views/ERPSalariesView';
import { ERPEmployeesView } from './views/ERPEmployeesView';
import { ERPSettingsView } from './views/ERPSettingsView';
import { ERPArchiveView } from './views/ERPArchiveView';
import { ERPLoginView } from './views/ERPLoginView';
import { ERPOrderWorkspaceView } from './views/ERPOrderWorkspaceView';
import { MobileCameraScannerModal } from './components/MobileCameraScannerModal';
import { VoiceAssistantToggle } from './components/VoiceAssistantToggle';

interface ERPAppProps {
  aliasOrId: string;
  catalogProducts?: any[];
}

export const ERPApp: React.FC<ERPAppProps> = ({ aliasOrId, catalogProducts: propsCatalogProducts = [] }) => {
  const [catalogProducts, setCatalogProducts] = useState<any[]>(propsCatalogProducts);

  useEffect(() => {
    if (propsCatalogProducts && propsCatalogProducts.length > 0) {
      setCatalogProducts(propsCatalogProducts);
    } else {
      try {
        const saved = localStorage.getItem('company_catalog_products') || localStorage.getItem('ownProducts');
        if (saved) {
          setCatalogProducts(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to load catalog products from localStorage', e);
      }
    }
  }, [propsCatalogProducts]);
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
  const [scheduleEntries, setScheduleEntries] = useState<Record<string, any>>({});
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<string>('projects');
  const [selectedOrderForWorkspace, setSelectedOrderForWorkspace] = useState<ProductionOrder | null>(null);
  const [workspaceStageId, setWorkspaceStageId] = useState<ProductionStageId | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Helper to load order state from localStorage
  const loadLocalOrdersCache = (compId: string): Record<string, Partial<ProductionOrder>> => {
    try {
      const str = localStorage.getItem(`erp_orders_cache_${compId}`);
      if (str) return JSON.parse(str);
    } catch (e) {}
    return {};
  };

  // Helper to save order state into localStorage
  const saveLocalOrdersCache = (compId: string, ordersList: ProductionOrder[]) => {
    try {
      const map: Record<string, Partial<ProductionOrder>> = {};
      ordersList.forEach(o => {
        map[o.id] = {
          currentStage: o.currentStage,
          status: o.status,
          birkaData: o.birkaData,
          stageScanningProgress: o.stageScanningProgress,
          totalAreaM2: o.totalAreaM2,
          totalEdgeM: o.totalEdgeM,
          partsCount: o.partsCount,
          stageProgress: o.stageProgress,
          plannedCuttingDate: o.plannedCuttingDate,
          isReadyForProduction: o.isReadyForProduction,
          additionalWorks: o.additionalWorks,
          workLogs: o.workLogs
        };
      });
      localStorage.setItem(`erp_orders_cache_${compId}`, JSON.stringify(map));
    } catch (e) {}
  };
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

  const [salaryAdjustments, setSalaryAdjustments] = useState<SalaryAdjustment[]>(() => {
    try {
      const saved = localStorage.getItem('erp_salary_adjustments_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load salary adjustments', e);
    }
    return [
      {
        id: 'adj-1',
        employeeId: 'emp-1',
        employeeName: 'Иванов Иван',
        type: 'bonus',
        amount: 3000,
        reason: 'Премия за аккуратный раскрой без брака',
        date: new Date().toISOString().split('T')[0],
        createdBy: 'Начальник цеха'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('erp_salary_adjustments_v1', JSON.stringify(salaryAdjustments));
    } catch (e) {
      console.warn('Failed to save salary adjustments', e);
    }
  }, [salaryAdjustments]);

  // Handlers for adjustments
  const handleAddAdjustment = (adj: SalaryAdjustment) => {
    setSalaryAdjustments(prev => [adj, ...prev]);
  };

  const handleEditAdjustment = (updatedAdj: SalaryAdjustment) => {
    setSalaryAdjustments(prev => prev.map(a => a.id === updatedAdj.id ? updatedAdj : a));
  };

  const handleDeleteAdjustment = (adjId: string) => {
    setSalaryAdjustments(prev => prev.filter(a => a.id !== adjId));
  };

  // Shift & Timer State
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);
  const [shiftStartTime, setShiftStartTime] = useState<number | null>(null);
  const [shiftElapsedSeconds, setShiftElapsedSeconds] = useState<number>(0);
  const [isOvertimeApproved, setIsOvertimeApproved] = useState<boolean>(false);
  const [showShiftWarningModal, setShowShiftWarningModal] = useState<boolean>(false);
  const [shiftWarningMessage, setShiftWarningMessage] = useState<string>('');

  // Clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Shift Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isShiftActive && shiftStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - shiftStartTime) / 1000);
        setShiftElapsedSeconds(elapsed);
      }, 1000);
    } else {
      setShiftElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isShiftActive, shiftStartTime]);

  const formatShiftTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Helper to fetch and sync active shift across devices
  const fetchAndApplyActiveShift = async (userOverride?: any, employeesOverride?: ERPEmployee[], companyOverride?: any) => {
    const activeUser = userOverride || authUser;
    const activeComp = companyOverride || company;
    const empList = employeesOverride || employees;
    const targetCompId = activeComp?.id || aliasOrId;

    if (!activeUser || !targetCompId) return;

    const uId = activeUser.id || activeUser.uid;
    const uEmail = (activeUser.email || '').trim().toLowerCase();

    const matched = empList.find(e => 
      (uEmail && e.email && e.email.trim().toLowerCase() === uEmail) ||
      (uId && (e.id === uId || e.userId === uId))
    );

    const activeKey = matched?.id || uId || uEmail || 'emp-user-1';

    try {
      const shiftParams = new URLSearchParams();
      if (uId) shiftParams.set('userId', uId);
      if (uEmail) shiftParams.set('email', uEmail);
      if (matched?.userId) shiftParams.set('userId', matched.userId);
      if (matched?.email) shiftParams.set('email', matched.email.trim().toLowerCase());

      const shiftRes = await fetch(`/api/erp/${targetCompId}/active-shift/${activeKey}?${shiftParams.toString()}`);
      if (shiftRes.ok) {
        const shiftData = await shiftRes.json();
        const activeS = shiftData.activeShift || (shiftData.isShiftActive ? shiftData : null);

        if (activeS && activeS.isShiftActive && activeS.shiftStartTime) {
          const start = Number(activeS.shiftStartTime);
          setIsShiftActive(true);
          setShiftStartTime(start);

          try {
            const shiftStr = JSON.stringify(activeS);
            if (activeKey) localStorage.setItem(`erp_active_shift_${targetCompId}_${activeKey}`, shiftStr);
            if (uId) localStorage.setItem(`erp_active_shift_${targetCompId}_${uId}`, shiftStr);
            if (uEmail) localStorage.setItem(`erp_active_shift_${targetCompId}_${uEmail}`, shiftStr);
          } catch (e) {}
        } else {
          setIsShiftActive(false);
          setShiftStartTime(null);
          try {
            if (activeKey) localStorage.removeItem(`erp_active_shift_${targetCompId}_${activeKey}`);
            if (uId) localStorage.removeItem(`erp_active_shift_${targetCompId}_${uId}`);
            if (uEmail) localStorage.removeItem(`erp_active_shift_${targetCompId}_${uEmail}`);
          } catch (e) {}
        }
      }
    } catch (shiftErr) {
      console.warn('Error fetching active shift:', shiftErr);
      try {
        const keys = [activeKey, uId, uEmail].filter(Boolean);
        let found: any = null;
        for (const k of keys) {
          const localStr = localStorage.getItem(`erp_active_shift_${targetCompId}_${k}`);
          if (localStr) {
            const parsedShift = JSON.parse(localStr);
            const start = Number(parsedShift.shiftStartTime || 0);
            if (parsedShift.isShiftActive && start && (Date.now() - start < 24 * 3600 * 1000)) {
              found = parsedShift;
              break;
            }
          }
        }
        if (found) {
          setIsShiftActive(true);
          setShiftStartTime(Number(found.shiftStartTime));
        }
      } catch (e) {}
    }
  };

  // Pre-cabinet Loading & Data Synchronization State
  const [isDataReady, setIsDataReady] = useState<boolean>(false);
  const [showMobileMenuDrawer, setShowMobileMenuDrawer] = useState<boolean>(false);
  const [showMobileShiftModal, setShowMobileShiftModal] = useState<boolean>(false);
  const [showGlobalCameraScanner, setShowGlobalCameraScanner] = useState<boolean>(false);

  // Fetch Company & ERP Data with strict pre-cabinet synchronization
  const loadAllERPData = async (userOverride?: any) => {
    setIsDataReady(false);
    try {
      let comp: any = company;
      if (!comp) {
        const res = await fetch(`/api/public/company/${aliasOrId}`);
        if (res.ok) {
          const data = await res.json();
          comp = data.company;
        } else {
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
      }

      if (!comp) {
        setIsAccessDenied(true);
        setIsLoading(false);
        setIsDataReady(true);
        return;
      }

      setCompany(comp);

      // Check active user
      let parsedUser: any = userOverride || authUser;
      if (!parsedUser) {
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
      }

      if (!parsedUser) {
        // Not logged in -> show login screen
        setIsLoading(false);
        setIsDataReady(true);
        return;
      }

      // Check access permission
      const isSuperAdmin = parsedUser?.email === 'lk.ivanbobkin@gmail.com' || parsedUser?.role === 'superadmin' || parsedUser?.isSuperAdmin;
      const erpAllowed = comp?.erpAllowed !== undefined ? !!comp.erpAllowed : (comp?.erpEnabled !== undefined ? !!comp.erpEnabled : false);

      if (!erpAllowed && !isSuperAdmin) {
        setIsAccessDenied(true);
        setIsLoading(false);
        setIsDataReady(true);
        return;
      }

      // Apply settings
      const customErpConfig = comp.erpConfig || comp.erpSettings;
      if (customErpConfig) {
        setSettings(prev => ({
          ...prev,
          ...customErpConfig
        }));
      }

      // Fetch employees, orders, schedule and active shift in parallel
      try {
        const [empRes, ordersRes, scheduleRes] = await Promise.allSettled([
          fetch(`/api/erp/${comp.id}/employees`),
          fetch(`/api/erp/${comp.id}/orders`),
          fetch(`/api/erp/${comp.id}/schedule`)
        ]);

        // 1. Process schedule
        if (scheduleRes.status === 'fulfilled' && scheduleRes.value.ok) {
          const schData = await scheduleRes.value.json();
          if (schData.entries && typeof schData.entries === 'object') {
            setScheduleEntries(schData.entries);
            try {
              localStorage.setItem(`erp_schedule_entries_${comp.id}`, JSON.stringify(schData.entries));
            } catch (e) {}
          }
        } else {
          try {
            const localSch = localStorage.getItem(`erp_schedule_entries_${comp.id}`);
            if (localSch) setScheduleEntries(JSON.parse(localSch));
          } catch (e) {}
        }

        let loadedEmployees: ERPEmployee[] = [];
        if (empRes.status === 'fulfilled' && empRes.value.ok) {
          const empData = await empRes.value.json();
          if (Array.isArray(empData.employees) && empData.employees.length > 0) {
            loadedEmployees = empData.employees;
          }
        }

        loadedEmployees = loadedEmployees.filter(e => 
          e.email?.toLowerCase() !== 'lk.ivanbobkin@gmail.com' && 
          !(e as any).isSuperAdmin && 
          e.role !== 'superadmin' && 
          e.productionRole !== 'superadmin'
        );

        if (loadedEmployees.length === 0) {
          const isCurrentSuperAdmin = parsedUser?.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com' || parsedUser?.isSuperAdmin;
          if (isCurrentSuperAdmin) {
            loadedEmployees = [
              {
                id: 'emp-master-1',
                name: 'Иванов Сергей (Начальник цеха)',
                role: 'Начальник цеха',
                productionRole: 'Начальник цеха',
                isProductionEmployee: true,
                department: 'management',
                rateType: 'salary',
                baseRate: 95000,
                shiftType: '5/2',
                status: 'active'
              }
            ];
          } else {
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
        }

        setEmployees(loadedEmployees);

        // Fetch active shift using resolved user and employees for true multi-device sync
        await fetchAndApplyActiveShift(parsedUser, loadedEmployees, comp);

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const ordersData = await ordersRes.value.json();
          if (ordersData.orders) {
            const localCache = loadLocalOrdersCache(comp.id);
            const merged = ordersData.orders.map((o: ProductionOrder) => {
              const cached = localCache[o.id];
              if (!cached) return o;
              return {
                ...o,
                currentStage: cached.currentStage || o.currentStage,
                status: cached.status || o.status,
                birkaData: cached.birkaData !== undefined ? cached.birkaData : o.birkaData,
                stageScanningProgress: cached.stageScanningProgress || o.stageScanningProgress,
                totalAreaM2: cached.totalAreaM2 !== undefined ? cached.totalAreaM2 : o.totalAreaM2,
                totalEdgeM: cached.totalEdgeM !== undefined ? cached.totalEdgeM : o.totalEdgeM,
                partsCount: cached.partsCount !== undefined ? cached.partsCount : o.partsCount,
                stageProgress: cached.stageProgress || o.stageProgress,
                plannedCuttingDate: cached.plannedCuttingDate !== undefined ? cached.plannedCuttingDate : o.plannedCuttingDate,
                isReadyForProduction: cached.isReadyForProduction !== undefined ? cached.isReadyForProduction : o.isReadyForProduction,
                additionalWorks: cached.additionalWorks !== undefined ? cached.additionalWorks : o.additionalWorks,
                workLogs: cached.workLogs !== undefined ? cached.workLogs : o.workLogs
              };
            });
            setOrders(merged);
            saveLocalOrdersCache(comp.id, merged);
            setOrderSource(ordersData.orderSource || 'projects');
          }
        }
      } catch (fetchErr) {
        console.warn("ERP parallel load error:", fetchErr);
      }

      setIsDataReady(true);

    } catch (e) {
      console.error("Error loading ERP data:", e);
      setIsAccessDenied(true);
      setIsLoading(false);
      setIsDataReady(true);
    }
  };

  useEffect(() => {
    loadAllERPData();
  }, [aliasOrId]);

  // Periodic and tab visibility background sync for cross-device shift persistence
  useEffect(() => {
    if (!authUser || !company) return;

    // Periodic sync every 15s to catch shifts started or ended on other devices
    const interval = setInterval(() => {
      fetchAndApplyActiveShift();
    }, 15000);

    // Instant sync when user switches tabs or returns to app on mobile/desktop
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAndApplyActiveShift();
      }
    };

    const handleFocus = () => {
      fetchAndApplyActiveShift();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [authUser, company, employees]);

  const handleSyncOrders = async () => {
    if (!company?.id) return;
    setIsSyncingOrders(true);
    setSyncStatusText('Синхронизация с Bitrix24...');
    try {
      const res = await fetch(`/api/erp/${company.id}/orders`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          const localCache = loadLocalOrdersCache(company.id);
          const merged = data.orders.map((o: ProductionOrder) => {
            const cached = localCache[o.id];
            if (!cached) return o;
            return {
              ...o,
              currentStage: cached.currentStage || o.currentStage,
              status: cached.status || o.status,
              birkaData: cached.birkaData !== undefined ? cached.birkaData : o.birkaData,
              stageScanningProgress: cached.stageScanningProgress || o.stageScanningProgress,
              totalAreaM2: cached.totalAreaM2 !== undefined ? cached.totalAreaM2 : o.totalAreaM2,
              totalEdgeM: cached.totalEdgeM !== undefined ? cached.totalEdgeM : o.totalEdgeM,
              partsCount: cached.partsCount !== undefined ? cached.partsCount : o.partsCount,
              stageProgress: cached.stageProgress || o.stageProgress,
              plannedCuttingDate: cached.plannedCuttingDate !== undefined ? cached.plannedCuttingDate : o.plannedCuttingDate,
              isReadyForProduction: cached.isReadyForProduction !== undefined ? cached.isReadyForProduction : o.isReadyForProduction,
              additionalWorks: cached.additionalWorks !== undefined ? cached.additionalWorks : o.additionalWorks,
              workLogs: cached.workLogs !== undefined ? cached.workLogs : o.workLogs
            };
          });
          setOrders(merged);
          saveLocalOrdersCache(company.id, merged);
          setOrderSource(data.orderSource || 'projects');
          const count = merged.length;
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
    const newStatus: ProductionOrder['status'] = isCompleted ? 'completed' : 'in_progress';
    
    // Instant UI update
    let updatedOrderObj: ProductionOrder | null = null;
    setOrders(prev => {
      const nextList = prev.map(o => {
        if (o.id === orderId) {
          const updated = {
            ...o,
            currentStage: nextStage,
            status: newStatus,
            stageProgress: {
              ...o.stageProgress,
              [nextStage]: { status: isCompleted ? 'done' : 'in_progress' }
            }
          };
          updatedOrderObj = updated;
          return updated;
        }
        return o;
      });
      if (company?.id) {
        saveLocalOrdersCache(company.id, nextList);
      }
      return nextList;
    });

    if (selectedOrderForWorkspace && selectedOrderForWorkspace.id === orderId) {
      setSelectedOrderForWorkspace(prev => prev ? {
        ...prev,
        currentStage: nextStage,
        status: newStatus
      } : null);
    }

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
    setOrders(prev => {
      const nextList = prev.map(o => o.id === updated.id ? updated : o);
      if (company?.id) {
        saveLocalOrdersCache(company.id, nextList);
      }
      return nextList;
    });

    if (selectedOrderForWorkspace && selectedOrderForWorkspace.id === updated.id) {
      setSelectedOrderForWorkspace(updated);
    }

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

  const handleUpdateScheduleEntries = async (newEntries: Record<string, any>) => {
    setScheduleEntries(newEntries);
    const targetCompId = company?.id || aliasOrId;
    if (targetCompId) {
      try {
        localStorage.setItem(`erp_schedule_entries_${targetCompId}`, JSON.stringify(newEntries));
        await fetch(`/api/erp/${targetCompId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: newEntries })
        });
      } catch (err) {
        console.warn('Failed to persist schedule:', err);
      }
    }
  };

  const handleRestoreOrderFromArchive = async (orderId: string) => {
    const nextStage: ProductionStageId = 'queue';
    const newStatus: ProductionOrder['status'] = 'in_progress';
    
    // Instant UI update
    setOrders(prev => {
      const nextList: ProductionOrder[] = prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            currentStage: nextStage,
            status: newStatus,
            stageProgress: {
              ...o.stageProgress,
              [nextStage]: { status: 'in_progress' as const }
            }
          };
        }
        return o;
      });
      if (company?.id) {
        saveLocalOrdersCache(company.id, nextList);
      }
      return nextList;
    });

    if (company?.id) {
      try {
        await fetch(`/api/erp/${company.id}/orders/${orderId}/stage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStage: nextStage,
            status: newStatus,
            isRestoredFromArchive: true,
            stageProgress: {
              [nextStage]: { status: 'in_progress' }
            }
          })
        });
      } catch (e) {
        console.warn('Failed to restore order from archive:', e);
      }
    }
  };

  const handleStartShift = async () => {
    const activeEmp = matchedEmp || employees[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const userId = authUser?.id || authUser?.uid || activeEmp?.userId || null;
    const userEmail = (authUser?.email || activeEmp?.email || '').trim().toLowerCase();
    const empId = activeEmp?.id || userId || 'emp-user-1';
    const empName = activeEmp?.name || displayUserName;
    const now = Date.now();

    // Check if employee has an explicit day off in the schedule grid
    const entry = scheduleEntries[`${empId}_${todayStr}`];
    const isExplicitDayOff = entry && (entry.type === 'day_off' || entry.type === 'vacation' || entry.type === 'sick' || entry.status === 'off' || entry.status === 'vacation');
    
    // Only warn if they are explicitly marked as on leave/day off today
    if (isExplicitDayOff) {
      setShiftWarningMessage("На сегодня в графике стоит выходной день, но ваша смена зафиксирована, можно приступать к работе.");
      setShowShiftWarningModal(true);
    }

    setIsShiftActive(true);
    setShiftStartTime(now);
    setIsOvertimeApproved(false);

    // Persist to backend and localStorage under all matching identifiers for cross-device consistency
    const targetCompId = company?.id || aliasOrId;
    if (targetCompId) {
      const shiftObj = {
        isShiftActive: true,
        shiftStartTime: now,
        employeeId: empId,
        userId,
        email: userEmail,
        employeeName: empName,
        date: todayStr
      };

      try {
        const jsonStr = JSON.stringify(shiftObj);
        if (empId) localStorage.setItem(`erp_active_shift_${targetCompId}_${empId}`, jsonStr);
        if (userId) localStorage.setItem(`erp_active_shift_${targetCompId}_${userId}`, jsonStr);
        if (userEmail) localStorage.setItem(`erp_active_shift_${targetCompId}_${userEmail}`, jsonStr);

        await fetch(`/api/erp/${targetCompId}/active-shift`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: empId,
            userId,
            email: userEmail,
            employeeName: empName,
            shiftStartTime: now,
            date: todayStr
          })
        });
      } catch (err) {
        console.warn('Failed to persist active shift:', err);
      }
    }
  };

  const handleEndShift = async () => {
    setIsShiftActive(false);
    setShiftStartTime(null);
    setIsOvertimeApproved(false);

    const activeEmp = matchedEmp || employees[0];
    const userId = authUser?.id || authUser?.uid || activeEmp?.userId || null;
    const userEmail = (authUser?.email || activeEmp?.email || '').trim().toLowerCase();
    const empId = activeEmp?.id || userId || 'emp-user-1';
    const targetCompId = company?.id || aliasOrId;

    if (targetCompId) {
      try {
        if (empId) localStorage.removeItem(`erp_active_shift_${targetCompId}_${empId}`);
        if (userId) localStorage.removeItem(`erp_active_shift_${targetCompId}_${userId}`);
        if (userEmail) localStorage.removeItem(`erp_active_shift_${targetCompId}_${userEmail}`);

        await fetch(`/api/erp/${targetCompId}/end-shift`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: empId,
            userId,
            email: userEmail,
            elapsedSeconds: shiftElapsedSeconds
          })
        });
      } catch (err) {
        console.warn('Failed to end active shift:', err);
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

  const handleGlobalCameraScan = (code: string) => {
    const clean = code.trim().toLowerCase();
    
    // Try to find matching order
    const found = orders.find(o => 
      o.id.toLowerCase() === clean ||
      o.orderNumber?.toLowerCase() === clean ||
      o.clientName?.toLowerCase().includes(clean) ||
      (o.birkaData && (o.birkaData as any).parts && (o.birkaData as any).parts.some((p: any) => 
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        (p.id && p.id.toLowerCase() === clean) ||
        (p.name && p.name.toLowerCase().includes(clean))
      ))
    );

    if (found) {
      setSelectedOrderForWorkspace(found);
      setShowGlobalCameraScanner(false);
    } else {
      const numMatch = clean.replace(/[^0-9]/g, '');
      if (numMatch) {
        const byNum = orders.find(o => o.orderNumber?.includes(numMatch));
        if (byNum) {
          setSelectedOrderForWorkspace(byNum);
          setShowGlobalCameraScanner(false);
        }
      }
    }
  };

  // 1. Loading Splash (Strict pre-cabinet synchronization)
  if (isLoading) {
    return (
      <ERPLoader 
        companyName={company?.name || "Мебельное производство"} 
        logoUrl={company?.logoUrl || (settings as any)?.companyLogoUrl || (settings as any)?.logoUrl}
        minDurationMs={450}
        isDataReady={isDataReady}
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
          setIsLoading(true);
          loadAllERPData(userData);
        }} 
      />
    );
  }

  // 4. Navigation items without numbering
  const menuItems: { id: ERPSection; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'planning', label: 'Планирование', icon: Calendar, badge: orders.filter(o => o.status === 'planned').length },
    { id: 'schedule', label: 'График работы', icon: CalendarDays },
    { id: 'production', label: 'Производство', icon: Factory, badge: orders.filter(o => o.status === 'in_progress' || o.currentStage === 'shipping').length },
    { id: 'archive', label: 'Архив заказов', icon: Archive, badge: orders.filter(o => o.status === 'completed' || o.status === 'shipped').length },
    { id: 'reports', label: 'Аналитика и отчеты', icon: BarChart3 },
    { id: 'salaries', label: 'Зарплаты', icon: DollarSign },
    { id: 'employees', label: 'Сотрудники', icon: Users, badge: employees.length },
    { id: 'settings', label: 'Настройки', icon: Settings }
  ];

  // Match current logged in user in employees list or user profile
  const activeUserId = authUser?.id || authUser?.uid;
  const matchedEmp = employees.find(e => 
    (e.email && authUser?.email && e.email.toLowerCase() === authUser.email.toLowerCase()) ||
    (e.id && activeUserId && e.id === activeUserId) ||
    (e.userId && activeUserId && e.userId === activeUserId)
  );

  const rawName = matchedEmp?.name 
    || authUser?.displayName 
    || authUser?.name 
    || authUser?.fullName;

  // Clean up display name if it's identical to email or email prefix
  const displayUserName = (rawName && !rawName.includes('@') && rawName !== authUser?.email?.split('@')[0])
    ? rawName
    : (matchedEmp?.name || company?.ownerName || company?.contactPerson || authUser?.displayName || authUser?.email?.split('@')[0] || 'Сотрудник цеха');

  const rawRole = matchedEmp?.productionRole || matchedEmp?.role || authUser?.productionRole || authUser?.position || authUser?.role;
  let displayUserRole = 'Сотрудник цеха';

  if (rawRole === 'admin' || rawRole === 'owner' || authUser?.role === 'admin' || authUser?.role === 'owner') {
    displayUserRole = matchedEmp?.productionRole || 'Начальник цеха';
  } else if (rawRole === 'employee' || rawRole === 'user') {
    displayUserRole = matchedEmp?.productionRole || 'Сотрудник цеха';
  } else if (authUser?.email === 'lk.ivanbobkin@gmail.com' && !matchedEmp?.productionRole) {
    displayUserRole = 'Руководитель производства';
  } else if (rawRole) {
    displayUserRole = rawRole;
  }

  const userInitials = displayUserName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'СП';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800 font-sans selection:bg-blue-600 selection:text-white pb-20 md:pb-0">
      
      {/* DESKTOP Left Sidebar (Hidden on mobile screens < md) */}
      <aside className={`hidden md:flex ${isSidebarCollapsed ? 'w-20 p-3' : 'w-64 p-4 md:p-6'} bg-slate-950 text-white flex-col justify-between border-r border-slate-800/80 shrink-0 z-20 transition-all duration-300`}>
        <div>
          {/* Logo & Company Title with Toggle */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'} mb-6 px-1`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 border border-blue-400/30 shrink-0">
                <Factory className="w-5 h-5 shrink-0" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-sm font-black text-white truncate">
                    {company?.name || "Мебельный цех"}
                  </h1>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              title={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id && !selectedOrderForWorkspace;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedOrderForWorkspace(null);
                    setActiveSection(item.id);
                  }}
                  title={item.label}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'} rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} relative`}>
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                    {isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-950" />
                    )}
                  </div>

                  {!isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
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
          <div className={`p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800/80 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
                title={`${displayUserName} (${displayUserRole})`}
              >
                {userInitials}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {displayUserName}
                  </div>
                  <div className="text-[10px] text-indigo-400 font-medium truncate">
                    {displayUserRole}
                  </div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={handleLogout}
                title="Выйти из ERP"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {!isSidebarCollapsed && (
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
          )}
        </div>
      </aside>

      {/* MOBILE Top App Bar (Only on mobile screens < md) */}
      <header className="flex md:hidden sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 items-center justify-between shadow-lg text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 shrink-0">
            <Factory className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-mono tracking-widest text-blue-400 uppercase font-black">
              ERP ЦЕХ
            </div>
            <div className="text-xs font-black truncate text-white">
              {company?.name || "Мебельный цех"}
            </div>
          </div>
        </div>

        {/* Mobile Quick Action Buttons: Scan + Shift Timer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Voice Assistant Toggle on Mobile */}
          <VoiceAssistantToggle variant="icon" className="!bg-slate-900 hover:!bg-slate-800 !text-slate-300 !border-slate-800" />

          {/* Quick Scanner Button */}
          <button
            onClick={() => setShowGlobalCameraScanner(true)}
            className="md:hidden p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[11px]">Сканер</span>
          </button>

          {/* Shift Status Pill */}
          <button
            onClick={() => setShowMobileShiftModal(true)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isShiftActive 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isShiftActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span className="font-mono">{isShiftActive ? formatShiftTimer(shiftElapsedSeconds) : 'Смена'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* DESKTOP Top Header Bar (Hidden on mobile) */}
        <header className="hidden md:flex bg-white/90 backdrop-blur-md sticky top-0 z-10 px-6 py-4 border-b border-slate-200/80 items-center justify-between gap-4">
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
            {/* Shift Timer & Control */}
            <div className="flex items-center gap-2">
              {!isShiftActive ? (
                <button
                  onClick={handleStartShift}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Начать смену</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-emerald-400 font-mono font-black text-xs flex items-center gap-1.5 border border-slate-800 shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>На работе: {formatShiftTimer(shiftElapsedSeconds)}</span>
                  </div>

                  {new Date().getHours() >= 20 && !isOvertimeApproved && (
                    <button
                      onClick={() => setIsOvertimeApproved(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Работаю сверхурочно</span>
                    </button>
                  )}

                  <button
                    onClick={handleEndShift}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Завершить смену
                  </button>
                </div>
              )}
            </div>

            {/* Voice Assistant Toggle */}
            <VoiceAssistantToggle variant="pill" className="bg-white" />

            {/* Operator Card */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {userInitials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900">
                  {displayUserName}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  {displayUserRole}
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

        {/* Dynamic Section View with Adaptive Padding */}
        <div className="p-3.5 sm:p-4 md:p-8 max-w-7xl w-full mx-auto space-y-5">
          {selectedOrderForWorkspace ? (
            <ERPOrderWorkspaceView 
              order={selectedOrderForWorkspace}
              initialStageId={workspaceStageId}
              settings={settings}
              currentUser={matchedEmp || authUser}
              isShiftActive={isShiftActive}
              onStartShift={handleStartShift}
              onLogout={handleLogout}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
              onBack={() => {
                setSelectedOrderForWorkspace(null);
                setWorkspaceStageId(null);
              }}
              onUpdateOrder={(updated) => handleUpdateOrder(updated)}
              onUpdateOrderStatus={(orderId, nextStage) => handleUpdateOrderStatus(orderId, nextStage)}
              sourceSection={activeSection}
            />
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <ERPDashboardView 
                  orders={orders} 
                  employees={employees} 
                  shifts={shifts}
                  settings={settings}
                  companyId={company?.id || aliasOrId}
                  onNavigateSection={setActiveSection}
                  onSelectOrder={(order) => {
                    setSelectedOrderForWorkspace(order);
                    setWorkspaceStageId(order.currentStage || 'cutting');
                  }}
                />
              )}

              {activeSection === 'planning' && (
                <ERPPlanningView 
                  orders={orders} 
                  employees={employees} 
                  settings={settings}
                  onUpdateOrder={handleUpdateOrder}
                  onSelectOrder={(order) => {
                    setSelectedOrderForWorkspace(order);
                    setWorkspaceStageId(order.currentStage || 'cutting');
                  }}
                />
              )}

              {activeSection === 'schedule' && (
                <ERPScheduleView 
                  employees={employees} 
                  shifts={shifts} 
                  entries={scheduleEntries}
                  onUpdateSchedule={handleUpdateScheduleEntries}
                  companyId={company?.id || aliasOrId}
                />
              )}

              {activeSection === 'production' && (
                <ERPProductionView 
                  orders={orders} 
                  employees={employees} 
                  settings={settings}
                  companyName={company?.name}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateOrder={handleUpdateOrder}
                  onSelectOrder={(order, stageId) => {
                    setSelectedOrderForWorkspace(order);
                    setWorkspaceStageId(stageId || order.currentStage || 'cutting');
                  }}
                />
              )}

              {activeSection === 'archive' && (
                <ERPArchiveView 
                  orders={orders} 
                  onSelectOrder={(order) => {
                    setSelectedOrderForWorkspace(order);
                    setWorkspaceStageId(order.currentStage || 'shipping');
                  }}
                  onRestoreOrder={(orderId) => handleRestoreOrderFromArchive(orderId)}
                />
              )}

              {activeSection === 'reports' && (
                <ERPReportsView 
                  orders={orders} 
                  employees={employees} 
                  settings={settings}
                />
              )}

              {activeSection === 'salaries' && (
                <ERPSalariesView 
                  employees={employees} 
                  currentEmployee={matchedEmp}
                  salaryAdjustments={salaryAdjustments}
                  onAddAdjustment={handleAddAdjustment}
                  onEditAdjustment={handleEditAdjustment}
                  onDeleteAdjustment={handleDeleteAdjustment}
                />
              )}

              {activeSection === 'employees' && (
                <ERPEmployeesView 
                  employees={employees} 
                  companyName={company?.name}
                  companyId={company?.id || aliasOrId}
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              )}

              {activeSection === 'settings' && (
                <ERPSettingsView 
                  settings={settings} 
                  orders={orders}
                  catalogProducts={catalogProducts}
                  onSaveSettings={handleSaveSettings} 
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* MOBILE Fixed Bottom Navigation Bar (Visible only on < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 text-white px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {/* 1. Production Stages (Primary Workshop Tool) */}
        <button
          onClick={() => {
            setSelectedOrderForWorkspace(null);
            setActiveSection('production');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
            activeSection === 'production' && !selectedOrderForWorkspace
              ? 'text-blue-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Factory className="w-5 h-5" />
            {orders.filter(o => o.status === 'in_progress').length > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-[9px] font-black rounded-full px-1 py-0.2">
                {orders.filter(o => o.status === 'in_progress').length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">Участки</span>
        </button>

        {/* 2. Planning / Orders List */}
        <button
          onClick={() => {
            setSelectedOrderForWorkspace(null);
            setActiveSection('planning');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
            activeSection === 'planning' && !selectedOrderForWorkspace
              ? 'text-blue-400 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Calendar className="w-5 h-5" />
            {orders.filter(o => o.status === 'planned').length > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-black rounded-full px-1 py-0.2">
                {orders.filter(o => o.status === 'planned').length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">Заказы</span>
        </button>

        {/* 3. Center Camera Scan Button */}
        <button
          onClick={() => setShowGlobalCameraScanner(true)}
          className="w-12 h-12 -mt-5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-slate-900 cursor-pointer active:scale-95 transition-transform"
          title="Сканировать бирку детали или заказа"
        >
          <Camera className="w-6 h-6" />
        </button>

        {/* 4. Shift Management */}
        <button
          onClick={() => setShowMobileShiftModal(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isShiftActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-1">{isShiftActive ? 'В смене' : 'Смена'}</span>
        </button>

        {/* 5. Menu Drawer Trigger */}
        <button
          onClick={() => setShowMobileMenuDrawer(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            showMobileMenuDrawer ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1">Меню</span>
        </button>
      </div>

      {/* MOBILE Menu Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {showMobileMenuDrawer && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 backdrop-blur-sm md:hidden">
            <div 
              className="absolute inset-0"
              onClick={() => setShowMobileMenuDrawer(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 text-white max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {userInitials}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{displayUserName}</h4>
                    <p className="text-[11px] text-indigo-400 font-semibold">{displayUserRole}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileMenuDrawer(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id && !selectedOrderForWorkspace;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedOrderForWorkspace(null);
                        setActiveSection(item.id);
                        setShowMobileMenuDrawer(false);
                      }}
                      className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                          : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{item.label}</div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="text-[10px] text-blue-300">{item.badge} в работе</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Links & Logout */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`/${aliasOrId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span>Витрина</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span>Калькулятор</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </div>

                <button
                  onClick={() => {
                    setShowMobileMenuDrawer(false);
                    handleLogout();
                  }}
                  className="w-full p-3 rounded-2xl bg-rose-600/10 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE Shift Management Modal */}
      <AnimatePresence>
        {showMobileShiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-white text-center space-y-5 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <Clock className="w-7 h-7 text-white" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Учет рабочей смены</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Сотрудник: <strong className="text-slate-200">{displayUserName}</strong>
                </p>
              </div>

              {isShiftActive ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
                  <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                    🟢 СМЕНА АКТИВНА
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {formatShiftTimer(shiftElapsedSeconds)}
                  </div>
                  <button
                    onClick={() => {
                      handleEndShift();
                      setShowMobileShiftModal(false);
                    }}
                    className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer mt-2"
                  >
                    Завершить смену
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Нажмите кнопку ниже, чтобы зафиксировать начало вашей производственной смены в журнале.
                  </p>
                  <button
                    onClick={() => {
                      handleStartShift();
                      setShowMobileShiftModal(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Начать рабочую смену</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowMobileShiftModal(false)}
                className="w-full py-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Закрыть
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Mobile Camera Scanner Modal */}
      <MobileCameraScannerModal
        isOpen={showGlobalCameraScanner}
        onClose={() => setShowGlobalCameraScanner(false)}
        onScan={handleGlobalCameraScan}
        title="Сканирование в цехе"
        subtitle="Наведите камеру на штрихкод детали или QR-код заказа"
      />

      {/* Warning Modal when starting shift not in schedule */}
      {showShiftWarningModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Уведомление по графику работы</h3>
              <p className="text-xs text-amber-950 mt-3 leading-relaxed font-bold bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80">
                {shiftWarningMessage}
              </p>
            </div>
            <button
              onClick={() => setShowShiftWarningModal(false)}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-lg shadow-slate-900/20 transition-all cursor-pointer"
            >
              Приступить к работе
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
