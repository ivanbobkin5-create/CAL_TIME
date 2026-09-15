import React, { useState, useMemo } from 'react';
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
  PlusCircle,
  MinusCircle,
  Printer,
  Info
} from 'lucide-react';
import { ERPEmployee, SalaryAdjustment } from '../types';
import { getOrderCalculatedHoles } from '../utils';

interface ERPSalariesViewProps {
  employees: ERPEmployee[];
  currentEmployee?: ERPEmployee;
  salaryAdjustments?: SalaryAdjustment[];
  onAddAdjustment?: (adj: SalaryAdjustment) => void;
  onEditAdjustment?: (adj: SalaryAdjustment) => void;
  onDeleteAdjustment?: (adjId: string) => void;
  orders?: any[];
  shiftLogs?: any[];
  scheduleEntries?: Record<string, any>;
  settings?: any;
}

type EmployeeCategory = 'production' | 'non_production' | 'all';

export const ERPSalariesView: React.FC<ERPSalariesViewProps> = ({
  employees,
  currentEmployee,
  salaryAdjustments = [],
  onAddAdjustment,
  onEditAdjustment,
  onDeleteAdjustment,
  orders = [],
  shiftLogs = [],
  scheduleEntries = {},
  settings
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [search, setSearch] = useState('');
  const [employeeCategory, setEmployeeCategory] = useState<EmployeeCategory>('production');

  // Analytics filter states
  const [analyticsEmployeeFilter, setAnalyticsEmployeeFilter] = useState<string>('all');
  const [analyticsTypeFilter, setAnalyticsTypeFilter] = useState<'all' | 'bonus' | 'penalty'>('all');

  // Modal for adding / editing bonus/penalty
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [editingAdjId, setEditingAdjId] = useState<string | null>(null);
  const [selectedEmpForAdj, setSelectedEmpForAdj] = useState<ERPEmployee | null>(null);
  const [adjType, setAdjType] = useState<'bonus' | 'penalty'>('bonus');
  const [adjAmount, setAdjAmount] = useState<number>(1000);
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjDate, setAdjDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Expanded employee row for details
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // Check if logged in user is Foreman / Admin / Owner
  const isForeman = !currentEmployee || 
                    currentEmployee.role === 'Начальник цеха' || 
                    currentEmployee.productionRole === 'Начальник цеха' || 
                    currentEmployee.department === 'management' ||
                    currentEmployee.isOwner ||
                    (currentEmployee as any).isSuperAdmin ||
                    currentEmployee.email === 'lk.ivanbobkin@gmail.com';

  // Base list of all active non-superadmin employees
  const allEligibleEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (emp.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com' || (emp as any).isSuperAdmin || emp.role === 'superadmin' || emp.productionRole === 'superadmin') {
        return false;
      }
      return true;
    });
  }, [employees]);

  // Filtered employees by category (production vs non-production)
  const displayedEmployees = useMemo(() => {
    let list = allEligibleEmployees;

    if (employeeCategory === 'production') {
      list = list.filter(emp => emp.isProductionEmployee !== false);
    } else if (employeeCategory === 'non_production') {
      list = list.filter(emp => emp.isProductionEmployee === false);
    }

    // If regular employee (not foreman), show ONLY their own salary
    if (!isForeman && currentEmployee) {
      const matched = list.filter(emp => emp.id === currentEmployee.id || emp.email === currentEmployee.email);
      list = matched.length > 0 ? matched : [currentEmployee];
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(emp => 
        emp.name.toLowerCase().includes(q) ||
        (emp.role && emp.role.toLowerCase().includes(q)) ||
        (emp.productionRole && emp.productionRole.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allEligibleEmployees, employeeCategory, isForeman, currentEmployee, search]);

  // Calculate planned hours from scheduleEntries
  const getEmployeePlannedHours = (empId: string, yearMonth: string) => {
    let total = 0;
    Object.keys(scheduleEntries).forEach(key => {
      if (key.startsWith(`${empId}_`) && key.includes(`_${yearMonth}-`)) {
        const entry = scheduleEntries[key];
        total += entry?.hours || 0;
      }
    });
    return total;
  };

  // Calculate salaries for displayed employees
  const calculatedSalaries = useMemo(() => {
    return displayedEmployees.map(emp => {
      // 1. Calculate shift statistics for the selected month
      const matchingShiftLogs = shiftLogs.filter(log => {
        const isSameEmp = log.employeeId === emp.id || (log.email && log.email.trim().toLowerCase() === emp.email?.trim().toLowerCase());
        const isSameMonth = log.date && log.date.startsWith(selectedMonth);
        return isSameEmp && isSameMonth;
      });

      const actualShiftsCount = matchingShiftLogs.length;
      const elapsedSecondsTotal = matchingShiftLogs.reduce((sum, log) => sum + (log.elapsedSeconds || 0), 0);
      const hoursWorked = Math.round((elapsedSecondsTotal / 3600) * 10) / 10;
      const plannedHours = getEmployeePlannedHours(emp.id, selectedMonth);

      // 2. Base payment calculation
      const rateTypeStr = (emp.rateType as string) || 'piecework';
      const baseRate = typeof emp.baseRate === 'number' ? emp.baseRate : (rateTypeStr === 'piecework' ? 0 : 55000);

      let basePay = 0;
      let baseExplanation = '';

      if (rateTypeStr === 'hourly') {
        basePay = Math.round(hoursWorked * baseRate);
        baseExplanation = `Почасовая ставка: ${hoursWorked} ч × ${baseRate} ₽/ч`;
      } else if (rateTypeStr === 'shift') {
        basePay = actualShiftsCount * baseRate;
        baseExplanation = `Оплата за смены: ${actualShiftsCount} выходов × ${baseRate} ₽/смена`;
      } else if (rateTypeStr === 'salary') {
        if (plannedHours > 0 && hoursWorked > 0) {
          const ratio = Math.min(1.5, hoursWorked / plannedHours);
          basePay = Math.round(baseRate * ratio);
          baseExplanation = `Оклад по графику: ${baseRate.toLocaleString('ru-RU')} ₽ × (${hoursWorked} ч / ${plannedHours} ч план = ${Math.round(ratio * 100)}%)`;
        } else {
          basePay = baseRate;
          baseExplanation = `Фиксированный оклад: ${baseRate.toLocaleString('ru-RU')} ₽ / мес`;
        }
      } else {
        // Piecework ('piecework' or mixed)
        if (baseRate > 0) {
          if (plannedHours > 0 && hoursWorked > 0) {
            const ratio = Math.min(1.5, hoursWorked / plannedHours);
            basePay = Math.round(baseRate * ratio);
            baseExplanation = `Окладная часть по выходам: ${baseRate.toLocaleString('ru-RU')} ₽ × (${hoursWorked} ч / ${plannedHours} ч план = ${Math.round(ratio * 100)}%)`;
          } else if (actualShiftsCount > 0) {
            const standardShifts = emp.shiftType === '5/2' ? 21 : 15;
            const ratio = Math.min(1.5, actualShiftsCount / standardShifts);
            basePay = Math.round(baseRate * ratio);
            baseExplanation = `Окладная часть по сменам: ${baseRate.toLocaleString('ru-RU')} ₽ × (${actualShiftsCount} / ${standardShifts} смен = ${Math.round(ratio * 100)}%)`;
          } else {
            basePay = baseRate;
            baseExplanation = `Базовый оклад: ${baseRate.toLocaleString('ru-RU')} ₽`;
          }
        } else {
          basePay = 0;
          baseExplanation = 'Сдельная оплата (оклад 0 ₽)';
        }
      }

      // 3. Piecework calculations from orders.workLogs
      let pieceworkPay = 0;
      const matchedWorkLogs: any[] = [];

      orders.forEach(order => {
        if (order.workLogs && Array.isArray(order.workLogs)) {
          order.workLogs.forEach((log: any) => {
            const isSameEmp = log.employeeId === emp.id || log.employeeName === emp.name;
            const logDate = log.startTime || log.endTime || log.date || '';
            const isSameMonth = logDate.startsWith(selectedMonth);

            if (isSameEmp && isSameMonth) {
              let rate = 0;
              let amountEarned = 0;
              let metricLabel = '';
              let metricValue = 0;

              if (log.stageId === 'cutting') {
                rate = settings?.cuttingRatePerM2 || 65;
                metricValue = log.scannedAreaM2 || order.totalAreaM2 || 0;
                amountEarned = Math.round(metricValue * rate);
                metricLabel = `${metricValue.toFixed(2)} м²`;
              } else if (log.stageId === 'edging') {
                rate = settings?.edgingRatePerM || 35;
                metricValue = log.scannedEdgeM || order.totalEdgeM || 0;
                amountEarned = Math.round(metricValue * rate);
                metricLabel = `${metricValue.toFixed(2)} п.м.`;
              } else if (log.stageId === 'cnc') {
                rate = settings?.cncHoleRate || 8;
                const scannedParts = log.scannedPartsCount || order.partsCount || 0;
                const totalOrderParts = order.partsCount || 1;
                const totalOrderHoles = getOrderCalculatedHoles(order, settings);
                const holes = Math.round((totalOrderHoles / totalOrderParts) * (scannedParts || totalOrderParts));
                amountEarned = Math.round(holes * rate);
                metricLabel = `${holes} отв. (${scannedParts} дет.)`;
              } else if (log.stageId === 'facades') {
                rate = settings?.facadesRatePerM2 || 150;
                metricValue = log.scannedAreaM2 || order.totalAreaM2 || 0;
                amountEarned = Math.round(metricValue * rate);
                metricLabel = `${metricValue.toFixed(2)} м² фасадов`;
              } else if (log.stageId === 'assembly') {
                rate = settings?.assemblyModuleRate || 350;
                metricValue = log.scannedPartsCount || order.partsCount || 0;
                amountEarned = Math.round(metricValue * rate);
                metricLabel = `${metricValue} модулей`;
              } else if (log.stageId === 'kitting') {
                rate = settings?.kittingRatePerOrder || 200;
                amountEarned = rate;
                metricLabel = 'комплектация заказа';
              } else if (log.stageId === 'qc') {
                rate = settings?.qcRatePerOrder || 150;
                amountEarned = rate;
                metricLabel = 'контроль ОТК';
              } else if (log.stageId === 'packing') {
                rate = settings?.packingRatePerOrder || 150;
                amountEarned = rate;
                metricLabel = 'упаковка заказа';
              } else if (log.stageId === 'shipping') {
                rate = settings?.shippingRatePerFact || 300;
                amountEarned = rate;
                metricLabel = 'отгрузка заказа';
              }

              pieceworkPay += amountEarned;
              matchedWorkLogs.push({
                ...log,
                rate,
                metricLabel,
                amountEarned
              });
            }
          });
        }
      });

      // 4. Bonuses & penalties from salaryAdjustments
      const empAdjustments = salaryAdjustments.filter(a => {
        const isSame = a.employeeId === emp.id || a.employeeName === emp.name;
        const isPeriod = !a.date || a.date.startsWith(selectedMonth);
        return isSame && isPeriod;
      });

      const bonusSum = empAdjustments.filter(a => a.type === 'bonus').reduce((sum, a) => sum + a.amount, 0);
      const penaltySum = empAdjustments.filter(a => a.type === 'penalty').reduce((sum, a) => sum + a.amount, 0);
      const netBonus = bonusSum - penaltySum;
      const total = basePay + pieceworkPay + netBonus;

      return {
        employee: emp,
        base: basePay,
        baseRate,
        baseExplanation,
        piecework: pieceworkPay,
        pieceworkLogs: matchedWorkLogs,
        actualShiftsCount,
        hoursWorked,
        plannedHours,
        bonus: netBonus,
        bonusSum,
        penaltySum,
        total,
        adjustments: empAdjustments,
        status: 'approved'
      };
    });
  }, [displayedEmployees, shiftLogs, selectedMonth, scheduleEntries, orders, settings, salaryAdjustments]);

  // Aggregate stats
  const totalPayroll = useMemo(() => calculatedSalaries.reduce((sum, s) => sum + s.total, 0), [calculatedSalaries]);
  const totalBasePay = useMemo(() => calculatedSalaries.reduce((sum, s) => sum + s.base, 0), [calculatedSalaries]);
  const totalPiecework = useMemo(() => calculatedSalaries.reduce((sum, s) => sum + s.piecework, 0), [calculatedSalaries]);
  const totalBonuses = useMemo(() => calculatedSalaries.reduce((sum, s) => sum + s.bonusSum, 0), [calculatedSalaries]);
  const totalPenalties = useMemo(() => calculatedSalaries.reduce((sum, s) => sum + s.penaltySum, 0), [calculatedSalaries]);

  // Analytics for bonuses and penalties in selectedMonth
  const monthAdjustments = useMemo(() => {
    return salaryAdjustments.filter(a => {
      if (!isForeman && currentEmployee) {
        if (a.employeeId !== currentEmployee.id && a.employeeName !== currentEmployee.name) {
          return false;
        }
      }
      return !a.date || a.date.startsWith(selectedMonth);
    });
  }, [salaryAdjustments, isForeman, currentEmployee, selectedMonth]);

  // Filtered adjustments for detailed report
  const filteredAdjustments = useMemo(() => {
    return monthAdjustments.filter(adj => {
      if (analyticsEmployeeFilter !== 'all') {
        if (adj.employeeId !== analyticsEmployeeFilter && adj.employeeName !== analyticsEmployeeFilter) {
          return false;
        }
      }
      if (analyticsTypeFilter !== 'all') {
        if (adj.type !== analyticsTypeFilter) return false;
      }
      return true;
    });
  }, [monthAdjustments, analyticsEmployeeFilter, analyticsTypeFilter]);

  // Employee-by-employee analytics summary
  const adjustmentsByEmployee = useMemo(() => {
    const map = new Map<string, {
      empId: string;
      name: string;
      role: string;
      isProduction: boolean;
      bonusesCount: number;
      bonusesSum: number;
      penaltiesCount: number;
      penaltiesSum: number;
      net: number;
    }>();

    // Initialize with all visible employees
    displayedEmployees.forEach(emp => {
      map.set(emp.id, {
        empId: emp.id,
        name: emp.name,
        role: emp.productionRole || emp.role || 'Сотрудник',
        isProduction: emp.isProductionEmployee !== false,
        bonusesCount: 0,
        bonusesSum: 0,
        penaltiesCount: 0,
        penaltiesSum: 0,
        net: 0
      });
    });

    monthAdjustments.forEach(adj => {
      let key = adj.employeeId;
      if (!map.has(key)) {
        // match by name
        const found = displayedEmployees.find(e => e.name === adj.employeeName);
        if (found) key = found.id;
      }

      if (!map.has(key)) {
        map.set(key, {
          empId: adj.employeeId,
          name: adj.employeeName,
          role: 'Сотрудник',
          isProduction: true,
          bonusesCount: 0,
          bonusesSum: 0,
          penaltiesCount: 0,
          penaltiesSum: 0,
          net: 0
        });
      }

      const item = map.get(key)!;
      if (adj.type === 'bonus') {
        item.bonusesCount += 1;
        item.bonusesSum += adj.amount;
      } else {
        item.penaltiesCount += 1;
        item.penaltiesSum += adj.amount;
      }
      item.net = item.bonusesSum - item.penaltiesSum;
    });

    return Array.from(map.values()).filter(item => {
      // If filtering by specific employee
      if (analyticsEmployeeFilter !== 'all' && item.empId !== analyticsEmployeeFilter && item.name !== analyticsEmployeeFilter) {
        return false;
      }
      // Show if has any bonuses or penalties or if filtered directly
      return item.bonusesCount > 0 || item.penaltiesCount > 0 || analyticsEmployeeFilter !== 'all';
    });
  }, [displayedEmployees, monthAdjustments, analyticsEmployeeFilter]);

  const handleOpenAdjModal = (emp?: ERPEmployee) => {
    setSelectedEmpForAdj(emp || displayedEmployees[0] || null);
    setEditingAdjId(null);
    setAdjType('bonus');
    setAdjAmount(1000);
    setAdjReason('');
    setAdjDate(new Date().toISOString().split('T')[0]);
    setShowAdjModal(true);
  };

  const handleOpenEditModal = (adj: SalaryAdjustment) => {
    const matchedEmp = allEligibleEmployees.find(e => e.id === adj.employeeId || e.name === adj.employeeName) || {
      id: adj.employeeId,
      name: adj.employeeName,
      role: 'Мастер',
      department: 'cutting',
      rateType: 'piecework',
      baseRate: 0,
      shiftType: '2/2',
      status: 'active'
    } as ERPEmployee;

    setSelectedEmpForAdj(matchedEmp);
    setEditingAdjId(adj.id);
    setAdjType(adj.type);
    setAdjAmount(adj.amount);
    setAdjReason(adj.reason);
    setAdjDate(adj.date || new Date().toISOString().split('T')[0]);
    setShowAdjModal(true);
  };

  const handleDeleteAdj = (adjId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись о премии/штрафе?')) {
      if (onDeleteAdjustment) {
        onDeleteAdjustment(adjId);
      }
    }
  };

  const handleSaveAdj = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAdj) return;
    if (!adjReason.trim()) {
      alert('Укажите примечание (пояснение, за что выписана премия или штраф)');
      return;
    }

    if (editingAdjId) {
      if (onEditAdjustment) {
        onEditAdjustment({
          id: editingAdjId,
          employeeId: selectedEmpForAdj.id,
          employeeName: selectedEmpForAdj.name,
          type: adjType,
          amount: Number(adjAmount) || 0,
          reason: adjReason.trim(),
          date: adjDate || new Date().toISOString().split('T')[0],
          createdBy: currentEmployee?.name || 'Руководитель'
        });
      }
    } else {
      if (onAddAdjustment) {
        onAddAdjustment({
          id: `adj-${Date.now()}`,
          employeeId: selectedEmpForAdj.id,
          employeeName: selectedEmpForAdj.name,
          type: adjType,
          amount: Number(adjAmount) || 0,
          reason: adjReason.trim(),
          date: adjDate || new Date().toISOString().split('T')[0],
          createdBy: currentEmployee?.name || 'Руководитель'
        });
      }
    }

    setShowAdjModal(false);
  };

  const prodCount = useMemo(() => allEligibleEmployees.filter(e => e.isProductionEmployee !== false).length, [allEligibleEmployees]);
  const nonProdCount = useMemo(() => allEligibleEmployees.filter(e => e.isProductionEmployee === false).length, [allEligibleEmployees]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" /> {isForeman ? 'Фонд оплаты труда и расчет ЗП' : 'Мой личный кабинет оплаты'}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            {isForeman ? 'Расчет заработной платы, окладов и выработки' : 'Расчет моей заработной платы и начислений'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Гибкий расчет: оклад по смене/часам + сдельная выработка цеха + детальный учет премий и штрафов
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {isForeman && (
            <button
              onClick={() => handleOpenAdjModal()}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Премия / Штраф
            </button>
          )}

          <button 
            onClick={() => window.print()}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Ведомость
          </button>
        </div>
      </div>

      {/* Category Tabs: Production vs Other Employees */}
      {isForeman && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Категория:
            </span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setEmployeeCategory('production')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  employeeCategory === 'production'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏭 Сотрудники производства</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  employeeCategory === 'production' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {prodCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEmployeeCategory('non_production')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  employeeCategory === 'non_production'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏢 Остальные сотрудники</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  employeeCategory === 'non_production' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {nonProdCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEmployeeCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  employeeCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Все ({allEligibleEmployees.length})</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 px-2 font-medium">
            Показано: <strong className="text-slate-800">{displayedEmployees.length}</strong> сотрудников
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">
            {isForeman ? 'Общий ФОТ к выплате' : 'Итого к выплате'}
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">
            {totalPayroll.toLocaleString('ru-RU')} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {isForeman ? `Сотрудников в списке: ${displayedEmployees.length} чел.` : `Расчет за ${selectedMonth}`}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">
            Окладная часть (время/смены)
          </div>
          <div className="text-3xl font-black text-slate-800 mb-1">
            {totalBasePay.toLocaleString('ru-RU')} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            С учетом отработанных часов и выходов
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">
            Сдельная часть (выработка)
          </div>
          <div className="text-3xl font-black text-indigo-600 mb-1">
            {totalPiecework.toLocaleString('ru-RU')} <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> По факту закрытых операций
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">
            Премии и штрафы (баланс)
          </div>
          <div className="text-3xl font-black mb-1 flex items-baseline gap-1">
            <span className={totalBonuses - totalPenalties >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {(totalBonuses - totalPenalties >= 0 ? '+' : '') + (totalBonuses - totalPenalties).toLocaleString('ru-RU')}
            </span>
            <span className="text-base font-bold text-slate-400">₽</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
            <span className="text-emerald-600 font-bold">+{totalBonuses.toLocaleString('ru-RU')}</span>
            <span>/</span>
            <span className="text-rose-600 font-bold">-{totalPenalties.toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      {/* Salaries Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {isForeman ? 'Ведомость начислений по сотрудникам' : 'Расчетная ведомость'}
            </h3>
            <p className="text-xs text-slate-400">
              {isForeman ? 'Детализация окладной, сдельной и премиальной частей по каждому сотруднику' : 'Детализация начислений за отработанный период'}
            </p>
          </div>

          {isForeman && (
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по имени или должности..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400">
                <th className="pb-3 px-3">Сотрудник / Должность</th>
                <th className="pb-3 px-3">Категория / Участок</th>
                <th className="pb-3 px-3">Тип оплаты</th>
                <th className="pb-3 px-3">Оклад / Выходы</th>
                <th className="pb-3 px-3">Сдельная часть</th>
                <th className="pb-3 px-3">Премии / Штрафы</th>
                <th className="pb-3 px-3 font-black text-slate-900 text-right">Итого к выплате</th>
                {isForeman && <th className="pb-3 px-3 text-center">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {calculatedSalaries.map(({ employee, base, baseRate, baseExplanation, piecework, pieceworkLogs, actualShiftsCount, hoursWorked, plannedHours, bonus, bonusSum, penaltySum, total }) => {
                const isExpanded = expandedEmployeeId === employee.id;
                const isProd = employee.isProductionEmployee !== false;

                return (
                  <React.Fragment key={employee.id}>
                    <tr 
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      onClick={() => setExpandedEmployeeId(isExpanded ? null : employee.id)}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isProd ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {employee.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{employee.name}</span>
                            {!isProd && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase">
                                Офис / Вне цеха
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {employee.productionRole || employee.role || (isProd ? 'Мастер' : 'Сотрудник')}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                          isProd ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {employee.department === 'cutting' ? 'Раскрой' : 
                           employee.department === 'edging' ? 'Кромление' : 
                           employee.department === 'cnc' ? 'ЧПУ' : 
                           employee.department === 'assembly' ? 'Сборка' : 
                           employee.department === 'kitting' ? 'Комплектовка' : 
                           employee.department === 'facades' ? 'Фасады' : 
                           employee.department === 'packing' ? 'Упаковка' : 
                           employee.department === 'qc' ? 'ОТК' : 
                           employee.department === 'shipping' ? 'Отгрузка' : 
                           employee.department === 'warehouse' ? 'Склад' : 
                           employee.department === 'management' ? 'Управление' : 'Штат'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {(employee.rateType as string) === 'hourly' ? 'Почасовая' : 
                         (employee.rateType as string) === 'shift' ? 'За смену' : 
                         (employee.rateType as string) === 'salary' ? 'Оклад' : 
                         (baseRate > 0 ? 'Сделка + Оклад' : 'Сдельная')}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-slate-900">{base.toLocaleString('ru-RU')} ₽</div>
                        <div className="text-[10px] text-slate-400">{actualShiftsCount} вых. / {hoursWorked} ч</div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                        {piecework.toLocaleString('ru-RU')} ₽
                      </td>

                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={bonus >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {bonus >= 0 ? `+${bonus.toLocaleString('ru-RU')}` : bonus.toLocaleString('ru-RU')} ₽
                        </span>
                        {(bonusSum > 0 || penaltySum > 0) && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            +{bonusSum} / -{penaltySum}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                        {total.toLocaleString('ru-RU')} ₽
                      </td>

                      {isForeman && (
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenAdjModal(employee)}
                            className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            title="Выписать премию или штраф сотруднику"
                          >
                            <Plus className="w-3.5 h-3.5" /> Премия / Штраф
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Detailed expandable card */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={isForeman ? 8 : 7} className="p-4 border-l-4 border-emerald-500">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  Отработанные смены и оклад
                                </h4>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Фактических выходов на смену:</span>
                                    <span className="font-extrabold text-slate-900">{actualShiftsCount} вых.</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Фактически отработано:</span>
                                    <span className="font-mono font-bold text-slate-900">{hoursWorked} ч</span>
                                  </div>
                                  {plannedHours > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Запланировано по графику:</span>
                                      <span className="font-mono text-slate-700">{plannedHours} ч</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5">
                                    <span className="font-bold text-slate-700">Окладная ставка:</span>
                                    <span className="font-mono font-bold text-slate-800">{baseRate.toLocaleString('ru-RU')} ₽</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5">
                                    <span className="font-bold text-slate-700">Начислено за время:</span>
                                    <span className="font-extrabold text-slate-900">{base.toLocaleString('ru-RU')} ₽</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 italic font-medium pt-1">
                                    {baseExplanation}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-2 flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                                  Сводка сдельного объема
                                </h4>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Всего закрытых операций:</span>
                                    <span className="font-extrabold text-indigo-900">{pieceworkLogs.length}</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5">
                                    <span className="font-bold text-indigo-600">Начислено по тарифам:</span>
                                    <span className="font-extrabold text-indigo-600 text-sm">{piecework.toLocaleString('ru-RU')} ₽</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 leading-relaxed pt-1">
                                    {isProd 
                                      ? 'Сдельная часть рассчитывается автоматически по тарифам участков на основе выполненных сканирований деталей и бирок.' 
                                      : 'Для сотрудников не из цеха сдельная часть может формироваться по закрытым задачам или фиксироваться 0 ₽.'}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider mb-2 flex items-center gap-1.5">
                                  <Award className="w-3.5 h-3.5 text-amber-500" />
                                  Премии и взыскания
                                </h4>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Премий начислено:</span>
                                    <span className="font-bold text-emerald-600">+{bonusSum.toLocaleString('ru-RU')} ₽</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Штрафов удержано:</span>
                                    <span className="font-bold text-rose-600">-{penaltySum.toLocaleString('ru-RU')} ₽</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-t border-slate-100 pt-1.5">
                                    <span className="font-bold text-slate-700">Итого премий / штрафов:</span>
                                    <span className={`font-black ${bonus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {bonus >= 0 ? `+${bonus.toLocaleString('ru-RU')}` : bonus.toLocaleString('ru-RU')} ₽
                                    </span>
                                  </div>
                                  {isForeman && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdjModal(employee)}
                                      className="w-full mt-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Добавить премию/штраф
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Piecework Logs */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Детализация закрытых сдельных работ (реальные сканирования)
                              </h4>
                              {pieceworkLogs.length === 0 ? (
                                <div className="text-center py-5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                                  Зарегистрированные сдельные работы за выбранный месяц отсутствуют.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="pb-2">Заказ / Деталь</th>
                                        <th className="pb-2">Участок</th>
                                        <th className="pb-2 text-right">Выработка</th>
                                        <th className="pb-2 text-right">Тариф</th>
                                        <th className="pb-2 text-right">Сумма</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {pieceworkLogs.map((log, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                          <td className="py-2 text-slate-900 font-bold">
                                            {log.orderNumber ? `Заказ №${log.orderNumber}` : `ID: ${log.orderId?.substring(0, 8)}...`}
                                          </td>
                                          <td className="py-2 text-slate-500 capitalize">
                                            {log.stageId === 'cutting' ? 'Раскрой' : 
                                             log.stageId === 'edging' ? 'Кромка' : 
                                             log.stageId === 'cnc' ? 'Присадка / ЧПУ' : 
                                             log.stageId === 'assembly' ? 'Сборка' : 
                                             log.stageId === 'kitting' ? 'Комплектовка' : 
                                             log.stageId === 'qc' ? 'ОТК (Контроль)' : 
                                             log.stageId === 'packing' ? 'Упаковка' : 
                                             log.stageId === 'shipping' ? 'Отгрузка' : 
                                             log.stageId === 'facades' ? 'Фасады' : log.stageId}
                                          </td>
                                          <td className="py-2 text-right font-mono font-bold text-slate-700">
                                            {log.metricLabel}
                                          </td>
                                          <td className="py-2 text-right font-mono text-slate-500">
                                            {log.rate} ₽
                                          </td>
                                          <td className="py-2 text-right font-mono font-extrabold text-emerald-600">
                                            +{log.amountEarned?.toLocaleString('ru-RU')} ₽
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DETAILED ANALYTICS REPORT: BONUSES & PENALTIES            */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" /> Аналитический отчет
            </div>
            <h3 className="font-black text-slate-900 text-lg">
              {isForeman ? 'Общая аналитика по премиям и штрафам' : 'Моя сводная аналитика премий и штрафов'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Сводные данные за {selectedMonth}: распределение по сотрудникам, видам поощрений и взысканий
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Employee */}
            {isForeman && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={analyticsEmployeeFilter}
                  onChange={(e) => setAnalyticsEmployeeFilter(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  <option value="all">Все сотрудники</option>
                  {allEligibleEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.productionRole || emp.role || 'Сотрудник'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Type */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={analyticsTypeFilter}
                onChange={(e) => setAnalyticsTypeFilter(e.target.value as any)}
                className="bg-transparent outline-none cursor-pointer"
              >
                <option value="all">Все записи (премии + штрафы)</option>
                <option value="bonus">Только премии (+)</option>
                <option value="penalty">Только штрафы (-)</option>
              </select>
            </div>

            {isForeman && (
              <button
                onClick={() => handleOpenAdjModal()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Выписать премию / штраф
              </button>
            )}
          </div>
        </div>

        {/* Analytics Summary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
            <div className="text-[11px] font-black uppercase text-emerald-800 tracking-wider mb-1 flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              Премиальный фонд
            </div>
            <div className="text-2xl font-black text-emerald-950 font-mono">
              +{monthAdjustments.filter(a => a.type === 'bonus').reduce((sum, a) => sum + a.amount, 0).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Начислено {monthAdjustments.filter(a => a.type === 'bonus').length} премий за период
            </div>
          </div>

          <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200">
            <div className="text-[11px] font-black uppercase text-rose-800 tracking-wider mb-1 flex items-center gap-1.5">
              <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
              Сумма штрафов
            </div>
            <div className="text-2xl font-black text-rose-950 font-mono">
              -{monthAdjustments.filter(a => a.type === 'penalty').reduce((sum, a) => sum + a.amount, 0).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-rose-700 mt-1">
              Удержано {monthAdjustments.filter(a => a.type === 'penalty').length} штрафов за период
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              Итоговое сальдо
            </div>
            <div className={`text-2xl font-black font-mono ${
              totalBonuses - totalPenalties >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {(totalBonuses - totalPenalties >= 0 ? '+' : '') + (totalBonuses - totalPenalties).toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Чистое влияние на ФОТ предприятия
            </div>
          </div>

          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200">
            <div className="text-[11px] font-black uppercase text-indigo-800 tracking-wider mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Охват по сотрудникам
            </div>
            <div className="text-2xl font-black text-indigo-950 font-mono">
              {adjustmentsByEmployee.length} чел.
            </div>
            <div className="text-[11px] text-indigo-700 mt-1">
              Сотрудников с премиями или взысканиями
            </div>
          </div>
        </div>

        {/* Detailed Breakdown per Employee Table */}
        {isForeman && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Сводная ведомость по сотрудникам за {selectedMonth}
              </h4>
              <span className="text-[11px] text-slate-400">
                Показаны сотрудники с активными начислениями
              </span>
            </div>

            {adjustmentsByEmployee.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                За выбранный период начислений премий или штрафов не найдено.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50">
                      <th className="py-2.5 px-3">Сотрудник</th>
                      <th className="py-2.5 px-3">Должность</th>
                      <th className="py-2.5 px-3 text-center">Премий (шт)</th>
                      <th className="py-2.5 px-3 text-right">Сумма премий</th>
                      <th className="py-2.5 px-3 text-center">Штрафов (шт)</th>
                      <th className="py-2.5 px-3 text-right">Сумма штрафов</th>
                      <th className="py-2.5 px-3 text-right font-black text-slate-900">Итоговый баланс</th>
                      <th className="py-2.5 px-3 text-center">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {adjustmentsByEmployee.map((item) => (
                      <tr key={item.empId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {item.role}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                          {item.bonusesCount > 0 ? `${item.bonusesCount} шт` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {item.bonusesSum > 0 ? `+${item.bonusesSum.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                          {item.penaltiesCount > 0 ? `${item.penaltiesCount} шт` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                          {item.penaltiesSum > 0 ? `-${item.penaltiesSum.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black">
                          <span className={item.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {item.net >= 0 ? `+${item.net.toLocaleString('ru-RU')}` : item.net.toLocaleString('ru-RU')} ₽
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const emp = allEligibleEmployees.find(e => e.id === item.empId || e.name === item.name);
                              handleOpenAdjModal(emp);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold cursor-pointer"
                          >
                            + Начислить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Chronological List of Entries with Explanations */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Журнал записей с пояснениями ({filteredAdjustments.length})
            </h4>
          </div>

          {filteredAdjustments.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              Записи о премиях или штрафах по заданным критериям отсутствуют.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAdjustments.map((adj) => (
                <div 
                  key={adj.id} 
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                    adj.type === 'bonus' 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                      : 'bg-rose-50/60 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase ${
                        adj.type === 'bonus' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                      }`}>
                        {adj.type === 'bonus' ? 'Премия (+)' : 'Штраф (-)'}
                      </span>
                      {isForeman && (
                        <span className="font-bold text-slate-900">{adj.employeeName}</span>
                      )}
                      <span className="text-slate-400 text-[11px] font-mono">{adj.date}</span>
                      {adj.createdBy && (
                        <span className="text-[10px] text-slate-400">Автор: {adj.createdBy}</span>
                      )}
                    </div>
                    <div className="font-medium text-slate-800 pl-0.5">
                      <strong>Примечание:</strong> {adj.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="font-mono font-black text-sm text-right">
                      {adj.type === 'bonus' ? `+${adj.amount.toLocaleString('ru-RU')} ₽` : `-${adj.amount.toLocaleString('ru-RU')} ₽`}
                    </div>

                    {isForeman && (
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200/80">
                        <button
                          onClick={() => handleOpenEditModal(adj)}
                          className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-blue-600 border border-slate-200 transition-colors cursor-pointer"
                          title="Редактировать запись"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAdj(adj.id)}
                          className="p-1.5 rounded-xl bg-white hover:bg-rose-100 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                          title="Удалить запись"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add or Edit Bonus/Penalty */}
      {showAdjModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  {editingAdjId ? 'Редактирование записи' : 'Новое начисление / Взыскание'}
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingAdjId ? 'Изменить премию / штраф' : 'Выписать премию или штраф'}
                </h3>
              </div>
              <button 
                onClick={() => setShowAdjModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdj} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Сотрудник</label>
                <select
                  value={selectedEmpForAdj?.id || ''}
                  onChange={(e) => {
                    const found = allEligibleEmployees.find(emp => emp.id === e.target.value);
                    if (found) setSelectedEmpForAdj(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Выберите сотрудника</option>
                  {allEligibleEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.productionRole || emp.role || 'Сотрудник'}) {emp.isProductionEmployee === false ? '[Офис/Вне цеха]' : '[Цех]'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Тип начисления</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('bonus')}
                    className={`py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      adjType === 'bonus'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" /> Премия (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('penalty')}
                    className={`py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      adjType === 'penalty'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" /> Штраф (-)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Сумма (₽)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Дата начисления</label>
                  <input
                    type="date"
                    value={adjDate}
                    onChange={(e) => setAdjDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Примечание / За что (видимо сотруднику)
                </label>
                <textarea
                  rows={3}
                  placeholder="Например: Премия за перевыполнение плана по кромкооблицовке или Штраф за дефект детали №5"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-200 transition-all cursor-pointer"
                >
                  {editingAdjId ? 'Сохранить изменения' : 'Выписать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
