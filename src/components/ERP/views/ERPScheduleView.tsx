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
  Palmtree,
  Trash2
} from 'lucide-react';
import { ERPEmployee, WorkShift, ShiftCellType, EmployeeScheduleEntry, ERPCompanySettings } from '../types';

interface ERPScheduleViewProps {
  employees: ERPEmployee[];
  shifts?: WorkShift[];
  onAddShift?: (shift: Partial<WorkShift>) => void;
  onUpdateSchedule?: (entries: Record<string, EmployeeScheduleEntry>) => void;
  entries?: Record<string, EmployeeScheduleEntry>;
  companyId?: string;
  companyName?: string;
  currentUser?: ERPEmployee | null;
  isUserForeman?: boolean;
  settings?: ERPCompanySettings;
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
  companyId,
  companyName = 'Мебельное производство',
  currentUser,
  isUserForeman = true,
  settings
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

  // Print Configuration Modal State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printPeriod, setPrintPeriod] = useState<'current_view' | 'week' | 'two_weeks' | 'month'>('current_view');
  const [printDepartment, setPrintDepartment] = useState<string>('all');
  const [printIncludeSummary, setPrintIncludeSummary] = useState<boolean>(true);
  const [printIncludeSignatures, setPrintIncludeSignatures] = useState<boolean>(true);

  const canSelfEdit = isUserForeman || settings?.scheduleCanSelfEdit !== false;
  const showOtherEmployees = isUserForeman || settings?.scheduleShowOtherEmployees !== false;

  const [activeTab, setActiveTab] = useState<'grid' | 'stats'>('grid');
  const [shiftLogs, setShiftLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [selectedEmployeeForStats, setSelectedEmployeeForStats] = useState<ERPEmployee | null>(null);

  // Manual shift log entry state
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualHours, setManualHours] = useState<number>(12);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

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

  const getEmployeeActualHoursAndLogs = (empId: string, yearMonth: string) => {
    const logs = shiftLogs.filter(log => {
      if (log.employeeId !== empId) return false;
      return log.date && log.date.startsWith(yearMonth);
    });

    const totalSeconds = logs.reduce((sum, log) => sum + (log.elapsedSeconds || 0), 0);
    const totalHours = Number((totalSeconds / 3600).toFixed(1));

    return { logs, totalHours, totalSeconds };
  };

  const fetchShiftLogs = async () => {
    if (!companyId) return;
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/erp/${companyId}/shift-logs`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setShiftLogs(data.logs);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch shift logs:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats' || companyId) {
      fetchShiftLogs();
    }
  }, [activeTab, companyId]);

  const handleAddManualShift = async (empId: string) => {
    if (!companyId || !empId) return;
    setIsSubmittingManual(true);
    try {
      const res = await fetch(`/api/erp/${companyId}/shift-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: empId,
          elapsedSeconds: manualHours * 3600,
          date: manualDate,
          endedAt: `${manualDate}T18:00:00.000Z`
        })
      });
      if (res.ok) {
        await fetchShiftLogs();
        setManualDate(new Date().toISOString().split('T')[0]);
        setManualHours(12);
      }
    } catch (e) {
      console.warn("Error adding manual shift:", e);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleDeleteShiftLog = async (logId: string) => {
    if (!companyId) return;
    if (!window.confirm("Вы уверены, что хотите удалить эту запись о смене?")) return;
    try {
      const res = await fetch(`/api/erp/${companyId}/shift-logs/${logId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchShiftLogs();
      }
    } catch (e) {
      console.warn("Error deleting shift log:", e);
    }
  };

  const monthOptions = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${y}-${m}`;
      const monthsRu = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ];
      list.push({
        value: val,
        label: `${monthsRu[d.getMonth()]} ${y}`
      });
    }
    return list;
  }, []);
  
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

  // Filter for production employees (excluding outsource personnel who do not work shift schedules)
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (e.isProductionEmployee === false || e.employmentType === 'outsource') return false;
      if (e.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com' || (e as any).isSuperAdmin || e.role === 'superadmin' || e.productionRole === 'superadmin') {
        return false;
      }
      if (!showOtherEmployees && currentUser?.id && e.id !== currentUser.id) {
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
  }, [employees, selectedDepartment, searchQuery, showOtherEmployees, currentUser]);

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

  // Compute print dates based on printPeriod selection in modal
  const printDates = useMemo(() => {
    const dates: { dateStr: string; dateObj: Date; dayNum: number; dayOfWeek: string; isWeekend: boolean }[] = [];
    const baseDate = new Date(currentDateOffset);
    baseDate.setHours(0, 0, 0, 0);
    const daysOfWeekRu = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

    let numDays = 7;
    if (printPeriod === 'current_view') {
      return dateColumns.map(d => ({
        dateStr: d.dateStr,
        dateObj: d.dateObj,
        dayNum: d.dayNum,
        dayOfWeek: d.dayOfWeek,
        isWeekend: d.isWeekend
      }));
    } else if (printPeriod === 'week') {
      numDays = 7;
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      baseDate.setDate(diff);
    } else if (printPeriod === 'two_weeks') {
      numDays = 14;
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      baseDate.setDate(diff);
    } else if (printPeriod === 'month') {
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
        isWeekend: dayOfWeekIdx === 0 || dayOfWeekIdx === 6
      });
    }

    return dates;
  }, [printPeriod, currentDateOffset, dateColumns]);

  const printEmployeesList = useMemo(() => {
    return employees.filter(e => {
      if (e.isProductionEmployee === false || e.employmentType === 'outsource') return false;
      if (e.email?.toLowerCase() === 'lk.ivanbobkin@gmail.com' || (e as any).isSuperAdmin || e.role === 'superadmin' || e.productionRole === 'superadmin') {
        return false;
      }
      if (!showOtherEmployees && currentUser?.id && e.id !== currentUser.id) {
        return false;
      }
      if (printDepartment !== 'all' && e.department !== printDepartment) {
        return false;
      }
      return true;
    });
  }, [employees, printDepartment, showOtherEmployees, currentUser]);

  const printPeriodHeader = useMemo(() => {
    if (printDates.length === 0) return '';
    const first = printDates[0].dateObj;
    const last = printDates[printDates.length - 1].dateObj;
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    if (printPeriod === 'month' || (first.getDate() === 1 && last.getDate() >= 28)) {
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
  }, [printDates, printPeriod]);

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
    if (!canSelfEdit && (!currentUser?.id || emp.id !== currentUser.id)) {
      return;
    }
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
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 pb-px gap-2">
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer ${
            activeTab === 'grid' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Планирование смен (Табель)</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer ${
            activeTab === 'stats' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Учет часов, нормы и статистика</span>
        </button>
      </div>

      {activeTab === 'grid' ? (
        <>
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
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-blue-200/60"
                title="Печать графика на лист А4"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span>Печать А4</span>
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
    </>
  ) : (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Stats Header / Control Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" /> Аналитика выработки часов и соблюдение норм
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Статистика смен и фактический учет
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Сравнение запланированного по графику времени с фактически отработанными часами по хитбитам сотрудников
          </p>
        </div>

        {/* Month selector dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black text-slate-700">Выберите период:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer animate-none"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick summary metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {filteredEmployees.reduce((acc, emp) => {
                const { totalHours } = getEmployeeActualHoursAndLogs(emp.id, selectedMonth);
                return acc + totalHours;
              }, 0).toFixed(1)}ч
            </div>
            <div className="text-[11px] font-semibold text-slate-500">Фактически отработано цехом за период</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {filteredEmployees.reduce((acc, emp) => {
                return acc + getEmployeePlannedHours(emp.id, selectedMonth);
              }, 0)}ч
            </div>
            <div className="text-[11px] font-semibold text-slate-500">Запланировано часов по графику</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {shiftLogs.filter(l => l.date && l.date.startsWith(selectedMonth)).length} смен
            </div>
            <div className="text-[11px] font-semibold text-slate-500">Всего закрытых смен сотрудников</div>
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
            placeholder="Поиск сотрудника..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Employees stats list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEmployees.length === 0 ? (
          <div className="lg:col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-200/80">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-700">Сотрудники не найдены</div>
            <div className="text-xs text-slate-400 mt-1">Измените параметры фильтрации или поисковый запрос</div>
          </div>
        ) : (
          filteredEmployees.map(emp => {
            const planned = getEmployeePlannedHours(emp.id, selectedMonth);
            const { logs, totalHours } = getEmployeeActualHoursAndLogs(emp.id, selectedMonth);
            const percent = planned > 0 ? Math.min(100, Math.round((totalHours / planned) * 100)) : (totalHours > 0 ? 100 : 0);
            
            let barColor = 'bg-rose-500';
            let textColor = 'text-rose-700';
            let bgColor = 'bg-rose-50';
            if (percent >= 90) {
              barColor = 'bg-emerald-500';
              textColor = 'text-emerald-700';
              bgColor = 'bg-emerald-50';
            } else if (percent >= 70) {
              barColor = 'bg-amber-500';
              textColor = 'text-amber-700';
              bgColor = 'bg-amber-50';
            }

            const diff = Number((totalHours - planned).toFixed(1));

            return (
              <div key={emp.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                      {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                      <div className="text-xs text-slate-500 font-medium">
                        {emp.role || emp.productionRole || 'Мастер'} • {departmentsList.find(d => d.id === emp.department)?.name.split(' ')[0] || 'Цех'}
                      </div>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1.5 rounded-xl font-black text-xs ${bgColor} ${textColor} flex items-center gap-1 shrink-0`}>
                    {percent}% нормы
                  </div>
                </div>

                {/* Progress tracking */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Выработка нормы часов:</span>
                    <span className="font-mono font-bold">
                      {totalHours}ч / {planned}ч
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
                  <div>
                    <div className="text-slate-400 font-semibold text-[10px]">Отработано смен</div>
                    <div className="font-mono font-black text-slate-800 mt-0.5">{logs.length} смен</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-semibold text-[10px]">Баланс нормы</div>
                    <div className={`font-mono font-black mt-0.5 ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {diff >= 0 ? `+${diff}` : diff} ч
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedEmployeeForStats(emp);
                    setManualDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>История смен и корректировка</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  )}

  {/* Shift History & Manual Adjustments Modal */}
  {selectedEmployeeForStats && (() => {
    const emp = selectedEmployeeForStats;
    const { logs, totalHours } = getEmployeeActualHoursAndLogs(emp.id, selectedMonth);
    const planned = getEmployeePlannedHours(emp.id, selectedMonth);
    
    return (
      <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">{emp.name}</h3>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Смены и учет времени • {monthOptions.find(o => o.value === selectedMonth)?.label}
              </p>
            </div>
            <button
              onClick={() => setSelectedEmployeeForStats(null)}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Statistics Overview Card */}
            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">План по графику</div>
                <div className="text-lg font-mono font-black text-slate-800 mt-1">{planned}ч</div>
              </div>
              <div className="text-center border-x border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Отработано факт</div>
                <div className="text-lg font-mono font-black text-indigo-600 mt-1">{totalHours}ч</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Всего смен</div>
                <div className="text-lg font-mono font-black text-emerald-600 mt-1">{logs.length}</div>
              </div>
            </div>

            {/* Manual Add Form */}
            <div className="bg-indigo-50/50 p-4.5 rounded-3xl border border-indigo-100/85 space-y-3">
              <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600 shrink-0" /> Добавить или скорректировать смену вручную
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Дата смены</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Отработано часов</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={manualHours}
                    onChange={(e) => setManualHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <button
                    onClick={() => handleAddManualShift(emp.id)}
                    disabled={isSubmittingManual}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingManual ? 'Добавление...' : 'Записать смену'}
                  </button>
                </div>
              </div>
            </div>

            {/* Shift logs list */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">История отметок смен за месяц</h4>
              {logs.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">Записей о сменах в этом месяце нет</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {logs.map((log: any) => {
                    const shiftHours = Number((log.elapsedSeconds / 3600).toFixed(1));
                    const formattedDate = new Date(log.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });

                    // Check planned hours for this day in the schedule grid
                    const schedKey = `${emp.id}_${log.date}`;
                    const daySched = scheduleEntries[schedKey];
                    const plannedHoursForDay = daySched?.hours || 0;

                    // Match or mismatch status
                    const isMatch = plannedHoursForDay > 0 && Math.abs(shiftHours - plannedHoursForDay) <= 1;

                    return (
                      <div key={log.id} className="py-3 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0">
                        <div>
                          <div className="text-xs font-bold text-slate-950">{formattedDate}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-slate-500">
                              Факт: <strong className="text-indigo-600">{shiftHours}ч</strong>
                            </span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              План: <strong>{plannedHoursForDay}ч</strong>
                            </span>
                            {log.isManual && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md">
                                Корректировка
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {plannedHoursForDay === 0 ? (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-xl">
                              Вне графика
                            </span>
                          ) : isMatch ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-xl flex items-center gap-1">
                              <Check className="w-3 h-3" /> Соответствует
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-xl">
                              Несоответствие ({shiftHours < plannedHoursForDay ? `-${(plannedHoursForDay - shiftHours).toFixed(1)}ч` : `+${(shiftHours - plannedHoursForDay).toFixed(1)}ч`})
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteShiftLog(log.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Удалить запись"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setSelectedEmployeeForStats(null)}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  })()}

      {/* Print Configuration & Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Печать графика работы (Лист А4 Альбомная)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Настройте период и параметры перед выводом на печать или сохранением в PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="p-5 space-y-4 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Period Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Период для печати
                  </label>
                  <select
                    value={printPeriod}
                    onChange={(e) => setPrintPeriod(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="current_view">Текущий вид ({viewMode === 'week' ? '1 неделя' : viewMode === 'two_weeks' ? '2 недели' : 'Месяц'})</option>
                    <option value="week">1 неделя (7 дней)</option>
                    <option value="two_weeks">2 недели (14 дней)</option>
                    <option value="month">Календарный месяц (1–31 число)</option>
                  </select>
                </div>

                {/* 2. Department Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Участок производства
                  </label>
                  <select
                    value={printDepartment}
                    onChange={(e) => setPrintDepartment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Toggles */}
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={printIncludeSummary}
                      onChange={(e) => setPrintIncludeSummary(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Итоги по сменам внизу</span>
                  </label>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={printIncludeSignatures}
                      onChange={(e) => setPrintIncludeSignatures(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Блок утверждения и подписей</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-5 flex-1 overflow-y-auto bg-slate-200/50">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>Предварительный просмотр документа:</span>
                <span className="text-blue-600 font-mono">Формат: А4 Альбомная ({printDates.length} дней, {printEmployeesList.length} сотр.)</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-md font-sans text-slate-900 overflow-x-auto text-[11px]">
                {/* Print Sheet Header */}
                <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {companyName}
                    </div>
                    <div className="text-sm font-black uppercase text-slate-900 tracking-tight">
                      График сменности и табель выходов сотрудников
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      Участок: <span className="font-bold text-slate-900">{departmentsList.find(d => d.id === printDepartment)?.name || 'Все участки'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-300 inline-block">
                      {printPeriodHeader}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Сформировано: {new Date().toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>

                {/* Table Preview */}
                <table className="w-full border-collapse border border-slate-800 text-[10px] text-center">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold">
                      <th className="border border-slate-700 p-1 w-6">№</th>
                      <th className="border border-slate-700 p-1 text-left min-w-[130px]">Сотрудник / Должность</th>
                      {printDates.map(d => (
                        <th key={d.dateStr} className={`border border-slate-700 p-1 ${d.isWeekend ? 'bg-slate-200 font-black' : ''}`}>
                          <div>{d.dayNum}</div>
                          <div className="text-[8px] font-normal text-slate-600">{d.dayOfWeek}</div>
                        </th>
                      ))}
                      <th className="border border-slate-700 p-1 w-10 font-black">Смен</th>
                      <th className="border border-slate-700 p-1 w-12 font-black">Часов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printEmployeesList.map((emp, idx) => {
                      let empShifts = 0;
                      let empHours = 0;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="border border-slate-700 p-1 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="border border-slate-700 p-1 text-left font-bold text-slate-900 whitespace-nowrap">
                            <div>{emp.name}</div>
                            <div className="text-[8px] font-normal text-slate-500">{emp.productionRole || emp.role || 'Мастер'}</div>
                          </td>
                          {printDates.map(d => {
                            const entry = getCellEntry(emp, d.dateStr);
                            let label = '—';
                            let bg = d.isWeekend ? 'bg-slate-100' : '';
                            let textCol = 'text-slate-400';

                            if (entry) {
                              if (entry.type === 'work_12') {
                                label = '12';
                                bg = 'bg-emerald-50';
                                textCol = 'text-emerald-900 font-black';
                                empShifts++;
                                empHours += entry.hours || 12;
                              } else if (entry.type === 'work_8') {
                                label = '8';
                                bg = 'bg-blue-50';
                                textCol = 'text-blue-900 font-black';
                                empShifts++;
                                empHours += entry.hours || 8;
                              } else if (entry.type === 'night_12') {
                                label = 'Н12';
                                bg = 'bg-purple-50';
                                textCol = 'text-purple-900 font-black';
                                empShifts++;
                                empHours += entry.hours || 12;
                              } else if (entry.type === 'day_off') {
                                label = 'В';
                                textCol = 'text-slate-400';
                              } else if (entry.type === 'vacation') {
                                label = 'ОТП';
                                bg = 'bg-amber-50';
                                textCol = 'text-amber-900 font-bold';
                              } else if (entry.type === 'sick') {
                                label = 'Б';
                                bg = 'bg-rose-50';
                                textCol = 'text-rose-900 font-bold';
                              }
                            }

                            return (
                              <td key={d.dateStr} className={`border border-slate-700 p-1 ${bg} ${textCol}`}>
                                {label}
                              </td>
                            );
                          })}
                          <td className="border border-slate-700 p-1 font-black text-slate-900">{empShifts}</td>
                          <td className="border border-slate-700 p-1 font-black text-blue-900">{empHours}</td>
                        </tr>
                      );
                    })}

                    {/* Summary Row */}
                    {printIncludeSummary && (
                      <tr className="bg-slate-100 font-bold text-slate-900">
                        <td colSpan={2} className="border border-slate-700 p-1 text-left font-black">
                          На смене (чел):
                        </td>
                        {printDates.map(d => {
                          const onDuty = printEmployeesList.filter(emp => {
                            const entry = getCellEntry(emp, d.dateStr);
                            return entry && (entry.type === 'work_12' || entry.type === 'work_8' || entry.type === 'night_12');
                          }).length;
                          return (
                            <td key={d.dateStr} className="border border-slate-700 p-1 font-black">
                              {onDuty || '—'}
                            </td>
                          );
                        })}
                        <td className="border border-slate-700 p-1 font-black">—</td>
                        <td className="border border-slate-700 p-1 font-black">—</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Signatures */}
                {printIncludeSignatures && (
                  <div className="mt-4 pt-3 border-t border-slate-400 grid grid-cols-2 gap-8 text-[9px] text-slate-700">
                    <div>
                      <div>Начальник производства: __________________ / __________________ /</div>
                    </div>
                    <div className="text-right">
                      <div>Утвердил (Руководитель): __________________ / __________________ /</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                💡 Для печати выберите в диалоге браузера ориентацию <span className="font-bold text-slate-800">«Альбомная» (Landscape)</span>.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Распечатать / Сохранить в PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PRINT CONTAINER (Active only during window.print()) */}
      <div id="erp-printable-schedule" className="hidden">
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '0px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: '#444' }}>
                {companyName}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '900', textTransform: 'uppercase' }}>
                ГРАФИК СМЕННОСТИ И ТАБЕЛЬ ВЫХОДОВ СОТРУДНИКОВ
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                Подразделение: <b>{departmentsList.find(d => d.id === printDepartment)?.name || 'Все участки цеха'}</b>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', border: '1px solid #000', padding: '2px 8px', display: 'inline-block' }}>
                Период: {printPeriodHeader}
              </div>
              <div style={{ fontSize: '9px', color: '#666', marginTop: '3px' }}>
                Дата печати: {new Date().toLocaleDateString('ru-RU')}
              </div>
            </div>
          </div>

          {/* Printable Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: printDates.length > 14 ? '8pt' : '9pt', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                <th style={{ border: '1px solid #000', padding: '3px', width: '22px' }}>№</th>
                <th style={{ border: '1px solid #000', padding: '3px', textAlign: 'left', minWidth: '130px' }}>ФИО Сотрудника</th>
                {printDates.map(d => (
                  <th key={d.dateStr} style={{ border: '1px solid #000', padding: '2px', backgroundColor: d.isWeekend ? '#e2e8f0' : '#f8fafc' }}>
                    <div>{d.dayNum}</div>
                    <div style={{ fontSize: '7pt', fontWeight: 'normal', color: '#475569' }}>{d.dayOfWeek}</div>
                  </th>
                ))}
                <th style={{ border: '1px solid #000', padding: '3px', width: '32px', fontWeight: 'bold' }}>Смен</th>
                <th style={{ border: '1px solid #000', padding: '3px', width: '38px', fontWeight: 'bold' }}>Часов</th>
              </tr>
            </thead>
            <tbody>
              {printEmployeesList.map((emp, idx) => {
                let shiftsCount = 0;
                let hoursCount = 0;

                return (
                  <tr key={emp.id}>
                    <td style={{ border: '1px solid #000', padding: '2px', color: '#666' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {emp.name}
                      <span style={{ fontSize: '7pt', fontWeight: 'normal', color: '#666', display: 'block' }}>
                        {emp.productionRole || emp.role || 'Мастер'}
                      </span>
                    </td>
                    {printDates.map(d => {
                      const entry = getCellEntry(emp, d.dateStr);
                      let text = '';
                      let bg = d.isWeekend ? '#f1f5f9' : '#fff';
                      let fw = 'normal';

                      if (entry) {
                        if (entry.type === 'work_12') {
                          text = '12';
                          fw = 'bold';
                          shiftsCount++;
                          hoursCount += entry.hours || 12;
                        } else if (entry.type === 'work_8') {
                          text = '8';
                          fw = 'bold';
                          shiftsCount++;
                          hoursCount += entry.hours || 8;
                        } else if (entry.type === 'night_12') {
                          text = 'Н12';
                          fw = 'bold';
                          shiftsCount++;
                          hoursCount += entry.hours || 12;
                        } else if (entry.type === 'day_off') {
                          text = 'В';
                        } else if (entry.type === 'vacation') {
                          text = 'ОТП';
                          fw = 'bold';
                        } else if (entry.type === 'sick') {
                          text = 'Б';
                          fw = 'bold';
                        }
                      }

                      return (
                        <td key={d.dateStr} style={{ border: '1px solid #000', padding: '2px', backgroundColor: bg, fontWeight: fw }}>
                          {text}
                        </td>
                      );
                    })}
                    <td style={{ border: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>{shiftsCount}</td>
                    <td style={{ border: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>{hoursCount}</td>
                  </tr>
                );
              })}

              {/* Summary Rows */}
              {printIncludeSummary && (
                <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: '3px', textAlign: 'left' }}>
                    Человек на смене:
                  </td>
                  {printDates.map(d => {
                    const onDuty = printEmployeesList.filter(emp => {
                      const entry = getCellEntry(emp, d.dateStr);
                      return entry && (entry.type === 'work_12' || entry.type === 'work_8' || entry.type === 'night_12');
                    }).length;
                    return (
                      <td key={d.dateStr} style={{ border: '1px solid #000', padding: '2px', fontWeight: 'bold' }}>
                        {onDuty || ''}
                      </td>
                    );
                  })}
                  <td style={{ border: '1px solid #000', padding: '2px' }}>—</td>
                  <td style={{ border: '1px solid #000', padding: '2px' }}>—</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Signatures */}
          {printIncludeSignatures && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#000' }}>
              <div>
                Начальник производства: ________________________ / ________________________ /
              </div>
              <div>
                Утвердил: Генеральный директор: ________________________ / ________________________ /
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm 6mm 8mm;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #erp-printable-schedule, #erp-printable-schedule * {
            visibility: visible !important;
          }
          #erp-printable-schedule {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
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
