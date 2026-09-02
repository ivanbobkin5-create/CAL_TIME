import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Factory, 
  Layers,
  Scissors,
  Wrench,
  Check,
  Upload,
  FileText,
  Play,
  CalendarDays,
  Plus,
  ChevronDown,
  ChevronUp,
  Box,
  Settings,
  X,
  ArrowRight,
  ExternalLink,
  PackageCheck,
  Package,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Move,
  Sparkles,
  RotateCcw,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Undo2
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPEmployee, ERPCompanySettings, AdditionalWorks } from '../types';
import { formatDeadlineDate, cleanOrderNumber, extractBitrixDealId, getBitrixDealUrl, isStageTaskStarted, getSmartOrderDisplay } from '../utils';
import { parseBirkaFile, consolidateDetails } from '../utils/birkaParser';
import { parseHardwareFile } from '../utils/hardwareParser';
import { getScannedPartIdsForStage, getScannedCountForDetail, detailRequiresPrisadka } from '../utils/stageReadiness';
import { HardwareSpecificationModal } from '../components/HardwareSpecificationModal';
import { AssemblyFileModal } from '../components/AssemblyFileModal';

interface ERPPlanningViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  settings?: ERPCompanySettings;
  onUpdateOrder: (order: ProductionOrder) => void;
  onSelectOrder: (order: ProductionOrder) => void;
}

export const ERPPlanningView: React.FC<ERPPlanningViewProps> = ({
  orders,
  employees,
  settings,
  onUpdateOrder,
  onSelectOrder
}) => {
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'queue' | 'ready' | 'all' | 'deleted'>('queue');
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);
  const [expandedWorksOrderId, setExpandedWorksOrderId] = useState<string | null>(null);
  
  // Modals state
  const [viewingBirkaModalOrder, setViewingBirkaModalOrder] = useState<ProductionOrder | null>(null);
  const [viewingHardwareModalOrder, setViewingHardwareModalOrder] = useState<ProductionOrder | null>(null);
  const [viewingAssemblyModalOrder, setViewingAssemblyModalOrder] = useState<ProductionOrder | null>(null);
  const [launchedModalOrder, setLaunchedModalOrder] = useState<{ order: ProductionOrder; plannedDate: string } | null>(null);
  const [birkaSearchQuery, setBirkaSearchQuery] = useState('');
  const [hardwareSearchQuery, setHardwareSearchQuery] = useState('');

  // Planning view mode tab
  const [planningViewTab, setPlanningViewTab] = useState<'calendar' | 'list'>('calendar');

  // Time horizon range for calendar: '1week' (7 days), '2weeks' (14 days)
  const [periodRange, setPeriodRange] = useState<'1week' | '2weeks'>('1week');

  // Grid layout mode: 'stages' (участки слева) or 'orders' (заказы слева)
  const [gridRowsMode, setGridRowsMode] = useState<'stages' | 'orders'>('stages');

  // Collapsible queue drawer state
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(true);

  // Expanded orders in Queue drawer and in Orders grid mode
  const [expandedOrdersMap, setExpandedOrdersMap] = useState<Record<string, boolean>>({});

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrdersMap(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Drag and drop task state
  const [draggedStageTask, setDraggedStageTask] = useState<{ orderId: string; stageId: ProductionStageId } | null>(null);

  // Modal confirmation for moving an already started stage task
  const [moveStartedTaskConfirmation, setMoveStartedTaskConfirmation] = useState<{
    orderId: string;
    stageId: ProductionStageId;
    targetDateStr: string | null;
    currentDateStr: string | null;
    stageName: string;
    orderTitle: string;
    orderNumber: string;
  } | null>(null);

  // Capacity overload warning alert banner
  const [capacityWarningAlert, setCapacityWarningAlert] = useState<{
    text: string;
    stageName: string;
    dateStr: string;
    orderTitle?: string;
  } | null>(null);

  // Start date calculation
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const timelineDays = useMemo(() => {
    const dayNamesShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const numDays = periodRange === '2weeks' ? 14 : 7;

    const todayStr = new Date().toISOString().split('T')[0];
    const res = [];

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayOfWeek = d.getDay();
      const isToday = dateStr === todayStr;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      res.push({
        dateObj: d,
        dateStr,
        dayName: dayNamesShort[dayOfWeek],
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString('ru-RU', { month: 'short' }),
        isToday,
        isWeekend
      });
    }
    return res;
  }, [startDate, periodRange]);

  const handlePrevPeriod = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - (periodRange === '2weeks' ? 14 : 7));
    setStartDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + (periodRange === '2weeks' ? 14 : 7));
    setStartDate(newDate);
  };

  const handleTodayPeriod = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setStartDate(monday);
  };

  const ALL_POSSIBLE_STAGE_CONFIGS: { id: ProductionStageId; name: string; shortName: string; icon: any; color: string; bg: string }[] = [
    { id: 'cutting', name: 'Распил', shortName: 'Распил', icon: Scissors, color: 'text-blue-600', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'edging', name: 'Кромка', shortName: 'Кромка', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'cnc', name: 'Присадка', shortName: 'Присадка', icon: Factory, color: 'text-purple-600', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'facades', name: 'Фасады', shortName: 'Фасады', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'assembly', name: 'Сборка', shortName: 'Сборка', icon: Wrench, color: 'text-teal-600', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'kitting', name: 'Комплектовка', shortName: 'Комплектовка', icon: Box, color: 'text-cyan-600', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { id: 'qc', name: 'ОТК', shortName: 'ОТК', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'packing', name: 'Упаковка', shortName: 'Упаковка', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  ];

  // Dynamic active production stages list honoring company settings
  const enabledStagesList = useMemo<ProductionStageId[]>(() => {
    if (settings?.enabledStages && settings.enabledStages.length > 0) {
      return settings.enabledStages.filter(s => s !== 'queue' && s !== 'ready' && s !== 'shipping');
    }
    // Default standard production route if not specified
    return ['cutting', 'edging', 'cnc', 'kitting', 'packing'];
  }, [settings?.enabledStages]);

  const STAGE_CONFIGS = useMemo(() => {
    // Preserve custom order if user arranged stages in settings
    const ordered: typeof ALL_POSSIBLE_STAGE_CONFIGS = [];
    enabledStagesList.forEach(stId => {
      const found = ALL_POSSIBLE_STAGE_CONFIGS.find(cfg => cfg.id === stId);
      if (found) {
        ordered.push(found);
      }
    });
    return ordered.length > 0 ? ordered : ALL_POSSIBLE_STAGE_CONFIGS.filter(cfg => cfg.id !== 'assembly');
  }, [enabledStagesList]);

  const REQUIRED_STAGES = useMemo(() => {
    return STAGE_CONFIGS.map(st => st.id);
  }, [STAGE_CONFIGS]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Helper to determine the effective planned date of a stage on an order
  // If no manual date was assigned by foreman, but order is currently active at this stage in shop
  // or worker started packing/kitting/scanning, it automatically belongs to TODAY's date in planning!
  const getStageAssignedDate = (order: ProductionOrder, stageId: ProductionStageId): string | null => {
    const dates = order.stagePlannedDates || {};
    if (dates[stageId]) return dates[stageId];
    if (stageId === 'cutting' && order.plannedCuttingDate) return order.plannedCuttingDate;
    
    // Auto-surface active in-progress stages to today's planning schedule
    if (
      order.status !== 'completed' && 
      order.status !== 'shipped' && 
      !order.isDeleted
    ) {
      if (order.currentStage === stageId) {
        return todayStr;
      }

      // Kitting: if any box exists with hardware or hardware items were packed or kitting work log started
      if (stageId === 'kitting') {
        const hasKittingPkgs = (order.packages || []).some(p => p.type === 'kitting' || ((p.hardwareItems || []).length > 0));
        const hasHardwarePacked = (order.hardwareData?.items || []).some(h => (h.packedQuantity || 0) > 0);
        const hasKittingLogs = order.workLogs?.some(l => l.stageId === 'kitting');
        if (hasKittingPkgs || hasHardwarePacked || hasKittingLogs) {
          return todayStr;
        }
      }

      // Packing: if any detail package exists or packing work log started
      if (stageId === 'packing') {
        const hasPackingPkgs = (order.packages || []).some(p => p.type === 'details' || ((p.parts || []).length > 0));
        const hasPackingLogs = order.workLogs?.some(l => l.stageId === 'packing');
        if (hasPackingPkgs || hasPackingLogs) {
          return todayStr;
        }
      }

      // Physical processing stages: if any parts have been scanned on this stage
      const scannedSet = getScannedPartIdsForStage(order, stageId);
      if (scannedSet.size > 0) {
        return todayStr;
      }

      // Any active work log on this stage
      if (order.workLogs?.some(l => (l.stageId === stageId || (stageId === 'cnc' && (l.stageId as string) === 'prisadka')) && l.status === 'in_progress')) {
        return todayStr;
      }
    }
    return null;
  };

  const getStageCompletionStatus = (
    order: ProductionOrder,
    stageId: ProductionStageId
  ): { isDone: boolean; isWorkingNow: boolean; scannedCount: number; totalCount: number } => {
    if (!order) return { isDone: false, isWorkingNow: false, scannedCount: 0, totalCount: 0 };

    if (order.status === 'completed' || order.status === 'shipped') {
      return { isDone: true, isWorkingNow: false, scannedCount: 0, totalCount: 0 };
    }

    // 1. Check if forced completion exists
    const forced = order.forcedStageCompletions?.[stageId] ||
      (stageId === 'cnc' ? order.forcedStageCompletions?.['prisadka'] : undefined) ||
      (stageId === 'cutting' ? order.forcedStageCompletions?.['raskroy'] : undefined) ||
      (stageId === 'edging' ? order.forcedStageCompletions?.['kromka'] : undefined);
    if (forced) {
      return { isDone: true, isWorkingNow: false, scannedCount: 0, totalCount: 0 };
    }

    // 2. Work logs completed
    if (order.workLogs?.some(l => (l.stageId === stageId || (stageId === 'cnc' && (l.stageId as string) === 'prisadka')) && l.status === 'completed')) {
      return { isDone: true, isWorkingNow: false, scannedCount: 0, totalCount: 0 };
    }

    // 3. Kitting completion check
    if (stageId === 'kitting') {
      const hardwareItems = order.hardwareData?.items || [];
      const totalHwRequired = hardwareItems.reduce((sum, h) => sum + (h.quantity || 1), 0);
      const totalHwPacked = hardwareItems.reduce((sum, h) => sum + (h.packedQuantity || 0), 0);
      const kittingPackages = (order.packages || []).filter(p => p.type === 'kitting' || ((p.hardwareItems || []).length > 0));

      if (totalHwRequired > 0 && totalHwPacked >= totalHwRequired) {
        return { isDone: true, isWorkingNow: false, scannedCount: totalHwPacked, totalCount: totalHwRequired };
      }
      if (order.stageProgress?.kitting?.status === 'done' && order.currentStage !== 'kitting') {
        return { isDone: true, isWorkingNow: false, scannedCount: totalHwPacked, totalCount: totalHwRequired || 1 };
      }
      const isWorkingNow = (order.currentStage === 'kitting' && order.status === 'in_progress') || kittingPackages.length > 0 || totalHwPacked > 0;
      return { isDone: false, isWorkingNow, scannedCount: totalHwPacked, totalCount: totalHwRequired };
    }

    // 4. Scan progress check for physical processing stages
    const raw = order.birkaData?.details || [];
    const details = consolidateDetails(raw as any);

    if (details.length > 0 && (stageId === 'cutting' || stageId === 'edging' || stageId === 'cnc' || stageId === 'assembly')) {
      const relevant = stageId === 'edging'
        ? details.filter(d => !!(d.edgeL1 || d.edgeL2 || d.edgeW1 || d.edgeW2))
        : stageId === 'cnc'
        ? details.filter(d => detailRequiresPrisadka(d, settings))
        : details;

      const totalCount = relevant.reduce((sum, d) => sum + Math.max(1, d.quantity || 1), 0);
      const scannedSet = getScannedPartIdsForStage(order, stageId);
      const scannedList = Array.from(scannedSet);

      let scannedCount = 0;
      for (const d of relevant) {
        const c = getScannedCountForDetail(scannedList, d.id);
        scannedCount += Math.min(c, Math.max(1, d.quantity || 1));
      }

      if (totalCount > 0) {
        if (scannedCount >= totalCount) {
          return { isDone: true, isWorkingNow: false, scannedCount, totalCount };
        }
        const isWorkingNow = (order.currentStage === stageId || (stageId === 'cnc' && (order.currentStage as string) === 'prisadka')) && order.status === 'in_progress';
        if (order.stageProgress?.[stageId]?.status === 'done' && order.currentStage !== stageId) {
          return { isDone: true, isWorkingNow: false, scannedCount, totalCount };
        }
        return { isDone: false, isWorkingNow: isWorkingNow || scannedCount > 0, scannedCount, totalCount };
      }
    }

    // 5. Packaging
    if (stageId === 'packing') {
      const totalRequired = details.reduce((sum, d) => sum + Math.max(1, d.quantity || 1), 0);
      const packedCount = (order.packages || []).reduce((sum, p) => sum + (p.parts?.length || 0), 0);
      if (totalRequired > 0 && packedCount >= totalRequired) {
        return { isDone: true, isWorkingNow: false, scannedCount: packedCount, totalCount: totalRequired };
      }
      const isWorkingNow = order.currentStage === 'packing' && order.status === 'in_progress';
      if (order.stageProgress?.packing?.status === 'done' && order.currentStage !== 'packing') {
        return { isDone: true, isWorkingNow: false, scannedCount: packedCount, totalCount: totalRequired };
      }
      return { isDone: false, isWorkingNow: isWorkingNow || packedCount > 0, scannedCount: packedCount, totalCount: totalRequired };
    }

    // 6. Fallback check for other stages
    const isWorkingNow = order.currentStage === stageId && order.status === 'in_progress';
    if (order.stageProgress?.[stageId]?.status === 'done' && !isWorkingNow) {
      return { isDone: true, isWorkingNow: false, scannedCount: 0, totalCount: 0 };
    }

    return { isDone: false, isWorkingNow, scannedCount: 0, totalCount: 0 };
  };

  const isStagePlannedOrDone = (order: ProductionOrder, stId: ProductionStageId): boolean => {
    const { isDone } = getStageCompletionStatus(order, stId);
    if (isDone) return true;
    const assignedDate = getStageAssignedDate(order, stId);
    if (assignedDate) return true;
    return false;
  };

  const isOrderFullyPlanned = (order: ProductionOrder): boolean => {
    return REQUIRED_STAGES.every(stId => isStagePlannedOrDone(order, stId));
  };

  const getUnplannedStagesCount = (order: ProductionOrder): number => {
    return REQUIRED_STAGES.filter(stId => !isStagePlannedOrDone(order, stId)).length;
  };

  // Distinct harmonious colors for each order across the 2-week schedule
  const ORDER_COLOR_PALETTES = [
    { bg: 'bg-sky-100/90', border: 'border-sky-300', text: 'text-sky-950', dot: 'bg-sky-500', bar: '#0284c7' },
    { bg: 'bg-emerald-100/90', border: 'border-emerald-300', text: 'text-emerald-950', dot: 'bg-emerald-500', bar: '#059669' },
    { bg: 'bg-amber-100/90', border: 'border-amber-300', text: 'text-amber-950', dot: 'bg-amber-500', bar: '#d97706' },
    { bg: 'bg-purple-100/90', border: 'border-purple-300', text: 'text-purple-950', dot: 'bg-purple-500', bar: '#9333ea' },
    { bg: 'bg-rose-100/90', border: 'border-rose-300', text: 'text-rose-950', dot: 'bg-rose-500', bar: '#e11d48' },
    { bg: 'bg-teal-100/90', border: 'border-teal-300', text: 'text-teal-950', dot: 'bg-teal-500', bar: '#0d9488' },
    { bg: 'bg-orange-100/90', border: 'border-orange-300', text: 'text-orange-950', dot: 'bg-orange-500', bar: '#ea580c' },
    { bg: 'bg-indigo-100/90', border: 'border-indigo-300', text: 'text-indigo-950', dot: 'bg-indigo-500', bar: '#4f46e5' },
    { bg: 'bg-lime-100/90', border: 'border-lime-300', text: 'text-lime-950', dot: 'bg-lime-500', bar: '#65a30d' },
    { bg: 'bg-fuchsia-100/90', border: 'border-fuchsia-300', text: 'text-fuchsia-950', dot: 'bg-fuchsia-500', bar: '#c026d3' },
    { bg: 'bg-cyan-100/90', border: 'border-cyan-300', text: 'text-cyan-950', dot: 'bg-cyan-500', bar: '#0891b2' },
    { bg: 'bg-violet-100/90', border: 'border-violet-300', text: 'text-violet-950', dot: 'bg-violet-500', bar: '#7c3aed' },
    { bg: 'bg-pink-100/90', border: 'border-pink-300', text: 'text-pink-950', dot: 'bg-pink-500', bar: '#db2777' },
    { bg: 'bg-yellow-100/90', border: 'border-yellow-300', text: 'text-yellow-950', dot: 'bg-yellow-500', bar: '#ca8a04' },
    { bg: 'bg-blue-100/90', border: 'border-blue-300', text: 'text-blue-950', dot: 'bg-blue-500', bar: '#2563eb' },
    { bg: 'bg-red-100/90', border: 'border-red-300', text: 'text-red-950', dot: 'bg-red-500', bar: '#dc2626' },
  ];

  const getOrderColor = (orderId: string) => {
    const orderIdx = orders.findIndex(o => o.id === orderId);
    if (orderIdx >= 0) {
      return ORDER_COLOR_PALETTES[orderIdx % ORDER_COLOR_PALETTES.length];
    }
    let hash = 0;
    for (let i = 0; i < orderId.length; i++) {
      hash = orderId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % ORDER_COLOR_PALETTES.length;
    return ORDER_COLOR_PALETTES[index];
  };

  const getOrderDisplayParts = (order: ProductionOrder) => {
    const smart = getSmartOrderDisplay(order);
    const cleanNum = smart.orderNumber || cleanOrderNumber(order.orderNumber, order.id);

    // Приоритеты: вычищенный клиент -> вычищенный проект -> исходное поле -> birkaData -> comments
    let client = smart.clientName || smart.projectName || (order.clientName || order.projectName || '').trim();

    const isGeneric = (val: string) => {
      const s = (val || '').toLowerCase().trim();
      if (!s || s === 'заказчик' || s === 'клиент' || s === 'заказ' || s === 'проект' || s === 'без названия') return true;
      if (/^(?:сделка|заказ|клиент|проект|deal|order)[\s№#:]*\d+$/i.test(s)) return true;
      if (/^b24_\d+$/i.test(s)) return true;
      if (/^\d+$/.test(s)) return true;
      return false;
    };

    if (isGeneric(client) || client.toLowerCase() === cleanNum.toLowerCase() || client.toLowerCase() === `№${cleanNum.toLowerCase()}`) {
      if (order.projectName && !isGeneric(order.projectName) && order.projectName !== cleanNum) {
        client = order.projectName;
      } else if (order.birkaData?.fileName) {
        const cleanFile = order.birkaData.fileName.replace(/\.(bir|csv|xlsx|xls|txt)$/i, '');
        const parts = cleanFile.split(/[_\-–—]/).filter(Boolean);
        client = parts[0]?.trim() || cleanFile;
      } else if (order.salonName && !isGeneric(order.salonName)) {
        client = order.salonName;
      } else if (order.comments && order.comments.length > 2 && order.comments.length < 50 && !/^(https?:\/\/|b24_)/i.test(order.comments)) {
        client = order.comments;
      } else if (order.bitrixStageName) {
        client = order.bitrixStageName;
      } else {
        client = '';
      }
    }

    if (client && cleanNum) {
      const escaped = cleanNum.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      client = client.replace(new RegExp(`^[№#\\s]*${escaped}[\\s:·\\-_–—/]*`, 'i'), '').trim();
    }

    return {
      orderNumber: cleanNum,
      clientName: client
    };
  };

  const displayOrderTitle = (order: ProductionOrder) => {
    const { orderNumber, clientName } = getOrderDisplayParts(order);
    return clientName ? `№${orderNumber} · ${clientName}` : `№${orderNumber}`;
  };

  // Helper: calculate load created by a single order on a production stage
  const getOrderStageLoad = (order: ProductionOrder, stageId: ProductionStageId) => {
    const m2 = order.totalAreaM2 || 0;
    let sheets = 0;
    if (order.birkaData?.materialGroups && order.birkaData.materialGroups.length > 0) {
      sheets = order.birkaData.materialGroups.reduce((acc, g) => acc + (g.estimatedSheets || Math.max(1, Math.ceil((g.totalAreaM2 || 0) / 5.5))), 0);
    }
    if (sheets === 0 && m2 > 0) {
      sheets = Math.max(1, Math.ceil(m2 / 5.5));
    }

    const edgeM = order.totalEdgeM || 0;

    let holes = 0;
    if (order.birkaData?.details && order.birkaData.details.length > 0) {
      holes = order.birkaData.details.reduce((acc, d) => {
        const hCount = d.holesCount ?? ((d.holesEnd || 0) + (d.holesFace || 0));
        return acc + (hCount > 0 ? hCount * (d.quantity || 1) : 0);
      }, 0);
    }
    if (holes === 0 && (order.partsCount || 0) > 0) {
      holes = (order.partsCount || 0) * 8;
    }
    const parts = order.partsCount || (order.birkaData?.details?.length || 0);

    const kittingOrders = 1;
    const kittingItems = order.hardwareData?.items?.length || order.hardwareData?.totalQuantity || 1;

    const packagingM2 = m2;
    const packagingBoxes = Math.max(1, Math.ceil(parts / 8));

    const facadesM2 = order.facadesCount ? order.facadesCount * 0.4 : (m2 * 0.2);
    const assemblyModules = Math.max(1, Math.ceil(parts / 7));

    return {
      m2,
      sheets,
      edgeM,
      holes,
      parts,
      kittingOrders,
      kittingItems,
      packagingM2,
      packagingBoxes,
      facadesM2,
      assemblyModules
    };
  };

  // Helper: calculate total load and evaluate capacity for a stage on a date
  const getDailyStageCapacityStatus = (
    stageId: ProductionStageId,
    ordersInCell: ProductionOrder[]
  ) => {
    const cap = settings?.stageDailyCapacities?.[stageId];

    let totalM2 = 0;
    let totalSheets = 0;
    let totalEdgeM = 0;
    let totalHoles = 0;
    let totalParts = 0;
    let totalKittingOrders = 0;
    let totalKittingItems = 0;
    let totalPackagingM2 = 0;
    let totalAssemblyModules = 0;
    let totalFacadesM2 = 0;

    ordersInCell.forEach(o => {
      const l = getOrderStageLoad(o, stageId);
      totalM2 += l.m2;
      totalSheets += l.sheets;
      totalEdgeM += l.edgeM;
      totalHoles += l.holes;
      totalParts += l.parts;
      totalKittingOrders += l.kittingOrders;
      totalKittingItems += l.kittingItems;
      totalPackagingM2 += l.packagingM2;
      totalAssemblyModules += l.assemblyModules;
      totalFacadesM2 += l.facadesM2;
    });

    totalM2 = Math.round(totalM2 * 10) / 10;
    totalEdgeM = Math.round(totalEdgeM * 10) / 10;
    totalPackagingM2 = Math.round(totalPackagingM2 * 10) / 10;
    totalFacadesM2 = Math.round(totalFacadesM2 * 10) / 10;

    if (!cap || cap.enabled === false) {
      return {
        isConfigured: false,
        isOverloaded: false,
        warningText: null,
        badgeText: '',
        totalM2,
        totalSheets,
        totalEdgeM,
        totalHoles,
        totalParts,
        totalKittingOrders,
        totalKittingItems
      };
    }

    let isOverloaded = false;
    let warningText: string | null = null;
    let badgeText = '';

    switch (stageId) {
      case 'cutting': {
        const limitSheets = cap.dailyLimitSheets ?? 20;
        const limitM2 = cap.dailyLimitM2 ?? 100;
        badgeText = `${totalSheets}/${limitSheets} л (${totalM2}/${limitM2} м²)`;

        if ((limitSheets > 0 && totalSheets > limitSheets) || (limitM2 > 0 && totalM2 > limitM2)) {
          isOverloaded = true;
          const reasons: string[] = [];
          if (limitSheets > 0 && totalSheets > limitSheets) reasons.push(`${totalSheets} листов (норма ${limitSheets})`);
          if (limitM2 > 0 && totalM2 > limitM2) reasons.push(`${totalM2} м² (норма ${limitM2} м²)`);
          warningText = `На участке «Распил» запланировано ${reasons.join(', ')}. Риск невыполнения сменного объема раскроя.`;
        }
        break;
      }

      case 'edging': {
        const limitEdgeM = cap.dailyLimitEdgeM ?? 1500;
        badgeText = `${Math.round(totalEdgeM)}/${limitEdgeM} м`;
        if (limitEdgeM > 0 && totalEdgeM > limitEdgeM) {
          isOverloaded = true;
          warningText = `На участке «Кромкооблицовка» запланировано ${Math.round(totalEdgeM)} п.м. при норме ${limitEdgeM} п.м./смену. Риск перегрузки станка.`;
        }
        break;
      }

      case 'cnc': {
        const limitHoles = cap.dailyLimitHoles ?? 3000;
        const limitParts = cap.dailyLimitParts ?? 250;
        badgeText = `${totalHoles}/${limitHoles} отв.`;
        if ((limitHoles > 0 && totalHoles > limitHoles) || (limitParts > 0 && totalParts > limitParts)) {
          isOverloaded = true;
          const reasons: string[] = [];
          if (limitHoles > 0 && totalHoles > limitHoles) reasons.push(`${totalHoles} отв. (норма ${limitHoles})`);
          if (limitParts > 0 && totalParts > limitParts) reasons.push(`${totalParts} дет. (норма ${limitParts})`);
          warningText = `На участке «Присадка и ЧПУ» запланировано ${reasons.join(', ')}. Риск срыва сменного плана присадки.`;
        }
        break;
      }

      case 'kitting': {
        const limitOrders = cap.dailyLimitOrders ?? 8;
        const limitItems = cap.dailyLimitItems ?? 200;
        badgeText = `${totalKittingOrders}/${limitOrders} зак.`;
        if ((limitOrders > 0 && totalKittingOrders > limitOrders) || (limitItems > 0 && totalKittingItems > limitItems)) {
          isOverloaded = true;
          warningText = `На участке «Комплектовка» запланировано ${totalKittingOrders} заказов (${totalKittingItems} поз.) при дневной норме ${limitOrders} заказов.`;
        }
        break;
      }

      case 'packing': {
        const limitM2 = cap.dailyLimitM2 ?? 120;
        const limitParts = cap.dailyLimitParts ?? 250;
        badgeText = `${totalPackagingM2}/${limitM2} м²`;
        if ((limitM2 > 0 && totalPackagingM2 > limitM2) || (limitParts > 0 && totalParts > limitParts)) {
          isOverloaded = true;
          warningText = `На участке «Упаковка» запланировано ${totalPackagingM2} м² (${totalParts} дет.) при норме ${limitM2} м² в день. Риск задержки упаковочных работ.`;
        }
        break;
      }

      case 'assembly': {
        const limitModules = cap.dailyLimitModules ?? 15;
        badgeText = `${totalAssemblyModules}/${limitModules} мод.`;
        if (limitModules > 0 && totalAssemblyModules > limitModules) {
          isOverloaded = true;
          warningText = `На участке «Сборка» запланировано ${totalAssemblyModules} модулей при норме ${limitModules} в смену. Риск перегрузки сборочного участка.`;
        }
        break;
      }

      case 'facades': {
        const limitM2 = cap.dailyLimitM2 ?? 35;
        badgeText = `${totalFacadesM2}/${limitM2} м²`;
        if (limitM2 > 0 && totalFacadesM2 > limitM2) {
          isOverloaded = true;
          warningText = `На фасадном участке запланировано ${totalFacadesM2} м² при норме ${limitM2} м² в день.`;
        }
        break;
      }

      default:
        break;
    }

    return {
      isConfigured: true,
      isOverloaded,
      warningText,
      badgeText,
      totalM2,
      totalSheets,
      totalEdgeM,
      totalHoles,
      totalParts,
      totalKittingOrders,
      totalKittingItems
    };
  };

  const executeAssignStageTaskToDate = (orderId: string, stageId: ProductionStageId, dateStr: string | null) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const currentStageDates = order.stagePlannedDates || {};
    const updatedStageDates = { ...currentStageDates };

    if (dateStr) {
      updatedStageDates[stageId] = dateStr;
    } else {
      delete updatedStageDates[stageId];
    }

    let plannedCuttingDate = order.plannedCuttingDate;
    if (stageId === 'cutting' || !plannedCuttingDate) {
      plannedCuttingDate = dateStr || order.plannedCuttingDate;
    }

    const hasAnyPlannedDate = Object.keys(updatedStageDates).length > 0 || !!plannedCuttingDate;
    const firstProdStage = settings?.enabledStages?.find(s => s !== 'queue' && s !== 'ready') || 'cutting';
    let nextCurrentStage = order.currentStage;
    if ((!order.currentStage || order.currentStage === 'queue') && hasAnyPlannedDate) {
      nextCurrentStage = firstProdStage;
    }

    const updatedOrder: ProductionOrder = {
      ...order,
      stagePlannedDates: updatedStageDates,
      plannedCuttingDate: plannedCuttingDate || undefined,
      currentStage: nextCurrentStage,
      isReadyForProduction: hasAnyPlannedDate ? true : order.isReadyForProduction,
      status: (hasAnyPlannedDate && (order.status === 'planned' || !order.status)) ? 'in_progress' : order.status
    };

    onUpdateOrder(updatedOrder);

    // Check if adding this task causes stage capacity overload on this date
    if (dateStr && settings?.warnStageCapacityOverloadInPlanning !== false) {
      const ordersAfterUpdate = orders.map(o => o.id === orderId ? updatedOrder : o);
      const ordersInTargetCell = ordersAfterUpdate.filter(o => {
        const sDates = o.stagePlannedDates || {};
        const assigned = sDates[stageId] || (stageId === 'cutting' ? o.plannedCuttingDate : null);
        return assigned === dateStr;
      });

      const capacityStatus = getDailyStageCapacityStatus(stageId, ordersInTargetCell);
      if (capacityStatus.isOverloaded && capacityStatus.warningText) {
        const stName = STAGE_CONFIGS.find(s => s.id === stageId)?.name || stageId;
        setCapacityWarningAlert({
          text: capacityStatus.warningText,
          stageName: stName,
          dateStr,
          orderTitle: displayOrderTitle(order)
        });
      }
    }
  };

  const handleAssignStageTaskToDate = (orderId: string, stageId: ProductionStageId, dateStr: string | null) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const currentStageDates = order.stagePlannedDates || {};
    const currentAssigned = currentStageDates[stageId] || (stageId === 'cutting' ? order.plannedCuttingDate : null) || null;

    // If date didn't change, do nothing
    if (currentAssigned === dateStr) return;

    // If task is already started in production, show confirmation modal with options
    if (isStageTaskStarted(order, stageId)) {
      const stName = STAGE_CONFIGS.find(s => s.id === stageId)?.name || stageId;
      const { orderNumber } = getOrderDisplayParts(order);

      setMoveStartedTaskConfirmation({
        orderId,
        stageId,
        targetDateStr: dateStr,
        currentDateStr: currentAssigned,
        stageName: stName,
        orderTitle: displayOrderTitle(order),
        orderNumber
      });
      return;
    }

    executeAssignStageTaskToDate(orderId, stageId, dateStr);
  };

  const handleBirkaUploadForOrder = async (order: ProductionOrder, file: File) => {
    if (order.birkaData) {
      if (!window.confirm(`К заказу ${order.orderNumber} уже прикреплен файл "${order.birkaData.fileName}". Перезаписать спецификацию бирок?`)) {
        return;
      }
    }

    setUploadingOrderId(order.id);
    try {
      const parseRes = await parseBirkaFile(file, settings?.birkaColumnMapping);
      if (parseRes.details.length === 0) {
        throw new Error('Файл не содержит деталей');
      }

      const updatedOrder: ProductionOrder = {
        ...order,
        totalAreaM2: parseRes.totalAreaM2,
        totalEdgeM: parseRes.totalEdgeMeters,
        partsCount: parseRes.totalPartsCount,
        birkaData: {
          fileName: parseRes.fileName,
          fileHash: parseRes.fileHash,
          uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
          details: parseRes.details,
          materialGroups: parseRes.materialGroups,
          allEdges: parseRes.allEdges
        }
      };

      onUpdateOrder(updatedOrder);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки файла бирок');
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleHardwareUploadForOrder = async (order: ProductionOrder, file: File) => {
    if (order.hardwareData) {
      if (!window.confirm(`К заказу ${order.orderNumber} уже прикреплена ведомость "${order.hardwareData.fileName}". Перезаписать спецификацию фурнитуры?`)) {
        return;
      }
    }

    setUploadingOrderId(order.id);
    try {
      const parseRes = await parseHardwareFile(file, settings?.hardwareColumnMapping);
      if (parseRes.items.length === 0) {
        throw new Error('В файле не найдено строк с фурнитурой или наименованиями');
      }

      const updatedOrder: ProductionOrder = {
        ...order,
        hardwareData: {
          fileName: parseRes.fileName,
          fileHash: parseRes.fileHash,
          uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
          items: parseRes.items,
          totalItemsCount: parseRes.totalItemsCount,
          totalQuantity: parseRes.totalQuantity,
          categoriesSummary: parseRes.categoriesSummary
        }
      };

      onUpdateOrder(updatedOrder);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки ведомости фурнитуры');
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleAssemblyUploadForOrder = async (order: ProductionOrder, file: File) => {
    if (order.assemblyFileData) {
      if (!window.confirm(`К заказу ${order.orderNumber} уже прикреплен файл Сборка "${order.assemblyFileData.fileName}". Перезаписать файл Сборки?`)) {
        return;
      }
    }

    setUploadingOrderId(order.id);
    try {
      const isPdfFile = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      let fileContent = '';

      if (isPdfFile) {
        fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        const textContent = await file.text();
        fileContent = textContent.substring(0, 500000);
      }

      const updatedOrder: ProductionOrder = {
        ...order,
        assemblyFileData: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
          fileContent: fileContent
        }
      };

      onUpdateOrder(updatedOrder);
      alert(`Файл Сборка "${file.name}" успешно прикреплен к заказу ${order.orderNumber}`);
    } catch (err: any) {
      alert(err.message || 'Ошибка прикрепления файла Сборка');
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleLaunchToProduction = (order: ProductionOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const plannedDate = order.plannedCuttingDate || new Date().toISOString().split('T')[0];
    const firstProdStage = settings?.enabledStages?.find(s => s !== 'queue' && s !== 'ready') || 'cutting';
    
    const updatedOrder: ProductionOrder = {
      ...order,
      plannedCuttingDate: plannedDate,
      isReadyForProduction: true,
      status: 'in_progress',
      currentStage: firstProdStage
    };
    onUpdateOrder(updatedOrder);
    setLaunchedModalOrder({ order: updatedOrder, plannedDate });
  };

  const handleUpdateAdditionalWorks = (order: ProductionOrder, worksUpdate: Partial<AdditionalWorks>) => {
    const currentWorks = order.additionalWorks || {};
    const updatedOrder: ProductionOrder = {
      ...order,
      additionalWorks: {
        ...currentWorks,
        ...worksUpdate
      }
    };
    onUpdateOrder(updatedOrder);
  };

  const activeOrders = useMemo(() => orders.filter(o => !o.isDeleted), [orders]);
  const deletedOrders = useMemo(() => orders.filter(o => !!o.isDeleted), [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // If deleted filter is selected, show only deleted orders
      if (statusFilter === 'deleted') {
        if (!o.isDeleted) return false;
      } else {
        // Otherwise only show active orders
        if (o.isDeleted) return false;
      }

      const matchesSearch = 
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.clientName.toLowerCase().includes(search.toLowerCase()) ||
        o.projectName.toLowerCase().includes(search.toLowerCase());
      
      const matchesPriority = selectedPriority === 'all' || o.priority === selectedPriority;

      let matchesStatus = true;
      if (statusFilter === 'queue') {
        matchesStatus = !isOrderFullyPlanned(o);
      } else if (statusFilter === 'ready') {
        matchesStatus = isOrderFullyPlanned(o);
      }

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [orders, statusFilter, search, selectedPriority]);

  const queueOrdersCount = activeOrders.filter(o => !isOrderFullyPlanned(o)).length;
  const readyOrdersCount = activeOrders.filter(o => isOrderFullyPlanned(o)).length;
  const deletedOrdersCount = deletedOrders.length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Header - Compact & Space-efficient */}
      <div className="bg-white rounded-2xl sm:rounded-3xl px-4 py-3 sm:px-5 sm:py-3.5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-blue-600 uppercase tracking-wider">
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Планирование производства</span>
          </div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
            Формирование плана
          </h2>
        </div>

        {/* View Mode Switcher & Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-indigo-50/80 rounded-xl border border-indigo-200 shrink-0">
            <button
              onClick={() => setPlanningViewTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                planningViewTab === 'calendar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-900 hover:text-indigo-950'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Календарь</span>
            </button>
            <button
              onClick={() => setPlanningViewTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                planningViewTab === 'list' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-900 hover:text-indigo-950'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Реестр и файлы</span>
            </button>
          </div>

          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setStatusFilter('queue')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'queue' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Заказы, в которых еще не все этапы распределены по участкам"
            >
              <span>Очередь</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${statusFilter === 'queue' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {queueOrdersCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'ready' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Заказы, где все участки полностью спланированы"
            >
              <span>Спланированы</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${statusFilter === 'ready' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {readyOrdersCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все ({activeOrders.length})
            </button>
            <button
              onClick={() => setStatusFilter('deleted')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'deleted' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:text-rose-800'
              }`}
              title="Удаленные заказы (Корзина)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Корзина</span>
              {deletedOrdersCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${statusFilter === 'deleted' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
                  {deletedOrdersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Calendar View vs List View */}
      {planningViewTab === 'calendar' ? (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Collapsible Left Sidebar: Orders & Stage Tasks Queue */}
          {isQueueDrawerOpen ? (
            <div className="w-full lg:w-60 xl:w-64 shrink-0 bg-white rounded-3xl p-3 border border-slate-200/90 shadow-sm space-y-2.5 lg:sticky lg:top-4 max-h-[calc(100vh-80px)] flex flex-col transition-all">
              {/* Sidebar Title, Count & Collapse Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-wider truncate">
                      Очередь задач
                    </h3>
                    <p className="text-[8.5px] text-slate-500 font-medium truncate">
                      Тащите этап в календарь
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-mono font-black" title="Заказов требуют распределения">
                    {filteredOrders.length}
                  </span>
                  <button
                    onClick={() => setIsQueueDrawerOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Свернуть очередь (отдать всю ширину под календарь)"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Input */}
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск по № или клиенту..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white transition-all"
                />
              </div>

              {/* List of Orders & Drag-and-drop Stage Tasks */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                {filteredOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    {orders.length === 0 ? 'Заказы отсутствуют' : 'Все задачи распределены! 🎉'}
                  </div>
                ) : (
                  filteredOrders.map(order => {
                    const isExpanded = !!expandedOrdersMap[order.id]; // Default collapsed
                    const stageDates = order.stagePlannedDates || {};
                    const orderColor = getOrderColor(order.id);
                    const { orderNumber, clientName } = getOrderDisplayParts(order);
                    const unplannedCount = getUnplannedStagesCount(order);

                    return (
                      <div key={order.id} className="bg-slate-50/90 rounded-2xl border border-slate-200 p-2.5 shadow-2xs space-y-2 hover:border-slate-300 transition-all">
                        {/* Order Header: Line 1 = Order Number, Line 2 = Client Name */}
                        <div
                          onClick={() => toggleOrderExpanded(order.id)}
                          className="flex items-start justify-between gap-1.5 cursor-pointer select-none"
                        >
                          <div className="flex items-start gap-1.5 min-w-0 flex-1">
                            <button className="p-0.5 mt-0.5 rounded text-slate-400 hover:text-slate-700 shrink-0">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <span className="w-2.5 h-2.5 mt-1 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: orderColor.bar }} />
                            <div className="min-w-0 flex flex-col flex-1">
                              {/* Line 1: Order Number */}
                              <div className="flex items-center gap-1">
                                <span className="text-[12px] font-mono font-black text-slate-900 leading-tight truncate">
                                  {orderNumber}
                                </span>
                              </div>
                              {/* Line 2: Client / Project Name - 2 lines clean display */}
                              {clientName ? (
                                <span 
                                  className="text-[10.5px] font-bold text-slate-700 leading-snug mt-0.5 line-clamp-2 break-words" 
                                  title={clientName}
                                >
                                  {clientName}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 truncate" title={order.projectName || order.bitrixStageName || 'Заказ'}>
                                  {order.projectName || (order.birkaData?.fileName ? order.birkaData.fileName.replace(/\.[^/.]+$/, '') : (order.bitrixStageName ? `Стадия: ${order.bitrixStageName}` : 'Заказ в работе'))}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {order.priority === 'urgent' && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[8px] font-black shrink-0">
                                🚨 Срочно
                              </span>
                            )}
                            {unplannedCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-bold shrink-0" title={`${unplannedCount} этапов не в плане`}>
                                {unplannedCount} в план
                              </span>
                            )}

                            {/* B24 link button positioned right under the unplanned tasks badge */}
                            <a
                              href={getBitrixDealUrl(order, settings)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = getBitrixDealUrl(order, settings);
                                if (url === '#') {
                                  e.preventDefault();
                                  const dealId = extractBitrixDealId(order);
                                  const val = prompt('Введите URL или ID сделки в Битрикс24:', dealId || '');
                                  if (val) {
                                    const directUrl = val.startsWith('http') ? val : `https://b24.ru/crm/deal/details/${val}/`;
                                    onUpdateOrder({
                                      ...order,
                                      bitrixUrl: directUrl,
                                      bitrixDealId: val
                                    });
                                    window.open(directUrl, '_blank');
                                  }
                                }
                              }}
                              className="px-1.5 py-0.5 rounded bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-black text-[8.5px] shadow-2xs transition-all flex items-center gap-0.5 shrink-0 cursor-pointer"
                              title="Открыть сделку в Битрикс24"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>B24</span>
                            </a>
                          </div>
                        </div>

                        {/* Compact Quick Files Toolbar in Left Queue */}
                        <div className="flex items-center gap-1 pt-1 border-t border-slate-200/60 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {/* 1. Birka File Button */}
                          {order.birkaData ? (
                            <button
                              onClick={() => setViewingBirkaModalOrder(order)}
                              className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Бирки: ${order.birkaData.fileName} (${order.birkaData.details.length} дет.)`}
                            >
                              <FileText className="w-2.5 h-2.5 text-emerald-600" />
                              <span>.bir ({order.birkaData.details.length})</span>
                            </button>
                          ) : (
                            <label
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-[8.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Загрузить файл бирок (.bir)"
                            >
                              <Upload className="w-2.5 h-2.5" />
                              <span>+ .bir</span>
                              <input
                                type="file"
                                accept=".bir,.txt,.csv,.xlsx"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleBirkaUploadForOrder(order, f);
                                }}
                              />
                            </label>
                          )}

                          {/* 2. Hardware File Button */}
                          {order.hardwareData ? (
                            <button
                              onClick={() => setViewingHardwareModalOrder(order)}
                              className="px-1.5 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Фурнитура: ${order.hardwareData.fileName} (${order.hardwareData.totalQuantity} шт.)`}
                            >
                              <Box className="w-2.5 h-2.5 text-cyan-600" />
                              <span>Фурн ({order.hardwareData.items.length})</span>
                            </button>
                          ) : (
                            <label
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 border border-slate-200 hover:border-cyan-300 text-[8.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Загрузить ведомость фурнитуры (.xlsx)"
                            >
                              <Upload className="w-2.5 h-2.5" />
                              <span>+ Фурн</span>
                              <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleHardwareUploadForOrder(order, f);
                                }}
                              />
                            </label>
                          )}

                          {/* 3. Assembly File Button */}
                          {order.assemblyFileData ? (
                            <button
                              onClick={() => setViewingAssemblyModalOrder(order)}
                              className="px-1.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Сборка: ${order.assemblyFileData.fileName}`}
                            >
                              <Wrench className="w-2.5 h-2.5 text-teal-600" />
                              <span>Сборка</span>
                            </button>
                          ) : (
                            <label
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-300 text-[8.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Прикрепить чертеж / схему сборки"
                            >
                              <Upload className="w-2.5 h-2.5" />
                              <span>+ Сборка</span>
                              <input
                                type="file"
                                accept=".pdf,.txt,.doc,.docx"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleAssemblyUploadForOrder(order, f);
                                }}
                              />
                            </label>
                          )}

                          {/* 4. Delete / Restore Button */}
                          {order.isDeleted ? (
                            <button
                              onClick={() => {
                                onUpdateOrder({
                                  ...order,
                                  isDeleted: false,
                                  deletedAt: undefined,
                                  deletedByEmployeeName: undefined
                                });
                              }}
                              className="ml-auto px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-[8.5px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                              title="Восстановить из корзины"
                            >
                              <Undo2 className="w-2.5 h-2.5" />
                              <span>Восст.</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (window.confirm(`Переместить заказ «${orderNumber} ${clientName}» в корзину?`)) {
                                  onUpdateOrder({
                                    ...order,
                                    isDeleted: true,
                                    deletedAt: new Date().toISOString()
                                  });
                                }
                              }}
                              className="ml-auto p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-[8.5px] flex items-center gap-0.5 cursor-pointer transition-colors"
                              title="Удалить заказ в корзину"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        {/* Row-by-Row Stage Tasks (Exact shortened names) */}
                        {isExpanded && (
                          <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-200/70">
                            {STAGE_CONFIGS.map(st => {
                              const StIcon = st.icon;
                              const assignedDate = getStageAssignedDate(order, st.id);
                              const { isDone: isStageDone, isWorkingNow, scannedCount, totalCount } = getStageCompletionStatus(order, st.id);
                              const isStageActiveNow = isWorkingNow || (order.currentStage === st.id && order.status === 'in_progress');

                              return (
                                <div
                                  key={st.id}
                                  draggable={true}
                                  onDragStart={() => setDraggedStageTask({ orderId: order.id, stageId: st.id })}
                                  className={`px-2 py-1 rounded-xl border text-xs font-bold flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] shadow-2xs ${
                                    isStageDone
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 opacity-80'
                                      : isStageActiveNow
                                        ? 'bg-blue-50/90 border-blue-400 text-blue-950'
                                        : assignedDate 
                                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' 
                                          : 'bg-white border-slate-200 text-slate-800 hover:border-blue-400 hover:shadow-xs'
                                  }`}
                                  title="Зажмите и перетащите в нужный день календаря"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <StIcon className={`w-3.5 h-3.5 shrink-0 ${st.color}`} />
                                    <span className="text-[11px] font-black truncate">{st.name}</span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {isStageDone ? (
                                      <span className="text-[8.5px] font-bold text-emerald-700 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                                        ✓ Выполнен
                                      </span>
                                    ) : (scannedCount > 0 && totalCount > 0) ? (
                                      <span className="text-[8.5px] font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-0.5" title={`Отсканировано ${scannedCount} из ${totalCount} деталей`}>
                                        ⚡ {scannedCount}/{totalCount} шт.
                                      </span>
                                    ) : isStageActiveNow && !order.stagePlannedDates?.[st.id] ? (
                                      <span className="text-[8.5px] font-bold text-blue-700 bg-blue-100/90 px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-0.5">
                                        ⚡ В работе
                                      </span>
                                    ) : assignedDate ? (
                                      <span className="text-[9px] font-mono font-black text-emerald-800 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-200">
                                        📅 {assignedDate.split('-').slice(1).join('.')}
                                      </span>
                                    ) : (
                                      <span className="text-[8.5px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        ⚠️ В план
                                      </span>
                                    )}
                                    <GripVertical className="w-3 h-3 text-slate-300" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Collapsed Sidebar Bar (Click to open) */
            <div className="shrink-0">
              <button
                onClick={() => setIsQueueDrawerOpen(true)}
                className="flex lg:flex-col items-center gap-2 px-3 py-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-2xl shadow-sm transition-all cursor-pointer group"
                title="Развернуть очередь нераспределенных заказов"
              >
                <PanelLeftOpen className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black [writing-mode:horizontal-tb] lg:[writing-mode:vertical-lr] lg:rotate-180 tracking-wider flex items-center gap-1.5">
                  <span>Очередь заказов</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-mono font-black [writing-mode:horizontal-tb] lg:rotate-180">
                    {filteredOrders.length}
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* Right Area: Interactive Calendar Matrix Grid */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Calendar Controls Bar */}
            <div className="bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-sm space-y-2.5">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                {/* Navigation */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      onClick={handlePrevPeriod}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
                      title="Назад"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleTodayPeriod}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Сегодня</span>
                    </button>
                    <button
                      onClick={handleNextPeriod}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
                      title="Вперед"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-xs font-black text-slate-900 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    {timelineDays[0].dayNum} {timelineDays[0].monthName} – {timelineDays[timelineDays.length - 1].dayNum} {timelineDays[timelineDays.length - 1].monthName} {timelineDays[timelineDays.length - 1].dateObj.getFullYear()}
                  </span>
                </div>

                {/* Horizon and Mode Switcher */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Period Horizon (1 week vs 2 weeks) */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => {
                        setPeriodRange('1week');
                        handleTodayPeriod();
                      }}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        periodRange === '1week' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Неделя
                    </button>
                    <button
                      onClick={() => {
                        setPeriodRange('2weeks');
                        handleTodayPeriod();
                      }}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        periodRange === '2weeks' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      2 недели
                    </button>
                  </div>

                  {/* Rows Mode */}
                  <div className="flex items-center p-1 bg-indigo-50 rounded-2xl border border-indigo-200 text-xs font-bold">
                    <button
                      onClick={() => setGridRowsMode('stages')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                        gridRowsMode === 'stages' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'text-indigo-900 hover:text-indigo-950'
                      }`}
                    >
                      <Factory className="w-3.5 h-3.5" />
                      <span>Участки слева</span>
                    </button>
                    <button
                      onClick={() => setGridRowsMode('orders')}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                        gridRowsMode === 'orders' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'text-indigo-900 hover:text-indigo-950'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>Заказы слева</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Daily Capacity Overload Non-blocking Warning Banner */}
            {capacityWarningAlert && (
              <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/70 border-2 border-amber-300 text-amber-950 rounded-3xl flex items-start justify-between gap-3 shadow-md">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-2xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-2xs">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-amber-950">
                        Внимание: превышена дневная норма выработки!
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-200/90 text-amber-900 text-[10px] font-black font-mono">
                        Участок: {capacityWarningAlert.stageName} · Дата: {capacityWarningAlert.dateStr}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                      {capacityWarningAlert.text}
                    </p>
                    <div className="text-[11px] text-amber-800/90 font-medium">
                      ℹ️ Заказ <span className="font-bold">{capacityWarningAlert.orderTitle}</span> добавлен в план. Предупреждение носит уведомительный характер, начальник цеха может перераспределить объемы при необходимости.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCapacityWarningAlert(null)}
                  className="p-1.5 rounded-2xl hover:bg-amber-200/80 text-amber-800 transition-colors cursor-pointer shrink-0"
                  title="Закрыть уведомление"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Matrix Calendar Grid - Fluid and auto-adapting */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="w-full overflow-x-auto">
                <div className="min-w-[650px] w-full">
                  {/* Table Header: Date Columns */}
                  <div className="flex border-b border-slate-200 bg-slate-100/90 sticky top-0 z-20 text-xs font-black text-slate-700">
                    <div className="w-32 sm:w-36 p-2 shrink-0 border-r border-slate-200 flex items-center gap-1.5 bg-slate-100">
                      <Factory className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate text-xs">{gridRowsMode === 'stages' ? 'Участки' : 'Заказы'}</span>
                    </div>

                    <div className={`flex-1 grid ${periodRange === '1week' ? 'grid-cols-7' : 'grid-cols-14'}`}>
                      {timelineDays.map(day => {
                        // Check if any stage is overloaded on this day
                        const dayOverloadedCount = STAGE_CONFIGS.filter(st => {
                          const tasksInSt: ProductionOrder[] = [];
                          orders.forEach(o => {
                            const assigned = getStageAssignedDate(o, st.id);
                            if (assigned === day.dateStr) tasksInSt.push(o);
                          });
                          const stStatus = getDailyStageCapacityStatus(st.id, tasksInSt);
                          return stStatus.isOverloaded;
                        }).length;

                        return (
                          <div
                            key={day.dateStr}
                            className={`p-1 text-center border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center gap-0.5 min-w-0 ${
                              day.isToday 
                                ? 'bg-blue-600 text-white font-black' 
                                : day.isWeekend 
                                  ? 'bg-slate-200/60 text-slate-800' 
                                  : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-0.5 text-[10px] leading-none">
                              <span className="opacity-80">{day.dayName}</span>
                              <span className="font-mono font-extrabold">{day.dayNum}</span>
                            </div>
                            {day.isToday && (
                              <span className="text-[7.5px] uppercase font-black tracking-wider bg-white/20 px-1 rounded">
                                Сегодня
                              </span>
                            )}
                            {dayOverloadedCount > 0 && (
                              <span
                                className="px-1 py-0.2 rounded bg-rose-500 text-white text-[7px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-2xs mt-0.5"
                                title={`Внимание: на эту дату на ${dayOverloadedCount} уч. превышена дневная норма выработки!`}
                              >
                                <AlertCircle className="w-2 h-2 shrink-0" />
                                <span>Риск</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table Body */}
                  {gridRowsMode === 'stages' ? (
                    /* MODE A: STAGES AS ROWS */
                    <div className="divide-y divide-slate-200">
                      {STAGE_CONFIGS.map(st => {
                        const StIcon = st.icon;
                        const stCap = settings?.stageDailyCapacities?.[st.id];

                        return (
                          <div key={st.id} className="flex min-h-[75px] hover:bg-slate-50/40 transition-colors">
                            {/* Stage Row Header */}
                            <div className="w-32 sm:w-36 p-2 shrink-0 border-r border-slate-200 flex flex-col justify-center bg-slate-50/80">
                              <div className="flex items-center gap-1 font-black text-slate-900 text-xs">
                                <div className={`p-1 rounded-lg border ${st.bg} shrink-0`}>
                                  <StIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${st.color}`} />
                                </div>
                                <span className="text-[10.5px] sm:text-[11px] font-black truncate">{st.name}</span>
                              </div>
                              {stCap && stCap.enabled !== false && (
                                <div className="text-[8.5px] text-slate-500 font-semibold truncate mt-1 pl-1 border-l-2 border-slate-300" title="Установленная дневная норма выработки">
                                  {st.id === 'cutting' && `Норма: ${stCap.dailyLimitSheets ?? 20}л`}
                                  {st.id === 'edging' && `Норма: ${stCap.dailyLimitEdgeM ?? 1500}м`}
                                  {st.id === 'cnc' && `Норма: ${stCap.dailyLimitHoles ?? 3000}отв.`}
                                  {st.id === 'kitting' && `Норма: ${stCap.dailyLimitOrders ?? 8}зак.`}
                                  {st.id === 'packing' && `Норма: ${stCap.dailyLimitM2 ?? 120}м²`}
                                  {st.id === 'assembly' && `Норма: ${stCap.dailyLimitModules ?? 15}м.`}
                                  {st.id === 'facades' && `Норма: ${stCap.dailyLimitM2 ?? 35}м²`}
                                </div>
                              )}
                            </div>

                            {/* Day Cells for this stage */}
                            <div className={`flex-1 grid ${periodRange === '1week' ? 'grid-cols-7' : 'grid-cols-14'}`}>
                              {timelineDays.map(day => {
                                const tasksInCell: ProductionOrder[] = [];
                                orders.forEach(o => {
                                  const assigned = getStageAssignedDate(o, st.id);
                                  if (assigned === day.dateStr) {
                                    tasksInCell.push(o);
                                  }
                                });

                                const cellStatus = getDailyStageCapacityStatus(st.id, tasksInCell);

                                return (
                                  <div
                                    key={day.dateStr}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (draggedStageTask) {
                                        handleAssignStageTaskToDate(draggedStageTask.orderId, draggedStageTask.stageId, day.dateStr);
                                        setDraggedStageTask(null);
                                      }
                                    }}
                                    className={`p-1 border-r border-slate-200 last:border-r-0 space-y-1 overflow-y-auto max-h-[175px] transition-colors min-w-0 flex flex-col ${
                                      day.isToday ? 'bg-blue-50/20' : day.isWeekend ? 'bg-slate-50/30' : ''
                                    }`}
                                  >
                                    {/* Cell Load Summary Indicator */}
                                    {tasksInCell.length > 0 && cellStatus.badgeText && (
                                      <div
                                        className={`px-1 py-0.5 rounded-lg text-[8px] font-black tracking-tight flex items-center justify-between gap-0.5 border transition-colors shrink-0 ${
                                          cellStatus.isOverloaded
                                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                                            : 'bg-slate-100/90 text-slate-700 border-slate-200'
                                        }`}
                                        title={
                                          cellStatus.isOverloaded
                                            ? `⚠️ Внимание: превышена дневная норма!\n${cellStatus.warningText}`
                                            : `Загрузка участка: ${cellStatus.badgeText}`
                                        }
                                      >
                                        <div className="flex items-center gap-0.5 truncate min-w-0">
                                          {cellStatus.isOverloaded ? (
                                            <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                          ) : (
                                            <CheckCircle2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                          )}
                                          <span className="truncate">{cellStatus.badgeText}</span>
                                        </div>
                                        {cellStatus.isOverloaded && (
                                          <span className="px-1 py-0.2 rounded bg-rose-600 text-white text-[6.5px] font-black uppercase shrink-0">
                                            Риск
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {tasksInCell.map(order => {
                                      const orderColor = getOrderColor(order.id);
                                      const { orderNumber, clientName } = getOrderDisplayParts(order);
                                      const { isDone: isStageDone, isWorkingNow, scannedCount, totalCount } = getStageCompletionStatus(order, st.id);
                                      const isStageActiveNow = isWorkingNow || (order.currentStage === st.id && order.status === 'in_progress');
                                      const isAutoAssignedToday = !order.stagePlannedDates?.[st.id] && (st.id !== 'cutting' || !order.plannedCuttingDate) && isStageActiveNow;

                                      return (
                                        <div
                                          key={order.id}
                                          draggable={true}
                                          onDragStart={() => setDraggedStageTask({ orderId: order.id, stageId: st.id })}
                                          onClick={() => setViewingBirkaModalOrder(order)}
                                          className={`group relative p-1.5 min-h-[48px] rounded-xl border text-left shadow-2xs hover:shadow-md transition-all cursor-pointer hover:ring-1 hover:ring-blue-400 w-full flex flex-col justify-between gap-0.5 ${orderColor.bg} ${orderColor.border} ${
                                            order.priority === 'urgent' ? 'ring-2 ring-red-400' : ''
                                          } ${isStageDone ? 'opacity-70 bg-slate-100/90 border-slate-300' : ''}`}
                                          title={`Заказ №${order.orderNumber}\nКлиент: ${clientName || '—'}\nСрок: ${formatDeadlineDate(order.deadlineDate)}\nДеталей: ${order.partsCount || 0} шт (${order.totalAreaM2 || 0} м²)\nКромка: ${order.totalEdgeM || 0} п.м.\nСтатус: ${isStageDone ? '✓ Готово' : scannedCount > 0 ? `В работе (${scannedCount}/${totalCount} шт.)` : 'В плане'}`}
                                        >
                                          {/* Line 1: Order Number + Compact Badges + Unassign button */}
                                          <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isStageDone ? '#10b981' : orderColor.bar }} />
                                              <span className={`font-mono font-black text-[11px] sm:text-xs leading-none truncate ${isStageDone ? 'text-slate-600 line-through' : orderColor.text}`}>
                                                №{orderNumber}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-0.5 shrink-0">
                                              {order.priority === 'urgent' && !isStageDone && (
                                                <span className="px-1 py-0.2 rounded bg-red-600 text-white font-black text-[7px] uppercase" title="Срочный заказ!">
                                                  !
                                                </span>
                                              )}
                                              {isStageDone && (
                                                <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[7.5px]" title="Этап выполнен">
                                                  ✓
                                                </span>
                                              )}
                                              {!isStageDone && scannedCount > 0 && totalCount > 0 && (
                                                <span className="px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[7.5px]" title={`Отсканировано: ${scannedCount} из ${totalCount} шт.`}>
                                                  ⚡{scannedCount}/{totalCount}
                                                </span>
                                              )}
                                              {isAutoAssignedToday && !isStageDone && scannedCount === 0 && (
                                                <span className="px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[7.5px]" title="В работе сегодня">
                                                  ⚡
                                                </span>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleAssignStageTaskToDate(order.id, st.id, null);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 text-slate-500 hover:text-red-700 transition-opacity cursor-pointer"
                                                title="Снять с даты"
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Line 2: Client / Project Name (Legible multi-line with clamp) */}
                                          <div className="text-[9.5px] sm:text-[10px] font-bold leading-tight line-clamp-2 text-slate-800 break-words" title={clientName}>
                                            {clientName || '—'}
                                          </div>

                                          {/* Line 3: Volume & Parts Footnote */}
                                          <div className="flex items-center justify-between text-[7.5px] sm:text-[8px] font-semibold text-slate-500 pt-0.5 border-t border-black/5">
                                            <span>{order.partsCount || 0} дет.</span>
                                            <span>{order.totalAreaM2 ? `${order.totalAreaM2} м²` : ''}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* MODE B: ORDERS AS ROWS */
                    <div className="divide-y divide-slate-200">
                      {filteredOrders.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 font-medium">
                          Заказов не найдено
                        </div>
                      ) : (
                        filteredOrders.map(order => {
                          const isExpanded = !!expandedOrdersMap[order.id];
                          const stageDates = order.stagePlannedDates || {};
                          const orderColor = getOrderColor(order.id);
                          const { orderNumber, clientName } = getOrderDisplayParts(order);

                          return (
                            <div key={order.id} className="divide-y divide-slate-100">
                              {/* Order Parent Row */}
                              <div className="flex min-h-[40px] bg-slate-50/90 font-bold text-xs items-center">
                                <div
                                  onClick={() => toggleOrderExpanded(order.id)}
                                  className="w-32 sm:w-36 p-2 shrink-0 border-r border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                  <div className="flex items-start gap-1.5 min-w-0">
                                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500 mt-0.5" /> : <ChevronDown className="w-3 h-3 text-slate-500 mt-0.5" />}
                                    <span className="w-2 h-2 mt-1 rounded-full shrink-0" style={{ backgroundColor: orderColor.bar }} />
                                    <div className="min-w-0 flex flex-col">
                                      <span className="truncate text-slate-900 font-mono font-black text-[10.5px] leading-tight">
                                        №{orderNumber}
                                      </span>
                                      {clientName && (
                                        <span className="text-[9px] font-bold text-slate-600 truncate leading-tight mt-0.5" title={clientName}>
                                          {clientName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                 {/* Stage summary on order row */}
                                <div className={`flex-1 grid ${periodRange === '1week' ? 'grid-cols-7' : 'grid-cols-14'}`}>
                                  {timelineDays.map(day => {
                                    const assignedStages = STAGE_CONFIGS.filter(st => {
                                      const assigned = getStageAssignedDate(order, st.id);
                                      return assigned === day.dateStr;
                                    });

                                    return (
                                      <div key={day.dateStr} className="p-0.5 border-r border-slate-200 last:border-r-0 flex flex-wrap gap-0.5 items-center justify-center min-w-0">
                                        {assignedStages.map(st => {
                                          const StIcon = st.icon;
                                          const { isDone: isStageDone } = getStageCompletionStatus(order, st.id);

                                          return (
                                            <span 
                                              key={st.id} 
                                              className={`px-1 py-0.5 rounded border text-[8px] font-black flex items-center gap-0.5 ${
                                                isStageDone 
                                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 opacity-80' 
                                                  : `${orderColor.bg} ${orderColor.border} ${orderColor.text}`
                                              }`} 
                                              title={`${st.name}: ${orderNumber}${clientName ? ` (${clientName})` : ''}${isStageDone ? ' [Выполнен]' : ''}`}
                                            >
                                              <StIcon className="w-2.5 h-2.5" />
                                              <span>{st.shortName}{isStageDone ? ' ✓' : ''}</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Sub-rows for each stage of order */}
                              {isExpanded && STAGE_CONFIGS.map(st => {
                                const StIcon = st.icon;
                                const assignedDate = getStageAssignedDate(order, st.id);
                                const { isDone: isStageDone, isWorkingNow, scannedCount, totalCount } = getStageCompletionStatus(order, st.id);
                                const isStageActiveNow = isWorkingNow || (order.currentStage === st.id && order.status === 'in_progress');
                                const isAutoAssignedToday = !order.stagePlannedDates?.[st.id] && (st.id !== 'cutting' || !order.plannedCuttingDate) && isStageActiveNow;

                                return (
                                  <div key={st.id} className="flex min-h-[34px] bg-white text-xs hover:bg-slate-50/40">
                                    <div className="w-32 sm:w-36 pl-4 pr-2 py-1 shrink-0 border-r border-slate-200 flex items-center justify-between text-[10px] text-slate-700">
                                      <span className="flex items-center gap-1 font-bold truncate">
                                        <StIcon className={`w-3 h-3 ${st.color}`} />
                                        <span className="truncate text-[10px]">{st.name}</span>
                                      </span>
                                      {isStageDone && (
                                        <span className="text-[7.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                          ✓ Выполнен
                                        </span>
                                      )}
                                      {!isStageDone && scannedCount > 0 && totalCount > 0 && (
                                        <span className="text-[7.5px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 shrink-0">
                                          ⚡ {scannedCount}/{totalCount}
                                        </span>
                                      )}
                                    </div>

                                    <div className={`flex-1 grid ${periodRange === '1week' ? 'grid-cols-7' : 'grid-cols-14'}`}>
                                      {timelineDays.map(day => {
                                        const isAssignedToThisDay = assignedDate === day.dateStr;

                                        return (
                                          <div
                                            key={day.dateStr}
                                            onClick={() => {
                                              if (isAssignedToThisDay) {
                                                setViewingBirkaModalOrder(order);
                                              } else {
                                                handleAssignStageTaskToDate(order.id, st.id, day.dateStr);
                                              }
                                            }}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              e.dataTransfer.dropEffect = 'move';
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              if (draggedStageTask) {
                                                handleAssignStageTaskToDate(draggedStageTask.orderId, draggedStageTask.stageId, day.dateStr);
                                                setDraggedStageTask(null);
                                              }
                                            }}
                                            className={`p-0.5 border-r border-slate-200 last:border-r-0 flex items-center justify-center transition-colors min-w-0 cursor-pointer ${
                                              isAssignedToThisDay ? 'bg-blue-50/30' : 'hover:bg-blue-50/40'
                                            }`}
                                            title={
                                              isAssignedToThisDay 
                                                ? `${st.name} запланирован на ${day.dateStr} (клик для деталей, перетащите для переноса)`
                                                : `Кликните, чтобы назначить «${st.name}» заказа №${orderNumber} на ${day.dateStr}`
                                            }
                                          >
                                            {isAssignedToThisDay && (
                                              <div
                                                draggable={true}
                                                onDragStart={(e) => {
                                                  e.stopPropagation();
                                                  setDraggedStageTask({ orderId: order.id, stageId: st.id });
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setViewingBirkaModalOrder(order);
                                                }}
                                                className={`group relative p-1 rounded-lg border min-h-[28px] w-full flex items-center justify-center gap-1 shadow-2xs cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-blue-400 transition-all ${
                                                  isStageDone 
                                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900' 
                                                    : `${orderColor.bg} ${orderColor.border} ${orderColor.text}`
                                                }`}
                                                title={`Заказ №${orderNumber} • ${clientName || ''}\nЭтап: ${st.name} ${isStageDone ? '[Выполнен]' : ''}\nДата: ${day.dateStr}\n(Перетащите или кликните в другую ячейку для переноса)`}
                                              >
                                                <StIcon className={`w-3.5 h-3.5 shrink-0 ${isStageDone ? 'text-emerald-700' : st.color}`} />
                                                {isStageDone ? (
                                                  <span className="text-[8.5px] font-black text-emerald-800 leading-none">✓</span>
                                                ) : isAutoAssignedToday ? (
                                                  <span className="text-[8px] font-black text-blue-700 leading-none">⚡</span>
                                                ) : null}

                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAssignStageTaskToDate(order.id, st.id, null);
                                                  }}
                                                  className="opacity-0 group-hover:opacity-100 absolute -top-1 -right-1 p-0.5 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-xs transition-opacity cursor-pointer z-10"
                                                  title="Снять с даты"
                                                >
                                                  <X className="w-2.5 h-2.5" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск заказа, клиента, проекта..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Все приоритеты</option>
                <option value="urgent">Только срочные</option>
                <option value="high">Высокий приоритет</option>
                <option value="normal">Обычный приоритет</option>
              </select>

              <span className="text-xs text-slate-500 font-bold">
                Всего: {filteredOrders.length}
              </span>
            </div>
          </div>

          {/* Orders List in Planning */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Заказов в планировании не найдено</p>
                <p className="text-xs text-slate-400 mt-1">Все заказы запущены или попробуйте изменить поисковые фильтры</p>
              </div>
            ) : (
          filteredOrders.map((order) => {
            const priorityStyles = {
              urgent: 'bg-red-50 text-red-700 border-red-200',
              high: 'bg-amber-50 text-amber-700 border-amber-200',
              normal: 'bg-blue-50 text-blue-700 border-blue-200',
              low: 'bg-slate-50 text-slate-700 border-slate-200'
            }[order.priority];

            const works = order.additionalWorks || {};
            const isWorksExpanded = expandedWorksOrderId === order.id;

            // Extract clean order number and client name to prevent ugly duplication
            let rawNumber = (order.orderNumber || '').trim();
            let rawClient = (order.clientName || '').trim();
            let rawProject = (order.projectName || '').trim();

            let displayNumber = rawNumber;
            let displayClient = rawClient;

            const matchNum = rawNumber.match(/^([A-Za-z0-9\-_./]+)\s+(.+)$/);
            if (matchNum) {
              displayNumber = matchNum[1];
              if (!displayClient || displayClient === rawNumber) {
                displayClient = matchNum[2];
              }
            }

            if (displayClient && displayNumber && displayClient.startsWith(displayNumber)) {
              displayClient = displayClient.slice(displayNumber.length).replace(/^[\s\-–—.:]+/, '').trim();
            }

            if (!displayClient) {
              displayClient = rawProject || 'Заказ без названия';
            }

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-5 md:p-6 border transition-all shadow-xs space-y-4 ${
                  order.isReadyForProduction 
                    ? 'border-emerald-300/80 bg-gradient-to-r from-emerald-50/25 via-white to-white' 
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* 1. Header Row: Order ID, B24, Client Name & Status Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                    {/* Order Number Badge */}
                    <div className="font-mono font-black text-slate-900 text-xs sm:text-sm bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/90 shrink-0">
                      {displayNumber}
                    </div>

                    {/* B24 Button */}
                    <a
                      href={order.bitrixUrl || (order.bitrixDealId ? `https://b24.ru/crm/deal/details/${order.bitrixDealId}/` : '#')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!order.bitrixUrl && !order.bitrixDealId) {
                          e.preventDefault();
                          const val = prompt('Введите URL или ID сделки в Битрикс24:', order.bitrixDealId || '');
                          if (val) {
                            const url = val.startsWith('http') ? val : `https://b24.ru/crm/deal/details/${val}/`;
                            onUpdateOrder({
                              ...order,
                              bitrixUrl: url,
                              bitrixDealId: val
                            });
                            window.open(url, '_blank');
                          }
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold text-[11px] shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Открыть сделку в Битрикс24"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>B24</span>
                    </a>

                    {/* Clean Client & Project Name */}
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug truncate">
                      {displayClient}
                      {rawProject && rawProject.toLowerCase() !== displayClient.toLowerCase() && !displayClient.toLowerCase().includes(rawProject.toLowerCase()) && (
                        <span className="text-slate-400 font-medium text-xs sm:text-sm ml-2">
                          / {rawProject}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges: Deadline + Priority + Status */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {order.deadlineDate && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Срок: {formatDeadlineDate(order.deadlineDate)}</span>
                      </span>
                    )}

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shrink-0 ${priorityStyles}`}>
                      {order.priority === 'urgent' ? 'Срочно' : order.priority === 'high' ? 'Высокий' : 'Обычный'}
                    </span>

                    {order.isReadyForProduction ? (
                      <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Запущен в цех
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        В очереди
                      </span>
                    )}

                    {/* Delete / Restore Actions */}
                    {order.isDeleted ? (
                      <button
                        onClick={() => {
                          onUpdateOrder({
                            ...order,
                            isDeleted: false,
                            deletedAt: undefined,
                            deletedByEmployeeName: undefined
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1 shrink-0 cursor-pointer transition-colors shadow-2xs"
                        title="Восстановить заказ из корзины"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Восстановить</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (window.confirm(`Переместить заказ «${displayNumber} ${displayClient}» в корзину?`)) {
                            onUpdateOrder({
                              ...order,
                              isDeleted: true,
                              deletedAt: new Date().toISOString()
                            });
                          }
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors shrink-0 cursor-pointer"
                        title="Удалить заказ в корзину"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Middle Row: Specification Metrics & Action Controls */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
                  {/* Left: Specification Metrics */}
                  <div className="xl:col-span-7 flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Площадь:</span>
                      <strong className="text-slate-900 font-bold font-mono">{order.totalAreaM2 || 0} м²</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Кромка:</span>
                      <strong className="text-slate-900 font-bold font-mono">{order.totalEdgeM || 0} п.м.</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Деталей:</span>
                      <strong className="text-slate-900 font-bold font-mono">{order.partsCount || 0} шт.</strong>
                    </div>

                    {order.birkaData ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingBirkaModalOrder(order);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer shadow-2xs max-w-[240px] truncate"
                        title="Нажмите, чтобы просмотреть спецификацию бирок, детали и расход материалов"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Бирки: {order.birkaData.fileName}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/90">
                        <Upload className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Бирки не прикреплены</span>
                      </span>
                    )}

                    {order.hardwareData ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingHardwareModalOrder(order);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-xl border border-cyan-200 transition-colors cursor-pointer shadow-2xs max-w-[260px] truncate"
                        title="Нажмите, чтобы просмотреть ведомость фурнитуры и комплектации"
                      >
                        <Package className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span className="truncate">Фурнитура: {order.hardwareData.totalItemsCount} поз. ({order.hardwareData.totalQuantity} шт.)</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Фурнитура не загружена</span>
                      </span>
                    )}

                    {order.assemblyFileData ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingAssemblyModalOrder(order);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors cursor-pointer shadow-2xs max-w-[240px] truncate"
                        title={`Нажмите, чтобы просмотреть технический файл Сборка: ${order.assemblyFileData.fileName}`}
                      >
                        <Wrench className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">Сборка: {order.assemblyFileData.fileName}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Сборка не загружена</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Date Picker, Upload & Launch Button */}
                  <div className="xl:col-span-5 flex items-center gap-2 sm:gap-3 flex-wrap justify-start xl:justify-end">
                    {/* Planned Cutting Date */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
                      <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
                          День распила
                        </span>
                        <input
                          type="date"
                          value={order.plannedCuttingDate || ''}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            const hasDate = !!newDate;
                            const firstProdStage = settings?.enabledStages?.find(s => s !== 'queue' && s !== 'ready') || 'cutting';
                            onUpdateOrder({
                              ...order,
                              plannedCuttingDate: newDate,
                              isReadyForProduction: hasDate ? true : order.isReadyForProduction,
                              status: (hasDate && (order.status === 'planned' || !order.status)) ? 'in_progress' : order.status,
                              currentStage: (!order.currentStage || order.currentStage === 'queue') && hasDate ? firstProdStage : order.currentStage
                            });
                          }}
                          className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer mt-0.5"
                        />
                      </div>
                    </div>

                    {/* Upload Birka File Button */}
                    <label 
                      className="px-3.5 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs font-bold text-blue-700 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title="Загрузить файл раскроя и бирок (.bir, .csv, .tsv, .txt, .zip)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{order.birkaData ? 'Заменить бирки' : '+ Файл бирок'}</span>
                      <input
                        type="file"
                        accept=".bir,.csv,.tsv,.dbf,.zip,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBirkaUploadForOrder(order, file);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {/* Upload Hardware Specification Button */}
                    <label 
                      className="px-3.5 py-2.5 rounded-2xl bg-cyan-50 hover:bg-cyan-600 hover:text-white border border-cyan-200 text-xs font-bold text-cyan-700 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title="Загрузить ведомость фурнитуры / спецификацию комплектующих (.xlsx, .xls, .csv, .tsv, .xml, .txt)"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>{order.hardwareData ? 'Заменить фурнитуру' : '+ Ведомость фурнитуры'}</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.tsv,.txt,.xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleHardwareUploadForOrder(order, file);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {/* Upload Assembly File Button */}
                    <label 
                      className="px-3.5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200 text-xs font-bold text-purple-700 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      title="Загрузить файл Сборка (.sb, .csv, .txt, .pdf, .json, .xml)"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{order.assemblyFileData ? 'Заменить Сборку' : '+ Файл Сборка'}</span>
                      <input
                        type="file"
                        accept=".sb,.csv,.tsv,.txt,.pdf,.json,.xml,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAssemblyUploadForOrder(order, file);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {/* Launch / Ready Button */}
                    {!order.isReadyForProduction ? (
                      <button
                        onClick={(e) => handleLaunchToProduction(order, e)}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Готов к началу</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order);
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <span>Открыть карту</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Additional Works Collapsible Section */}
                {settings?.showAdditionalWorksOnUpload !== false && (
                  <div className="pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setExpandedWorksOrderId(isWorksExpanded ? null : order.id)}
                      className="text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5 text-blue-600" />
                      <span>Дополнительные производственные работы</span>
                      {(works.countertopCutting || works.wallPanelCutting || works.barCutting || works.plinthCutting) && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                          Заполнено
                        </span>
                      )}
                      {isWorksExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isWorksExpanded && (
                      <div className="mt-3 p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 animate-fade-in text-xs">
                        {/* Work 1: Countertop */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`ct-${order.id}`}
                              checked={!!works.countertopCutting}
                              onChange={(e) => handleUpdateAdditionalWorks(order, { countertopCutting: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300"
                            />
                            <label htmlFor={`ct-${order.id}`} className="font-bold text-slate-900 cursor-pointer">
                              1. Распил столешницы
                            </label>
                          </div>

                          {works.countertopCutting && (
                            <div className="pl-6 flex flex-wrap items-center gap-4 text-slate-700">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!works.countertopEdging}
                                  onChange={(e) => handleUpdateAdditionalWorks(order, { countertopEdging: e.target.checked })}
                                  className="w-3.5 h-3.5 text-blue-600 rounded"
                                />
                                <span>Кромление столешницы</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!works.countertopRadius}
                                  onChange={(e) => handleUpdateAdditionalWorks(order, { countertopRadius: e.target.checked })}
                                  className="w-3.5 h-3.5 text-blue-600 rounded"
                                />
                                <span>Радиус (скругление)</span>
                              </label>

                              <input
                                type="text"
                                placeholder="Примечание к столешнице..."
                                value={works.countertopNotes || ''}
                                onChange={(e) => handleUpdateAdditionalWorks(order, { countertopNotes: e.target.value })}
                                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium min-w-[200px]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Work 2: Wall Panel */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`wp-${order.id}`}
                              checked={!!works.wallPanelCutting}
                              onChange={(e) => handleUpdateAdditionalWorks(order, { wallPanelCutting: e.target.checked })}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300"
                            />
                            <label htmlFor={`wp-${order.id}`} className="font-bold text-slate-900 cursor-pointer">
                              2. Распил стеновой панели
                            </label>
                          </div>

                          {works.wallPanelCutting && (
                            <div className="pl-6 flex flex-wrap items-center gap-4 text-slate-700">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!works.wallPanelEdging}
                                  onChange={(e) => handleUpdateAdditionalWorks(order, { wallPanelEdging: e.target.checked })}
                                  className="w-3.5 h-3.5 text-blue-600 rounded"
                                />
                                <span>Кромление стеновой панели</span>
                              </label>

                              <input
                                type="text"
                                placeholder="Примечание к стеновой панели..."
                                value={works.wallPanelNotes || ''}
                                onChange={(e) => handleUpdateAdditionalWorks(order, { wallPanelNotes: e.target.value })}
                                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium min-w-[200px]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Work 3 & 4: Pipe Bar & Plinth */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Pipe Bar */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`bar-${order.id}`}
                                checked={!!works.barCutting}
                                onChange={(e) => handleUpdateAdditionalWorks(order, { barCutting: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300"
                              />
                              <label htmlFor={`bar-${order.id}`} className="font-bold text-slate-900 cursor-pointer">
                                3. Нарезка штанги (труба)
                              </label>
                            </div>

                            {works.barCutting && (
                              <div className="pl-6 flex items-center gap-2">
                                <span className="text-slate-500">Количество:</span>
                                <input
                                  type="number"
                                  placeholder="шт."
                                  value={works.barCount || 1}
                                  onChange={(e) => handleUpdateAdditionalWorks(order, { barCount: Number(e.target.value) })}
                                  className="w-20 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold"
                                />
                                <span>шт.</span>
                              </div>
                            )}
                          </div>

                          {/* Plinth */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`pl-${order.id}`}
                                checked={!!works.plinthCutting}
                                onChange={(e) => handleUpdateAdditionalWorks(order, { plinthCutting: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300"
                              />
                              <label htmlFor={`pl-${order.id}`} className="font-bold text-slate-900 cursor-pointer">
                                4. Нарезка цоколя
                              </label>
                            </div>

                            {works.plinthCutting && (
                              <div className="pl-6 flex items-center gap-2">
                                <span className="text-slate-500">Длина:</span>
                                <input
                                  type="number"
                                  placeholder="м."
                                  value={works.plinthLength || 1}
                                  onChange={(e) => handleUpdateAdditionalWorks(order, { plinthLength: Number(e.target.value) })}
                                  className="w-20 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold"
                                />
                                <span>м.п.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  )}

      {/* Modal: Confirmation for moving an already started stage task */}
      {moveStartedTaskConfirmation && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200/90 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Внимание: задача в работе</div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  Задача уже в процессе выполнения
                </h3>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-amber-950 space-y-2.5 leading-relaxed">
              <p>
                По заказу <strong className="font-mono font-black text-slate-900">№{moveStartedTaskConfirmation.orderNumber}</strong> на участке <strong className="text-slate-900">«{moveStartedTaskConfirmation.stageName}»</strong> уже начато выполнение сотрудниками в цехе (зафиксированы логи работы или отсканированы детали).
              </p>
              <div className="pt-2 border-t border-amber-200/70 flex flex-col gap-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Текущая дата:</span>
                  <span className="font-bold text-slate-900">{moveStartedTaskConfirmation.currentDateStr || 'Не указана'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Новая дата:</span>
                  <span className="font-bold text-blue-700">{moveStartedTaskConfirmation.targetDateStr || 'Снять с плана'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setMoveStartedTaskConfirmation(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Оставить без изменений
              </button>
              <button
                onClick={() => {
                  const { orderId, stageId, targetDateStr } = moveStartedTaskConfirmation;
                  setMoveStartedTaskConfirmation(null);
                  executeAssignStageTaskToDate(orderId, stageId, targetDateStr);
                }}
                className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs shadow-md shadow-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Все равно переместить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Launched Order Confirmation */}
      {launchedModalOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Готов к началу</div>
                  <h3 className="text-xl font-black text-slate-900">Заказ №{launchedModalOrder.order.orderNumber} запущен!</h3>
                </div>
              </div>
              <button 
                onClick={() => setLaunchedModalOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 mb-6 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Клиент / Проект:</span>
                <span className="font-bold text-slate-900">{launchedModalOrder.order.clientName} ({launchedModalOrder.order.projectName})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Планируемый день распила:</span>
                <span className="font-bold text-blue-600">{launchedModalOrder.plannedDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Стартовый участок:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Участок раскроя (Распил)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Объем работ:</span>
                <span className="font-bold text-slate-900">
                  {launchedModalOrder.order.totalAreaM2 || 0} м² / {launchedModalOrder.order.totalEdgeM || 0} п.м. / {launchedModalOrder.order.partsCount || 0} дет.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setLaunchedModalOrder(null)}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Остаться в планировании
              </button>
              <button
                onClick={() => {
                  const targetOrder = launchedModalOrder.order;
                  setLaunchedModalOrder(null);
                  if (onSelectOrder) onSelectOrder(targetOrder);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Открыть карту заказа</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Birka Summary & Details */}
      {viewingBirkaModalOrder && viewingBirkaModalOrder.birkaData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-slate-50/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Сводка технологической карты</div>
                  <h3 className="text-lg font-black text-slate-900">Заказ №{viewingBirkaModalOrder.orderNumber} — Файл: {viewingBirkaModalOrder.birkaData.fileName}</h3>
                </div>
              </div>

              <button 
                onClick={() => setViewingBirkaModalOrder(null)}
                className="p-2 rounded-2xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Площадь раскроя</div>
                  <div className="text-base font-black text-slate-900">{viewingBirkaModalOrder.totalAreaM2 || 0} м²</div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Метраж кромки ПВХ</div>
                  <div className="text-base font-black text-slate-900">{viewingBirkaModalOrder.totalEdgeM || 0} п.м.</div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Всего деталей</div>
                  <div className="text-base font-black text-slate-900">{viewingBirkaModalOrder.partsCount || 0} шт.</div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Загружен</div>
                  <div className="text-xs font-bold text-slate-700 mt-1">{viewingBirkaModalOrder.birkaData.uploadedAt || 'Ранее'}</div>
                </div>
              </div>

              {/* Material Groups Breakdown */}
              {viewingBirkaModalOrder.birkaData.materialGroups && viewingBirkaModalOrder.birkaData.materialGroups.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-600" />
                    Расход материала и расчет плитного материала
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingBirkaModalOrder.birkaData.materialGroups.map((mg, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{mg.materialName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Деталей: {mg.totalQuantity} шт. • Площадь: {mg.totalAreaM2} м²
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs">
                          ~{mg.estimatedSheets || 1} шт. листов
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edges Breakdown */}
              {viewingBirkaModalOrder.birkaData.allEdges && viewingBirkaModalOrder.birkaData.allEdges.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Сводка по кромке ПВХ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {viewingBirkaModalOrder.birkaData.allEdges.map((ed, idx) => (
                      <div key={idx} className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200/80 flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-900 truncate pr-2">{ed.name}</span>
                        <span className="font-black text-purple-700 shrink-0">{ed.totalMeters} п.м. ({ed.count} шт)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Details List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Полный список деталей из бирки ({viewingBirkaModalOrder.birkaData.details.length} шт)
                  </h4>
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Поиск по № детали, наименованию..."
                      value={birkaSearchQuery}
                      onChange={(e) => setBirkaSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px] sticky top-0 bg-slate-50 z-10">
                        <tr>
                          <th className="px-4 py-2.5">№ Детали</th>
                          <th className="px-4 py-2.5">Наименование</th>
                          <th className="px-4 py-2.5">Размеры (мм)</th>
                          <th className="px-4 py-2.5">Материал</th>
                          <th className="px-4 py-2.5 text-center">Кол-во</th>
                          <th className="px-4 py-2.5">Кромка</th>
                          <th className="px-4 py-2.5">Примечание</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {consolidateDetails(viewingBirkaModalOrder.birkaData.details)
                          .filter(d => 
                            d.labelNumber.toLowerCase().includes(birkaSearchQuery.toLowerCase()) ||
                            d.name.toLowerCase().includes(birkaSearchQuery.toLowerCase()) ||
                            (d.notes && d.notes.toLowerCase().includes(birkaSearchQuery.toLowerCase()))
                          )
                          .map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-mono font-black text-slate-900">{item.labelNumber}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-900">{item.name}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{item.length} × {item.width} × {item.thickness}</td>
                              <td className="px-4 py-2.5 text-slate-600">{item.material}</td>
                              <td className="px-4 py-2.5 text-center font-bold text-slate-900">{item.quantity} шт</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">
                                {[item.edgeL1, item.edgeL2, item.edgeW1, item.edgeW2].filter(Boolean).join(' / ') || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">{item.notes || '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50 rounded-b-3xl">
              <button
                onClick={() => setViewingBirkaModalOrder(null)}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Закрыть сводку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hardware Specification Modal */}
      {viewingHardwareModalOrder && (
        <HardwareSpecificationModal
          order={viewingHardwareModalOrder}
          isOpen={!!viewingHardwareModalOrder}
          onClose={() => setViewingHardwareModalOrder(null)}
          onUpdateOrder={(updated) => {
            onUpdateOrder(updated);
            setViewingHardwareModalOrder(updated);
          }}
        />
      )}

      {/* Assembly File Modal */}
      {viewingAssemblyModalOrder && (
        <AssemblyFileModal
          order={viewingAssemblyModalOrder}
          isOpen={!!viewingAssemblyModalOrder}
          onClose={() => setViewingAssemblyModalOrder(null)}
          onUpdateOrder={(updated) => {
            onUpdateOrder(updated);
            setViewingAssemblyModalOrder(updated);
          }}
        />
      )}
    </div>
  );
};
