import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Search,
  Plus,
  FileText,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
  Users,
  Filter,
  BarChart3,
  CheckCircle2,
  Clock,
  Briefcase,
  X,
  Printer,
  Shield,
  Layers,
  ArrowUpRight,
  Percent,
  Lock,
  Sparkles,
  Info,
  RussianRuble
} from 'lucide-react';
import {
  ManagerDeal,
  BonusPolicy,
  PayoutSettings,
  MonthlySalesPlan,
  ManagerMonthlySalaryCalculation
} from './types';
import {
  DEFAULT_BONUS_POLICY,
  DEFAULT_PAYOUT_SETTINGS,
  resolveBonusPolicyForMonth,
  calculateManagerMonthlySalary,
  calculateDealBaseCommission,
  calculateDealConversionExtra,
  getDealPaymentsInMonth
} from './calcEngine';
import { DealEditModal } from './DealEditModal';
import { QuickPaymentModal } from './QuickPaymentModal';
import { SalesPlanPrintModal } from './SalesPlanPrintModal';
import { BonusPolicyPrintModal } from './BonusPolicyPrintModal';
import { ManagerSalarySlipPrintModal } from './ManagerSalarySlipPrintModal';

interface ManagerSalariesViewProps {
  companyId: string;
  companyName?: string;
  currentUser: any; // User object from App.tsx
  companyEmployees: any[]; // Employees from company
}

export const ManagerSalariesView: React.FC<ManagerSalariesViewProps> = ({
  companyId,
  companyName = 'Мебельная компания',
  currentUser,
  companyEmployees = []
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  const [activeTab, setActiveTab] = useState<
    'deals' | 'salaries' | 'plan' | 'policy' | 'analytics'
  >('deals');

  // Backend state
  const [deals, setDeals] = useState<ManagerDeal[]>([]);
  const [policies, setPolicies] = useState<BonusPolicy[]>([DEFAULT_BONUS_POLICY]);
  const [salesPlans, setSalesPlans] = useState<MonthlySalesPlan[]>([]);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>(DEFAULT_PAYOUT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [editingDeal, setEditingDeal] = useState<ManagerDeal | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [quickPaymentDeal, setQuickPaymentDeal] = useState<ManagerDeal | null>(null);

  // Print modals state
  const [isSalesPlanPrintOpen, setIsSalesPlanPrintOpen] = useState(false);
  const [isPolicyPrintOpen, setIsPolicyPrintOpen] = useState(false);
  const [printSalarySlipCalc, setPrintSalarySlipCalc] = useState<ManagerMonthlySalaryCalculation | null>(null);

  // Filters & Search
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('all');
  const [dealStatusFilter, setDealStatusFilter] = useState<'all' | 'formalized' | 'not_formalized'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Policy edit form
  const [editingPolicy, setEditingPolicy] = useState<BonusPolicy>(DEFAULT_BONUS_POLICY);
  const [policySaveSuccess, setPolicySaveSuccess] = useState(false);

  // Sales plan edit state for current month
  const [currentPlanTarget, setCurrentPlanTarget] = useState<number>(1000000);
  const [managerPlanInputs, setManagerPlanInputs] = useState<Record<string, number>>({});
  const [planNotes, setPlanNotes] = useState('');

  // Check roles and access permissions
  const isSupervisorOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const email = (currentUser.email || '').toLowerCase();
    if (email === 'lk.ivanbobkin@gmail.com' || currentUser.isSuperAdmin || currentUser.isOwner) return true;
    const role = (currentUser.role || '').toLowerCase();
    const accessLevel = currentUser.accessLevel || '';
    if (accessLevel === 'admin' || accessLevel === 'supervisor') return true;
    if (role.includes('директор') || role.includes('начальник') || role.includes('руководител') || role.includes('владелец')) return true;
    return false;
  }, [currentUser]);

  const canViewAllManagers = useMemo(() => {
    if (isSupervisorOrAdmin) return true;
    if (currentUser?.canViewAllManagerSalaries === true) return true;
    return false;
  }, [isSupervisorOrAdmin, currentUser]);

  // Extract sales managers list from employees
  const salesManagers = useMemo(() => {
    const list = companyEmployees.filter(emp => {
      if (emp.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com') return false;
      if (emp.isSalesManager === true) return true;
      const role = (emp.role || emp.productionRole || '').toLowerCase();
      if (role.includes('менеджер') || role.includes('продаж')) return true;
      return false;
    });

    // If empty, fallback to current user or all non-admin employees
    if (list.length === 0 && currentUser) {
      return [{
        id: currentUser.uid || currentUser.id || 'curr_user',
        name: currentUser.displayName || currentUser.name || 'Менеджер по продажам',
        email: currentUser.email
      }];
    }
    return list.map(emp => ({
      id: emp.id || emp.uid,
      name: emp.name || emp.displayName || 'Менеджер',
      email: emp.email
    }));
  }, [companyEmployees, currentUser]);

  // Determine current active manager ID for filtering
  const currentUserId = currentUser?.uid || currentUser?.id || '';
  useEffect(() => {
    if (!canViewAllManagers && currentUserId) {
      setSelectedManagerFilter(currentUserId);
    }
  }, [canViewAllManagers, currentUserId]);

  // Load data from server
  const loadData = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/manager-salaries/${companyId}/data`);
      if (res.ok) {
        const data = await res.json();
        if (data.deals) setDeals(data.deals);
        if (data.policies && data.policies.length > 0) {
          setPolicies(data.policies);
        }
        if (data.salesPlans) setSalesPlans(data.salesPlans);
        if (data.payoutSettings) setPayoutSettings(data.payoutSettings);
      }
    } catch (e) {
      console.error('Error loading manager salaries data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Active policy for current selected month
  const activePolicyForMonth = useMemo(() => {
    return resolveBonusPolicyForMonth(policies, selectedMonth);
  }, [policies, selectedMonth]);

  // Initialize editing policy when month changes
  useEffect(() => {
    setEditingPolicy({
      ...activePolicyForMonth,
      effectiveDate: activePolicyForMonth.effectiveDate || `${selectedMonth}-01`
    });
  }, [activePolicyForMonth, selectedMonth]);

  // Current month's sales plan
  const currentMonthSalesPlan = useMemo(() => {
    return salesPlans.find(p => p.month === selectedMonth) || null;
  }, [salesPlans, selectedMonth]);

  // Sync inputs with current month sales plan
  useEffect(() => {
    if (currentMonthSalesPlan) {
      setCurrentPlanTarget(currentMonthSalesPlan.companyTargetAmount || 1000000);
      const inputs: Record<string, number> = {};
      salesManagers.forEach(m => {
        inputs[m.id] = currentMonthSalesPlan.managerPlans?.[m.id]?.targetAmount || 0;
      });
      setManagerPlanInputs(inputs);
      setPlanNotes(currentMonthSalesPlan.notes || '');
    } else {
      // Default initial plan
      const defaultPerManager = 500000;
      const inputs: Record<string, number> = {};
      salesManagers.forEach(m => {
        inputs[m.id] = defaultPerManager;
      });
      setManagerPlanInputs(inputs);
      setCurrentPlanTarget(salesManagers.length * defaultPerManager || 1000000);
      setPlanNotes('');
    }
  }, [currentMonthSalesPlan, selectedMonth, salesManagers]);

  // Calculate salaries for all managers for selected month
  const monthlyCalculations = useMemo(() => {
    return salesManagers.map(mgr => {
      return calculateManagerMonthlySalary(
        mgr.id,
        mgr.name,
        selectedMonth,
        deals,
        policies,
        payoutSettings,
        currentMonthSalesPlan || undefined,
        mgr.email
      );
    });
  }, [salesManagers, selectedMonth, deals, policies, payoutSettings, currentMonthSalesPlan]);

  // Actual sales mapped by manager ID for sales plan tracking
  const actualSalesByManager = useMemo(() => {
    const map: Record<string, number> = {};
    monthlyCalculations.forEach(c => {
      map[c.managerId] = c.totalSales;
    });
    return map;
  }, [monthlyCalculations]);

  // Filtered calculations according to manager access
  const displayedCalculations = useMemo(() => {
    if (canViewAllManagers && selectedManagerFilter !== 'all') {
      return monthlyCalculations.filter(c => c.managerId === selectedManagerFilter);
    }
    if (!canViewAllManagers) {
      return monthlyCalculations.filter(c => c.managerId === currentUserId || (currentUser?.email && c.managerEmail === currentUser.email));
    }
    return monthlyCalculations;
  }, [monthlyCalculations, canViewAllManagers, selectedManagerFilter, currentUserId, currentUser]);

  // Filtered deals list
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Month filter: by meetingDate, saleDate, or contractDate
      const dDate = deal.meetingDate || deal.saleDate || deal.contractDate || '';
      if (!dDate.startsWith(selectedMonth)) {
        // Also include if customer payment happened in this month
        const { hasAnyPaymentInMonth } = getDealPaymentsInMonth(deal, selectedMonth);
        if (!hasAnyPaymentInMonth) return false;
      }

      // Manager filter
      if (!canViewAllManagers) {
        if (deal.managerId !== currentUserId && (!currentUser?.email || deal.managerEmail !== currentUser.email)) {
          return false;
        }
      } else if (selectedManagerFilter !== 'all' && deal.managerId !== selectedManagerFilter) {
        return false;
      }

      // Status filter
      if (dealStatusFilter !== 'all' && deal.status !== dealStatusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (deal.contractNumber || '').toLowerCase();
        const client = (deal.clientName || '').toLowerCase();
        const mgr = (deal.managerName || '').toLowerCase();
        const notes = (deal.notes || '').toLowerCase();
        if (!num.includes(q) && !client.includes(q) && !mgr.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [deals, selectedMonth, canViewAllManagers, selectedManagerFilter, dealStatusFilter, searchQuery, currentUserId, currentUser]);

  // Overall totals across displayed managers
  const totalSalesVolume = displayedCalculations.reduce((sum, c) => sum + c.totalSales, 0);
  const totalPayoutSum = displayedCalculations.reduce((sum, c) => sum + c.totalPayout, 0);
  const totalMeetingsCount = displayedCalculations.reduce((sum, c) => sum + c.totalMeetings, 0);
  const totalFormalizedCount = displayedCalculations.reduce((sum, c) => sum + c.formalizedCount, 0);
  const overallConversion = totalMeetingsCount > 0 ? Math.round((totalFormalizedCount / totalMeetingsCount) * 1000) / 10 : 0;

  // Handlers for deals
  const handleSaveDeal = async (savedDeal: ManagerDeal) => {
    try {
      const res = await fetch(`/api/manager-salaries/${companyId}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal: savedDeal })
      });
      if (res.ok) {
        const idx = deals.findIndex(d => d.id === savedDeal.id);
        if (idx >= 0) {
          const updated = [...deals];
          updated[idx] = savedDeal;
          setDeals(updated);
        } else {
          setDeals([savedDeal, ...deals]);
        }
      }
    } catch (e) {
      console.error('Error saving deal:', e);
    }
    setIsDealModalOpen(false);
    setEditingDeal(null);
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту встречу / сделку?')) return;
    try {
      const res = await fetch(`/api/manager-salaries/${companyId}/deals/${dealId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeals(deals.filter(d => d.id !== dealId));
      }
    } catch (e) {
      console.error('Error deleting deal:', e);
    }
  };

  const handleQuickPaymentSave = async (updatedDeal: ManagerDeal) => {
    await handleSaveDeal(updatedDeal);
    setQuickPaymentDeal(null);
  };

  // Handlers for Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupervisorOrAdmin) return;

    try {
      const policyPayload: BonusPolicy = {
        ...editingPolicy,
        companyId,
        id: editingPolicy.id || `policy_${Date.now()}`,
        effectiveDate: editingPolicy.effectiveDate || `${selectedMonth}-01`,
        updatedAt: new Date().toISOString()
      };

      const res = await fetch(`/api/manager-salaries/${companyId}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy: policyPayload })
      });

      if (res.ok) {
        const existingIdx = policies.findIndex(p => p.id === policyPayload.id);
        if (existingIdx >= 0) {
          const updated = [...policies];
          updated[existingIdx] = policyPayload;
          setPolicies(updated);
        } else {
          setPolicies([...policies, policyPayload]);
        }
        setPolicySaveSuccess(true);
        setTimeout(() => setPolicySaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error saving policy:', e);
    }
  };

  // Handlers for Payout Settings
  const handleSavePayoutSettings = async (updated: PayoutSettings) => {
    try {
      const res = await fetch(`/api/manager-salaries/${companyId}/payout-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutSettings: updated })
      });
      if (res.ok) {
        setPayoutSettings(updated);
      }
    } catch (e) {
      console.error('Error saving payout settings:', e);
    }
  };

  // Handlers for Sales Plan
  const handleSaveSalesPlan = async (status: 'draft' | 'approved') => {
    if (!isSupervisorOrAdmin) return;

    const managerPlans: MonthlySalesPlan['managerPlans'] = {};
    salesManagers.forEach(m => {
      managerPlans[m.id] = {
        targetAmount: managerPlanInputs[m.id] || 0,
        targetConversionPercent: activePolicyForMonth.conversionThresholdPercent
      };
    });

    const planPayload: MonthlySalesPlan = {
      id: currentMonthSalesPlan?.id || `plan_${selectedMonth}`,
      companyId,
      month: selectedMonth,
      companyTargetAmount: currentPlanTarget,
      managerPlans,
      status,
      approvedBy: status === 'approved' ? currentUser?.uid : undefined,
      approvedByName: status === 'approved' ? (currentUser?.displayName || currentUser?.name || 'Руководитель') : undefined,
      approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
      notes: planNotes,
      createdAt: currentMonthSalesPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`/api/manager-salaries/${companyId}/sales-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesPlan: planPayload })
      });
      if (res.ok) {
        const idx = salesPlans.findIndex(p => p.month === selectedMonth);
        if (idx >= 0) {
          const updated = [...salesPlans];
          updated[idx] = planPayload;
          setSalesPlans(updated);
        } else {
          setSalesPlans([...salesPlans, planPayload]);
        }
      }
    } catch (e) {
      console.error('Error saving sales plan:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Управление продажами & Мотивация персонала</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Зарплаты и сделки менеджеров
            {currentMonthSalesPlan?.status === 'approved' && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                ✓ План утвержден
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Фиксация встреч, начисление премий со сделок, контроль конверсии, план продаж и выплаты
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
            />
          </div>

          {canViewAllManagers && (
            <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 px-3 py-1.5 shadow-sm">
              <Users className="w-4 h-4 text-slate-400 mr-2" />
              <select
                value={selectedManagerFilter}
                onChange={(e) => setSelectedManagerFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="all">Все менеджеры ({salesManagers.length})</option>
                {salesManagers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              setEditingDeal(null);
              setIsDealModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-200 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Добавить встречу / сделку
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sales Volume */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Объем продаж</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {totalSalesVolume.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalFormalizedCount} оформленных договоров
            </div>
          </div>
        </div>

        {/* Meetings & Conversion */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Конверсия встреч</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className={`text-2xl font-black ${overallConversion >= activePolicyForMonth.conversionThresholdPercent ? 'text-emerald-700' : 'text-amber-600'}`}>
              {overallConversion}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>{totalFormalizedCount} из {totalMeetingsCount} встреч</span>
              <span className="text-slate-300">•</span>
              <span>порог {activePolicyForMonth.conversionThresholdPercent}%</span>
            </div>
          </div>
        </div>

        {/* Sales Plan Execution */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">План продаж</span>
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            {currentPlanTarget > 0 ? (
              <>
                <div className="text-2xl font-black text-slate-900">
                  {Math.round((totalSalesVolume / currentPlanTarget) * 1000) / 10}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  цель: {currentPlanTarget.toLocaleString('ru-RU')} ₽
                </div>
              </>
            ) : (
              <div className="text-sm font-bold text-slate-400">План не задан</div>
            )}
          </div>
        </div>

        {/* Total Salary Payout */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Зарплата к выплате</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">
              {totalPayoutSum.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              с учетом окладов, оплат и бонусов
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('deals')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'deals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Сделки и встречи ({filteredDeals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('salaries')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'salaries' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Расчет зарплат (Ведомость)</span>
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'plan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>План продаж</span>
        </button>
        {isSupervisorOrAdmin && (
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'policy' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Схема премирования и выплат</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Аналитика менеджеров</span>
        </button>
      </div>

      {/* TAB 1: DEALS & MEETINGS */}
      {activeTab === 'deals' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск по номеру договора, заказчику, менеджеру..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 text-xs">
                <button
                  onClick={() => setDealStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    dealStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Все ({deals.length})
                </button>
                <button
                  onClick={() => setDealStatusFilter('formalized')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    dealStatusFilter === 'formalized' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Оформленные
                </button>
                <button
                  onClick={() => setDealStatusFilter('not_formalized')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    dealStatusFilter === 'not_formalized' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Не оформленные
                </button>
              </div>
            </div>
          </div>

          {/* Deals Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3">Договор / Статус</th>
                  <th className="p-3">Заказчик</th>
                  <th className="p-3">Менеджер</th>
                  <th className="p-3">Дата встречи / продажи</th>
                  <th className="p-3 text-right">Сумма договора</th>
                  <th className="p-3 text-right">Оплаты клиента</th>
                  <th className="p-3 text-right">Премия</th>
                  <th className="p-3 text-center">Оплаты</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal) => {
                  const isFormalized = deal.status === 'formalized';
                  const contractTotal = deal.contractAmount || 0;
                  const currentPaid = (deal.prepayment1Paid ? (deal.prepayment1 || 0) : 0) +
                                      (deal.payment2Paid ? (deal.payment2 || 0) : 0) +
                                      (deal.payment3Paid ? (deal.payment3 || 0) : 0) +
                                      (deal.payment4Paid ? (deal.payment4 || 0) : 0);
                  const remainingBalance = Math.max(0, contractTotal - currentPaid);

                  const baseComm = calculateDealBaseCommission(deal, activePolicyForMonth);
                  const extraComm = calculateDealConversionExtra(deal, activePolicyForMonth);
                  const fullCommWithBonus = baseComm + extraComm;

                  return (
                    <tr
                      key={deal.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setQuickPaymentDeal(deal)}
                    >
                      {/* Contract & Status */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isFormalized ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {deal.contractNumber ? `Договор ${deal.contractNumber}` : 'Встреча без договора'}
                            </div>
                            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                              isFormalized ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isFormalized ? 'Оформлен' : 'Не оформлен'}
                            </span>
                            {deal.isInstallment && (
                              <span className="ml-1 inline-block text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.2 rounded-md">
                                Рассрочка
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{deal.clientName || '—'}</div>
                        {deal.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{deal.notes}</div>}
                      </td>

                      {/* Manager */}
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{deal.managerName}</div>
                      </td>

                      {/* Dates */}
                      <td className="p-3 text-slate-600">
                        <div>Встреча: {deal.meetingDate || '—'}</div>
                        {deal.saleDate && <div className="text-[10px] text-slate-400">Продажа: {deal.saleDate}</div>}
                      </td>

                      {/* Contract Amount */}
                      <td className="p-3 text-right">
                        {isFormalized ? (
                          <div>
                            <div className="font-bold text-slate-900">{contractTotal.toLocaleString('ru-RU')} ₽</div>
                            <div className="text-[10px] text-slate-400">
                              Прод: {(deal.productsAmount || 0).toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Payments */}
                      <td className="p-3 text-right">
                        {isFormalized ? (
                          <div>
                            <div className="font-bold text-emerald-700">{currentPaid.toLocaleString('ru-RU')} ₽</div>
                            {remainingBalance > 0 ? (
                              <div className="text-[10px] text-blue-600 font-medium">остаток {remainingBalance.toLocaleString('ru-RU')} ₽</div>
                            ) : (
                              <div className="text-[10px] text-emerald-600 font-bold">100% оплачен</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Commission */}
                      <td className="p-3 text-right">
                        {isFormalized ? (
                          <div>
                            <div className="font-bold text-slate-900">{fullCommWithBonus.toLocaleString('ru-RU')} ₽</div>
                            <div className="text-[10px] text-slate-400">
                              (баз: {baseComm.toLocaleString('ru-RU')} ₽)
                            </div>
                            {deal.penaltyAmount ? (
                              <div className="text-[10px] text-red-600 font-bold">-{deal.penaltyAmount.toLocaleString('ru-RU')} ₽ штраф</div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Payment Badges (1, 2, 3, 4) */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isFormalized ? (
                          <div className="inline-flex gap-1">
                            <span
                              title={`Предоплата: ${deal.prepayment1 || 0} ₽ (${deal.prepayment1Paid ? 'Оплачено' : 'Ожидание'})`}
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                deal.prepayment1Paid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              1
                            </span>
                            <span
                              title={`2-й платеж: ${deal.payment2 || 0} ₽ (${deal.payment2Paid ? 'Оплачено' : 'Ожидание'})`}
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                deal.payment2Paid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              2
                            </span>
                            <span
                              title={`3-й платеж: ${deal.payment3 || 0} ₽ (${deal.payment3Paid ? 'Оплачено' : 'Ожидание'})`}
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                deal.payment3Paid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              3
                            </span>
                            <span
                              title={`4-й платеж: ${deal.payment4 || 0} ₽ (${deal.payment4Paid ? 'Оплачено' : 'Ожидание'})`}
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                deal.payment4Paid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              4
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Внести / отметить оплату"
                            onClick={() => setQuickPaymentDeal(deal)}
                            className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 rounded-lg transition-colors"
                          >
                            <RussianRuble className="w-4 h-4" />
                          </button>
                          <button
                            title="Редактировать сделку"
                            onClick={() => {
                              setEditingDeal(deal);
                              setIsDealModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            title="Удалить"
                            onClick={() => handleDeleteDeal(deal.id)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Встреч и сделок за выбранный месяц не найдено. Нажмите «Добавить встречу / сделку».
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SALARIES STATEMENT (ВЕДОМОСТЬ НАЧИСЛЕНИЙ) */}
      {activeTab === 'salaries' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ведомость начисления зарплат за {selectedMonth}</h2>
              <p className="text-xs text-slate-500">
                Расчет произведен по схеме от {new Date(activePolicyForMonth.effectiveDate).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSupervisorOrAdmin && (
                <button
                  onClick={() => setIsPolicyPrintOpen(true)}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4 text-purple-600" /> Печать схемы премирования
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3">Менеджер</th>
                  <th className="p-3 text-center">Встречи / Конверсия</th>
                  <th className="p-3 text-right">Продажи (₽)</th>
                  <th className="p-3 text-right">Оклад</th>
                  <th className="p-3 text-right">Премия со сделок</th>
                  <th className="p-3 text-right">Бонус конверсии</th>
                  <th className="p-3 text-right">Бонус за план</th>
                  <th className="p-3 text-right">Штрафы</th>
                  <th className="p-3 text-right font-black text-slate-900">Итого к выплате</th>
                  <th className="p-3 text-center">Печать</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCalculations.map((calc) => (
                  <tr key={calc.managerId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Manager */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{calc.managerName}</div>
                      {calc.managerEmail && <div className="text-[10px] text-slate-400">{calc.managerEmail}</div>}
                    </td>

                    {/* Conversion */}
                    <td className="p-3 text-center">
                      <div className="font-bold text-slate-900">{calc.formalizedCount} из {calc.totalMeetings}</div>
                      <div className={`text-[10px] font-bold ${calc.conversionAchieved ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {calc.conversionPercent}% {calc.conversionAchieved ? '(выполнен ✓)' : ''}
                      </div>
                    </td>

                    {/* Sales */}
                    <td className="p-3 text-right font-bold text-slate-900">
                      {calc.totalSales.toLocaleString('ru-RU')} ₽
                    </td>

                    {/* Base Salary */}
                    <td className="p-3 text-right font-medium text-slate-700">
                      {calc.baseSalary.toLocaleString('ru-RU')} ₽
                    </td>

                    {/* Deal Commission */}
                    <td className="p-3 text-right font-medium text-blue-700">
                      {calc.baseCommission.toLocaleString('ru-RU')} ₽
                    </td>

                    {/* Conversion Bonus */}
                    <td className="p-3 text-right">
                      {calc.conversionAchieved ? (
                        <div>
                          <div className="font-bold text-emerald-700">
                            +{(calc.conversionFixedBonus + calc.conversionExtraCommission).toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="text-[10px] text-emerald-600">
                            {calc.conversionFixedBonus > 0 ? `фикс ${calc.conversionFixedBonus.toLocaleString('ru-RU')}₽` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Plan Bonus */}
                    <td className="p-3 text-right">
                      {calc.planBonusEarned > 0 ? (
                        <span className="font-bold text-emerald-700">+{calc.planBonusEarned.toLocaleString('ru-RU')} ₽</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Penalties */}
                    <td className="p-3 text-right">
                      {calc.dealPenalties > 0 ? (
                        <span className="font-bold text-red-600">-{calc.dealPenalties.toLocaleString('ru-RU')} ₽</span>
                      ) : (
                        <span className="text-slate-400">0 ₽</span>
                      )}
                    </td>

                    {/* Total Net Payout */}
                    <td className="p-3 text-right">
                      <div className="text-sm font-black text-emerald-700">
                        {calc.totalPayout.toLocaleString('ru-RU')} ₽
                      </div>
                    </td>

                    {/* Print Slip */}
                    <td className="p-3 text-center">
                      <button
                        title="Печать расчетного листка"
                        onClick={() => setPrintSalarySlipCalc(calc)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALES PLAN */}
      {activeTab === 'plan' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">План продаж на {selectedMonth}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  currentMonthSalesPlan?.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentMonthSalesPlan?.status === 'approved' ? 'Утвержден' : 'Черновик'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Установка плановых показателей, контроль выполнения и печать официального бланка
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSalesPlanPrintOpen(true)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-600" /> Печать плана продаж
              </button>

              {isSupervisorOrAdmin && (
                <>
                  <button
                    onClick={() => handleSaveSalesPlan('draft')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    Сохранить черновик
                  </button>
                  <button
                    onClick={() => handleSaveSalesPlan('approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Утвердить на месяц
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Company Target Input */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Общий план компании (₽)</label>
              <input
                type="number"
                disabled={!isSupervisorOrAdmin}
                value={currentPlanTarget || ''}
                onChange={(e) => setCurrentPlanTarget(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Текущий факт продаж</div>
              <div className="text-lg font-black text-emerald-700 mt-1">
                {totalSalesVolume.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Процент выполнения</div>
              <div className="text-lg font-black text-blue-700 mt-1">
                {currentPlanTarget > 0 ? Math.round((totalSalesVolume / currentPlanTarget) * 1000) / 10 : 0}%
              </div>
            </div>
          </div>

          {/* Managers Plan Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3">Менеджер</th>
                  <th className="p-3 text-right w-44">План продаж (₽)</th>
                  <th className="p-3 text-right">Факт продаж (₽)</th>
                  <th className="p-3 text-center w-36">Прогресс выполнения</th>
                  <th className="p-3 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesManagers.map((m) => {
                  const target = managerPlanInputs[m.id] || 0;
                  const actual = actualSalesByManager[m.id] || 0;
                  const pct = target > 0 ? Math.round((actual / target) * 1000) / 10 : 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                      </td>
                      <td className="p-3 text-right">
                        {isSupervisorOrAdmin ? (
                          <input
                            type="number"
                            value={target || ''}
                            onChange={(e) => setManagerPlanInputs({ ...managerPlanInputs, [m.id]: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-right outline-none text-xs"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">{target.toLocaleString('ru-RU')} ₽</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {actual.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {pct >= 100 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                            ✓ Выполнен
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">В процессе</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Plan Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Примечания и задачи к плану на месяц</label>
            <textarea
              rows={2}
              disabled={!isSupervisorOrAdmin}
              placeholder="Фокус на продажи кухонь с каменными столешницами, усиление работы с дизайнерами..."
              value={planNotes}
              onChange={(e) => setPlanNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 outline-none"
            />
          </div>
        </div>
      )}

      {/* TAB 4: BONUS POLICY & PAYOUT SCHEME SETTINGS (SUPERVISORS & ADMINS ONLY) */}
      {activeTab === 'policy' && isSupervisorOrAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-wider mb-0.5">
                <Shield className="w-4 h-4" />
                <span>Настройка схемы премирования и схемы выплат</span>
              </div>
              <h2 className="text-base font-black text-slate-900">
                Схема мотивации менеджеров по продажам
              </h2>
              <p className="text-xs text-slate-500">
                Все изменения сохраняются с датой вступления в силу и не изменяют начисления за прошлые месяцы
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPolicyPrintOpen(true)}
                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Печать положения о премировании
              </button>
            </div>
          </div>

          {policySaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Схема премирования успешно сохранена и активирована с указанной даты!
            </div>
          )}

          <form onSubmit={handleSavePolicy} className="space-y-6 text-xs">
            {/* Effective Date & Title */}
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-900 font-bold mb-1">
                  Дата вступления в силу новой схемы *
                </label>
                <input
                  type="date"
                  required
                  value={editingPolicy.effectiveDate || `${selectedMonth}-01`}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  С этой даты расчет заработной платы будет производиться по новым правилам. Зарплаты за предшествующие месяцы останутся неизменными.
                </p>
              </div>

              <div>
                <label className="block text-slate-900 font-bold mb-1">
                  Название схемы премирования
                </label>
                <input
                  type="text"
                  value={editingPolicy.title || ''}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, title: e.target.value })}
                  placeholder="Например: Схема премирования с 1 октября 2026 г."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Split by categories toggle */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Разделять проценты по типам товаров?</div>
                  <div className="text-[11px] text-slate-500">
                    {editingPolicy.splitByTypes
                      ? 'Да: Проценты разделены на Продукцию, Столешницы, Технику и Товары'
                      : 'Нет: Единый процент начисляется от Общей суммы договора'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPolicy.splitByTypes}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, splitByTypes: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {!editingPolicy.splitByTypes ? (
                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Единый процент от Общей суммы договора (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editingPolicy.generalPercent}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, generalPercent: parseFloat(e.target.value) || 0 })}
                    className="w-48 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Процент от Продукции (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editingPolicy.productsPercent}
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, productsPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Столешницы заказные (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editingPolicy.countertopsPercent}
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, countertopsPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Процент от Техники (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editingPolicy.appliancesPercent}
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, appliancesPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Сумма Товары (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editingPolicy.goodsPercent}
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, goodsPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Conversion Threshold & Extra Bonus */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
              <div className="font-bold text-emerald-900 text-xs">
                Порог конверсии встреч в договоры и бонус за результат
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">Порог конверсии (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingPolicy.conversionThresholdPercent}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, conversionThresholdPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 font-bold text-slate-900 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Например: 30%</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">Фиксированная премия (₽)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPolicy.conversionFixedBonus}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, conversionFixedBonus: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 font-bold text-emerald-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">Дополнительный процент (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingPolicy.conversionExtraPercent}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, conversionExtraPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 font-bold text-emerald-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">База доп. процента</label>
                  <select
                    value={editingPolicy.conversionExtraBase}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, conversionExtraBase: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-200 font-medium text-slate-900 outline-none"
                  >
                    <option value="all">Общая сумма договора</option>
                    <option value="products">Сумма Продукция</option>
                    <option value="countertops">Столешницы заказные</option>
                    <option value="appliances">Техника</option>
                    <option value="goods">Сумма Товары</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Link to sales plan */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Привязка ЗП к плану продаж</div>
                  <div className="text-[11px] text-slate-500">Начисление бонуса при выполнении личного плана продаж на 100%+</div>
                </div>
                <input
                  type="checkbox"
                  checked={editingPolicy.linkToSalesPlan}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, linkToSalesPlan: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-5 h-5 cursor-pointer"
                />
              </div>

              {editingPolicy.linkToSalesPlan && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Тип бонуса за план</label>
                    <select
                      value={editingPolicy.planBonusType}
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, planBonusType: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 outline-none"
                    >
                      <option value="fixed">Фиксированная сумма (руб.)</option>
                      <option value="percent">Дополнительный процент от продаж (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Значение бонуса</label>
                    <input
                      type="number"
                      value={editingPolicy.planBonusValue}
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, planBonusValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Base Salary (Оклад) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Гарантированный оклад</div>
                  <div className="text-[11px] text-slate-500">Ежемесячная фиксированная часть заработной платы</div>
                </div>
                <input
                  type="checkbox"
                  checked={editingPolicy.hasBaseSalary}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, hasBaseSalary: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-5 h-5 cursor-pointer"
                />
              </div>

              {editingPolicy.hasBaseSalary && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Размер оклада (руб. в месяц)</label>
                  <input
                    type="number"
                    value={editingPolicy.baseSalaryAmount}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, baseSalaryAmount: parseFloat(e.target.value) || 0 })}
                    className="w-64 px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Payout Scheme Settings */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
              <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>Схема выплат и порядок начисления от авансов</span>
                <span className="text-[10px] text-slate-500">Режим выплат</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Формат выплаты комиссии</label>
                  <select
                    value={payoutSettings.payoutMode}
                    onChange={(e) => {
                      const updated = { ...payoutSettings, payoutMode: e.target.value as any };
                      setPayoutSettings(updated);
                      handleSavePayoutSettings(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-blue-200 font-medium text-slate-900 outline-none"
                  >
                    <option value="by_payments">Пропорционально поступающим оплатам (с аванса)</option>
                    <option value="full_on_close">Общий расчет при заключении / закрытии договора</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Фиксированный % выплаты с аванса (%)</label>
                  <input
                    type="number"
                    value={payoutSettings.advancePayoutPercent}
                    onChange={(e) => {
                      const updated = { ...payoutSettings, advancePayoutPercent: parseFloat(e.target.value) || 0 };
                      setPayoutSettings(updated);
                      handleSavePayoutSettings(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-blue-200 font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Сохранить и активировать схему премирования
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Аналитика результатов менеджеров</h2>
              <p className="text-xs text-slate-500">Динамика продаж, структура выручки и воронка встреч</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayedCalculations.map((calc) => (
              <div key={calc.managerId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900">{calc.managerName}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    calc.conversionAchieved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {calc.conversionPercent}%
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Встреч проведено:</span>
                    <span className="font-bold text-slate-800">{calc.totalMeetings}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Договоров оформлено:</span>
                    <span className="font-bold text-emerald-700">{calc.formalizedCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Сумма продаж:</span>
                    <span className="font-bold text-slate-900">{calc.totalSales.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>

                {/* Structure breakdown */}
                <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Продукция:</span>
                    <span className="font-medium text-slate-800">{calc.productsTotal.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Столешницы:</span>
                    <span className="font-medium text-slate-800">{calc.countertopsTotal.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Техника:</span>
                    <span className="font-medium text-slate-800">{calc.appliancesTotal.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Товары:</span>
                    <span className="font-medium text-slate-800">{calc.goodsTotal.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Начислено:</span>
                  <span className="font-black text-emerald-700">{calc.totalPayout.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deal Edit Modal */}
      {isDealModalOpen && (
        <DealEditModal
          deal={editingDeal}
          managers={salesManagers}
          currentManagerId={currentUserId}
          canChooseManager={canViewAllManagers}
          onSave={handleSaveDeal}
          onClose={() => {
            setIsDealModalOpen(false);
            setEditingDeal(null);
          }}
        />
      )}

      {/* Quick Payment Modal */}
      {quickPaymentDeal && (
        <QuickPaymentModal
          deal={quickPaymentDeal}
          onSave={handleQuickPaymentSave}
          onClose={() => setQuickPaymentDeal(null)}
        />
      )}

      {/* Sales Plan Print Modal */}
      {isSalesPlanPrintOpen && (
        <SalesPlanPrintModal
          salesPlan={currentMonthSalesPlan || {
            id: `plan_${selectedMonth}`,
            companyId,
            month: selectedMonth,
            companyTargetAmount: currentPlanTarget,
            managerPlans: managerPlanInputs ? Object.fromEntries(
              Object.entries(managerPlanInputs).map(([k, v]) => [k, { targetAmount: v }])
            ) : {},
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }}
          companyName={companyName}
          managers={salesManagers}
          actualSalesByManager={actualSalesByManager}
          onClose={() => setIsSalesPlanPrintOpen(false)}
        />
      )}

      {/* Bonus Policy Print Modal */}
      {isPolicyPrintOpen && (
        <BonusPolicyPrintModal
          policy={activePolicyForMonth}
          payoutSettings={payoutSettings}
          companyName={companyName}
          onClose={() => setIsPolicyPrintOpen(false)}
        />
      )}

      {/* Manager Salary Slip Print Modal */}
      {printSalarySlipCalc && (
        <ManagerSalarySlipPrintModal
          calculation={printSalarySlipCalc}
          companyName={companyName}
          onClose={() => setPrintSalarySlipCalc(null)}
        />
      )}
    </div>
  );
};
