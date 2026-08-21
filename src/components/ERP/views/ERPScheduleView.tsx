import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Check,
  Printer,
  Sparkles,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Info,
  CalendarRange,
  X,
  Sun,
  Moon,
  Coffee,
  HeartPulse,
  Palmtree
} from 'lucide-react';
import { ERPEmployee, WorkShift, ShiftCellType, EmployeeScheduleEntry } from '../types';

interface ERPScheduleViewProps {
  employees: ERPEmployee[];
  shifts?: WorkShift[];
  onAddShift?: (shift: Partial<WorkShift>) => void;
  onUpdateSchedule?: (entries: Record<string, EmployeeScheduleEntry>) => void;
  entries?: Record<string, EmployeeScheduleEntry>;
  companyId?: string;
}

type ViewMode = 'week' | 'two_weeks' | 'month';

const SHIFT_TYPES: {
  id: ShiftCellType;
  label: string;
  shortLabel: string;
  hours: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'work_12',
    label: 'Дневная смена (12ч)',
    shortLabel: '12ч',
    hours: 12,
    bgClass: 'bg-emerald-500/15 hover:bg-emerald-500/25',
    textClass: 'text-emerald-700 font-black',
    borderClass: 'border-emerald-500/30',
    badgeClass: 'bg-emerald-600 text-white',
    icon: Sun
  },
  {
    id: 'work_8',
    label: 'Стандартная смена (8ч)',
    shortLabel: '8ч',
    hours: 8,
    bgClass: 'bg-blue-500/15 hover:bg-blue-500/25',
    textClass: 'text-blue-700 font-black',
    borderClass: 'border-blue-500/30',
    badgeClass: 'bg-blue-600 text-white',
    icon: Clock
  },
  {
    id: 'night_12',
    label: 'Ночная смена (12ч)',
    shortLabel: 'Н 12ч',
    hours: 12,
    bgClass: 'bg-purple-500/15 hover:bg-purple-500/25',
    textClass: 'text-purple-700 font-black',
    borderClass: 'border-purple-500/30',
    badgeClass: 'bg-purple-600 text-white',
    icon: Moon
  },
  {
    id: 'day_off',
    label: 'Выходной день',
    shortLabel: 'В',
    hours: 0,
    bgClass: 'bg-slate-100/70 hover:bg-slate-200/70',
    textClass: 'text-slate-500 font-bold',
    borderClass: 'border-slate-200',
    badgeClass: 'bg-slate-400 text-white',
    icon: Coffee
  },
  {
    id: 'vacation',
    label: 'Ежегодный отпуск',
    shortLabel: 'ОТП',
    hours: 0,
    bgClass: 'bg-amber-500/15 hover:bg-amber-500/25',
    textClass: 'text-amber-800 font-bold',
    borderClass: 'border-amber-500/30',
    badgeClass: 'bg-amber-500 text-slate-950 font-black',
    icon: Palmtree
  },
  {
    id: 'sick',
    label: 'Больничный лист',
    shortLabel: 'Б',
    hours: 0,
    bgClass: 'bg-rose-500/15 hover:bg-rose-500/25',
    textClass: 'text-rose-700 font-bold',
    borderClass: 'border-rose-500/30',
    badgeClass: 'bg-rose-600 text-white',
    icon: HeartPulse
  }
];

export const ERPScheduleView: React.FC<ERPScheduleViewProps> = ({
  employees,
  shifts = [],
  onAddShift,
  onUpdateSchedule,
  entries,
  companyId
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('two_weeks');
  const [currentDateOffset, setCurrentDateOffset] = useState<Date>(() => {
    const d = new Date();
    // Normalize to Monday of current week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Storage key for schedule entries
  const storageKey = companyId ? `erp_schedule_entries_${companyId}` : 'erp_production_schedule_grid_v1';
  
  // Stored schedule entries: key = `empId_YYYY-MM-DD`
  const [scheduleEntries, setScheduleEntries] = useState<Record<string, EmployeeScheduleEntry>>(() => {
    if (entries && Object.keys(entries).length > 0) return entries;
    try {
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('erp_production_schedule_grid_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load schedule entries from storage', e);
    }
    return {};
  });

  useEffect(() => {
    if (entries && Object.keys(entries).length > 0) {
      setScheduleEntries(entries);
    }
  }, [entries]);

  // Cell popover selector state
  const [activeCell, setActiveCell] = useState<{
    employeeId: string;
    employeeName: string;
    date: string;
    dayOfWeek: string;
    formattedDate: string;
    x: number;
    y: number;
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Auto-save to localStorage whenever scheduleEntries changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(scheduleEntries));
      if (onUpdateSchedule) {
        onUpdateSchedule(scheduleEntries);
      }
    } catch (e) {
      console.warn('Failed to save schedule entries', e);
    }
  }, [scheduleEntries, onUpdateSchedule, storageKey]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveCell(null);
      }
    };
    if (activeCell) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeCell]);

  const departmentsList = [
    { id: 'all', name: 'Все участки цеха' },
    { id: 'cutting', name: 'Раскрой (Форматно-раскроечный)' },
    { id: 'edging', name: 'Кромкооблицовка' },
    { id: 'cnc', name: 'Присадка ЧПУ' },
    { id: 'facades', name: 'Фасады / МДФ' },
    { id: 'assembly', name: 'Сборка корпусов' },
    { id: 'kitting', name: 'Комплектовка' },
    { id: 'qc', name: 'ОТК и Контроль' },
    { id: 'packaging', name: 'Упаковка' }
  ];

  // Filter for production employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (e.isProductionEmployee === false) return false;
      if (e.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com' || (e as any).isSuperAdmin || e.role === 'superadmin' || e.productionRole === 'superadmin') {
        return false;
      }
      if (selectedDepartment !== 'all' && e.department !== selectedDepartment) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return e.name.toLowerCase().includes(q) || (e.role || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [employees, selectedDepartment, searchQuery]);

  // Compute dates array based on viewMode and currentDateOffset
  const dateColumns = useMemo(() => {
    const dates: { dateStr: string; dateObj: Date; dayNum: number; dayOfWeek: string; isWeekend: boolean; isToday: boolean }[] = [];
    const baseDate = new Date(currentDateOffset);
    baseDate.setHours(0, 0, 0, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const daysOfWeekRu = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

    let numDays = 7;
    if (viewMode === 'week') {
      numDays = 7;
      // Start from Monday
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      baseDate.setDate(diff);
    } else if (viewMode === 'two_weeks') {
      numDays = 14;
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      baseDate.setDate(diff);
    } else if (viewMode === 'month') {
      // Entire month
      baseDate.setDate(1);
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      numDays = lastDay;
    }

    for (let i = 0; i < numDays; i++) {
      const cur = new Date(baseDate);
      cur.setDate(baseDate.getDate() + i);

      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayOfWeekIdx = cur.getDay();

      dates.push({
        dateStr,
        dateObj: cur,
        dayNum: cur.getDate(),
        dayOfWeek: daysOfWeekRu[dayOfWeekIdx],
        isWeekend: dayOfWeekIdx === 0 || dayOfWeekIdx === 6,
        isToday: dateStr === todayStr
      });
    }

    return dates;
  }, [viewMode, currentDateOffset]);

  // Format header period title
  const periodTitle = useMemo(() => {
    if (dateColumns.length === 0) return '';
    const first = dateColumns[0].dateObj;
    const last = dateColumns[dateColumns.length - 1].dateObj;

    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    if (viewMode === 'month') {
      const monthTitles = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ];
      return `${monthTitles[first.getMonth()]} ${first.getFullYear()} г.`;
    }

    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} — ${last.getDate()} ${monthNames[first.getMonth()]} ${first.getFullYear()} г.`;
    }
    return `${first.getDate()} ${monthNames[first.getMonth()]} — ${last.getDate()} ${monthNames[last.getMonth()]} ${last.getFullYear()} г.`;
  }, [dateColumns, viewMode]);

  // Navigate back/forward
  const handlePrevPeriod = () => {
    setCurrentDateOffset(prev => {
      const d = new Date(prev);
      if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else if (viewMode === 'two_weeks') d.setDate(d.getDate() - 14);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextPeriod = () => {
    setCurrentDateOffset(prev => {
      const d = new Date(prev);
      if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else if (viewMode === 'two_weeks') d.setDate(d.getDate() + 14);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleGoToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentDateOffset(new Date(d.setDate(diff)));
  };

  // Get cell entry or default from employee schedule pattern
  const getCellEntry = (emp: ERPEmployee, dateStr: string): EmployeeScheduleEntry | null => {
    const key = `${emp.id}_${dateStr}`;
    if (scheduleEntries[key]) {
      return scheduleEntries[key];
    }
    return null;
  };

  // Set cell shift type
  const handleSetCellShift = (empId: string, dateStr: string, shiftType: ShiftCellType | 'clear') => {
    const key = `${empId}_${dateStr}`;
    setScheduleEntries(prev => {
      const next = { ...prev };
      if (shiftType === 'clear') {
        delete next[key];
      } else {
        const typeInfo = SHIFT_TYPES.find(t => t.id === shiftType);
        next[key] = {
          employeeId: empId,
          date: dateStr,
          type: shiftType,
          hours: typeInfo ? typeInfo.hours : 12
        };
      }
      return next;
    });
    setActiveCell(null);
  };

  // Quick cell click: cycle or open selector
  const handleCellClick = (e: React.MouseEvent, emp: ERPEmployee, dateItem: { dateStr: string; dayNum: number; dayOfWeek: string }) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    // Position popover
    setActiveCell({
      employeeId: emp.id,
      employeeName: emp.name,
      date: dateItem.dateStr,
      dayOfWeek: dateItem.dayOfWeek,
      formattedDate: `${dateItem.dayNum} (${dateItem.dayOfWeek})`,
      x: Math.min(rect.left, window.innerWidth - 260),
      y: rect.bottom + window.scrollY + 6
    });
  };

  // Bulk Auto-fill patterns (2/2 or 5/2)
  const handleAutoFillPattern = (pattern: '2/2' | '5/2' | 'clear') => {
    if (pattern === 'clear') {
      if (!window.confirm(`Очистить весь график за период ${periodTitle}?`)) return;
      setScheduleEntries(prev => {
        const next = { ...prev };
        filteredEmployees.forEach(emp => {
          dateColumns.forEach(d => {
            delete next[`${emp.id}_${d.dateStr}`];
          });
        });
        return next;
      });
      return;
    }

    setScheduleEntries(prev => {
      const next = { ...prev };
      filteredEmployees.forEach((emp, empIdx) => {
        dateColumns.forEach((d, dayIdx) => {
          const key = `${emp.id}_${d.dateStr}`;
          if (pattern === '2/2') {
            // Alternate 2 work, 2 off with stagger by employee index
            const cycle = (dayIdx + (empIdx * 2)) % 4;
            if (cycle === 0 || cycle === 1) {
              next[key] = {
                employeeId: emp.id,
                date: d.dateStr,
                type: 'work_12',
                hours: 12
              };
            } else {
              next[key] = {
                employeeId: emp.id,
                date: d.dateStr,
                type: 'day_off',
                hours: 0
              };
            }
          } else if (pattern === '5/2') {
            if (!d.isWeekend) {
              next[key] = {
                employeeId: emp.id,
                date: d.dateStr,
                type: 'work_8',
                hours: 8
              };
            } else {
              next[key] = {
                employeeId: emp.id,
                date: d.dateStr,
                type: 'day_off',
                hours: 0
              };
            }
          }
        });
      });
      return next;
    });
  };

  // Calculations for summary stats
  const totalEmployeesCount = filteredEmployees.length;

  // On-duty today count
  const todayStr = new Date().toISOString().split('T')[0];
  const onDutyTodayCount = filteredEmployees.filter(emp => {
    const cell = getCellEntry(emp, todayStr);
    return cell && (cell.type === 'work_12' || cell.type === 'work_8' || cell.type === 'night_12');
  }).length;

  // Calculate worker totals for the visible period
  const getEmployeePeriodStats = (emp: ERPEmployee) => {
    let shiftsCount = 0;
    let totalHours = 0;

    dateColumns.forEach(d => {
      const entry = getCellEntry(emp, d.dateStr);
      if (entry) {
        if (entry.type === 'work_12' || entry.type === 'work_8' || entry.type === 'night_12') {
          shiftsCount += 1;
          totalHours += entry.hours;
        }
      }
    });

    return { shiftsCount, totalHours };
  };

  // Calculate daily totals for summary footer row
  const getDailyTotals = (dateStr: string) => {
    let mastersOnDuty = 0;
    let totalPlannedHours = 0;

    filteredEmployees.forEach(emp => {
      const entry = getCellEntry(emp, dateStr);
      if (entry && (entry.type === 'work_12' || entry.type === 'work_8' || entry.type === 'night_12')) {
        mastersOnDuty += 1;
        totalPlannedHours += entry.hours;
      }
    });

    return { mastersOnDuty, totalPlannedHours };
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <CalendarRange className="w-4 h-4" /> Планирование смен и график работы цеха
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            График сменности мастеров
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Кликните по любой ячейке сотрудника для назначения дневной (12ч/8ч) или ночной смены, отпуска или выходного
          </p>
        </div>

        {/* View Mode & Period Navigation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher (Week / 2 Weeks / Month) */}
          <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Неделя
            </button>
            <button
              onClick={() => setViewMode('two_weeks')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                viewMode === 'two_weeks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2 Недели
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Месяц
            </button>
          </div>

          {/* Period Nav */}
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={handlePrevPeriod}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Предыдущий период"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-800 px-2 min-w-[140px] text-center">
              {periodTitle}
            </span>
            <button
              onClick={handleNextPeriod}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Следующий период"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGoToday}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer"
          >
            Сегодня
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="Печать табеля"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Stat Badges & Quick Auto-fill Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{onDutyTodayCount} чел</div>
            <div className="text-[11px] font-semibold text-slate-500">На смене сегодня в цехе</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{totalEmployeesCount} мастеров</div>
            <div className="text-[11px] font-semibold text-slate-500">В штате производства</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">08:00 – 20:00</div>
            <div className="text-[11px] font-semibold text-slate-500">Дневная смена (12ч)</div>
          </div>
        </div>

        {/* Quick Batch Actions Dropdown / Tools */}
        <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-sm flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-black text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Автозаполнение
            </div>
            <div className="text-[11px] text-slate-300">Шаблоны графиков</div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAutoFillPattern('2/2')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all cursor-pointer border border-slate-700"
              title="Заполнить всех по графику 2/2"
            >
              2/2
            </button>
            <button
              onClick={() => handleAutoFillPattern('5/2')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all cursor-pointer border border-slate-700"
              title="Заполнить всех по графику 5/2"
            >
              5/2
            </button>
            <button
              onClick={() => handleAutoFillPattern('clear')}
              className="px-2 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold transition-all cursor-pointer border border-rose-800/60"
              title="Очистить график за период"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {departmentsList.map(dep => (
              <option key={dep.id} value={dep.id}>{dep.name}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск мастера по имени..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Interactive Matrix Schedule Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full border-collapse select-none text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Employee Info Header (Fixed width left) */}
                <th className="py-3.5 px-4 font-black text-slate-500 text-[11px] uppercase tracking-wider min-w-[220px] max-w-[240px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  Сотрудник / Участок
                </th>

                {/* Date Columns */}
                {dateColumns.map((col) => (
                  <th
                    key={col.dateStr}
                    className={`py-2 px-1 text-center border-r border-slate-200/80 min-w-[42px] max-w-[60px] ${
                      col.isToday 
                        ? 'bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-500 ring-inset' 
                        : col.isWeekend 
                          ? 'bg-rose-50/40 text-rose-900' 
                          : 'text-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-extrabold uppercase opacity-75">
                      {col.dayOfWeek}
                    </div>
                    <div className={`text-sm font-black mt-0.5 ${col.isToday ? 'text-indigo-600 font-extrabold' : ''}`}>
                      {col.dayNum}
                    </div>
                    {col.isToday && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 mx-auto mt-0.5" />
                    )}
                  </th>
                ))}

                {/* Summary Header */}
                <th className="py-3.5 px-3 font-black text-slate-500 text-[11px] uppercase tracking-wider text-center min-w-[100px] bg-slate-50">
                  Итого за период
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={dateColumns.length + 2} className="py-12 text-center text-slate-400 text-xs font-semibold">
                    Сотрудники по выбранным критериям не найдены.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const stats = getEmployeePeriodStats(emp);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Left: Employee details */}
                      <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/90 transition-colors z-10 border-r border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shrink-0">
                            {emp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate" title={emp.name}>
                              {emp.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="truncate">
                                {emp.department === 'cutting' ? 'Раскрой' : emp.department === 'edging' ? 'Кромление' : emp.department === 'cnc' ? 'ЧПУ' : emp.department === 'assembly' ? 'Сборка' : 'Цех'}
                              </span>
                              <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                                {emp.shiftType || '2/2'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date Cells */}
                      {dateColumns.map((col) => {
                        const entry = getCellEntry(emp, col.dateStr);
                        const typeInfo = entry ? SHIFT_TYPES.find(t => t.id === entry.type) : null;

                        return (
                          <td
                            key={col.dateStr}
                            onClick={(e) => handleCellClick(e, emp, col)}
                            className={`p-1 text-center border-r border-slate-100 cursor-pointer transition-all duration-150 relative ${
                              col.isToday ? 'bg-indigo-50/30' : col.isWeekend ? 'bg-slate-50/50' : ''
                            } hover:scale-[1.03] hover:z-5`}
                          >
                            {entry && typeInfo ? (
                              <div
                                className={`w-full py-2 px-1 rounded-xl border text-[11px] flex flex-col items-center justify-center shadow-2xs transition-all ${typeInfo.bgClass} ${typeInfo.borderClass} ${typeInfo.textClass}`}
                                title={`${emp.name}: ${typeInfo.label} (${col.dateStr})`}
                              >
                                <span className="leading-tight">{typeInfo.shortLabel}</span>
                              </div>
                            ) : (
                              <div
                                className="w-full py-2.5 rounded-xl border border-dashed border-transparent hover:border-slate-300 hover:bg-slate-100/70 text-slate-300 hover:text-slate-600 flex items-center justify-center text-[10px]"
                                title={`Нажмите, чтобы назначить смену`}
                              >
                                <span className="opacity-0 hover:opacity-100 font-bold">+</span>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Right: Period Totals for this Employee */}
                      <td className="py-3 px-3 text-center bg-slate-50/50">
                        <div className="font-black text-xs text-slate-900">
                          {stats.shiftsCount} <span className="text-[10px] font-normal text-slate-500">смен</span>
                        </div>
                        <div className="text-[10px] font-bold text-indigo-600">
                          {stats.totalHours} ч
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Summary Row: Total masters on duty per day */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                <td className="py-3 px-4 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 text-xs">
                  <div className="font-black text-slate-100">Итого мастеров на смене:</div>
                  <div className="text-[10px] text-slate-400 font-normal">Потребность цеха: min 3-4 чел</div>
                </td>

                {dateColumns.map((col) => {
                  const dayTotal = getDailyTotals(col.dateStr);
                  const isLow = dayTotal.mastersOnDuty < 2 && filteredEmployees.length > 2;

                  return (
                    <td
                      key={`total-${col.dateStr}`}
                      className={`py-2 px-1 text-center border-r border-slate-800 text-xs ${
                        isLow ? 'bg-rose-950/80 text-rose-300' : ''
                      }`}
                    >
                      <div className={`font-black ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {dayTotal.mastersOnDuty}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {dayTotal.totalPlannedHours}ч
                      </div>
                    </td>
                  );
                })}

                <td className="py-3 px-3 text-center bg-slate-900 text-xs font-black text-amber-400">
                  {dateColumns.reduce((acc, c) => acc + getDailyTotals(c.dateStr).mastersOnDuty, 0)} смен
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend & Help Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-bold">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Обозначения в табеле:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {SHIFT_TYPES.map(type => (
            <div key={type.id} className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black border ${type.bgClass} ${type.borderClass} ${type.textClass}`}>
                {type.shortLabel}
              </span>
              <span className="text-slate-600 text-[11px] font-medium">{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Context Popover for Cell Selection */}
      {activeCell && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            left: `${activeCell.x}px`,
            top: `${activeCell.y}px`,
            zIndex: 60
          }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-3.5 w-64 animate-in fade-in zoom-in-95 duration-150 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="min-w-0">
              <div className="font-black text-xs text-slate-900 truncate">{activeCell.employeeName}</div>
              <div className="text-[10px] text-slate-400 font-bold">{activeCell.formattedDate}</div>
            </div>
            <button
              onClick={() => setActiveCell(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {SHIFT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => handleSetCellShift(activeCell.employeeId, activeCell.date, type.id)}
                  className={`w-full p-2 rounded-2xl flex items-center justify-between text-left text-xs font-bold transition-all cursor-pointer ${type.bgClass} ${type.textClass}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{type.label}</span>
                  </div>
                  <span className="text-[10px] opacity-75 font-mono">{type.shortLabel}</span>
                </button>
              );
            })}

            <button
              onClick={() => handleSetCellShift(activeCell.employeeId, activeCell.date, 'clear')}
              className="w-full p-2 rounded-2xl flex items-center justify-center gap-1 text-center text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer mt-1"
            >
              <X className="w-3.5 h-3.5" /> Очистить ячейку
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
