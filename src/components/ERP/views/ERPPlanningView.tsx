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
  List
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPEmployee, ERPCompanySettings, AdditionalWorks } from '../types';
import { formatDeadlineDate } from '../utils';
import { parseBirkaFile } from '../utils/birkaParser';
import { parseHardwareFile } from '../utils/hardwareParser';
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
  const [statusFilter, setStatusFilter] = useState<'queue' | 'ready' | 'all'>('queue');
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

  // Time horizon range for calendar: '1week' (7 days), '2weeks' (14 days), 'month' (30 days)
  const [periodRange, setPeriodRange] = useState<'1week' | '2weeks' | 'month'>('1week');

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
    let numDays = 7;
    if (periodRange === '2weeks') numDays = 14;
    if (periodRange === 'month') numDays = 30;

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
    if (periodRange === '1week') newDate.setDate(newDate.getDate() - 7);
    else if (periodRange === '2weeks') newDate.setDate(newDate.getDate() - 14);
    else if (periodRange === 'month') newDate.setDate(newDate.getDate() - 30);
    setStartDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(startDate);
    if (periodRange === '1week') newDate.setDate(newDate.getDate() + 7);
    else if (periodRange === '2weeks') newDate.setDate(newDate.getDate() + 14);
    else if (periodRange === 'month') newDate.setDate(newDate.getDate() + 30);
    setStartDate(newDate);
  };

  const handleTodayPeriod = () => {
    const today = new Date();
    if (periodRange === 'month') {
      today.setDate(1);
      today.setHours(0, 0, 0, 0);
      setStartDate(today);
    } else {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      setStartDate(monday);
    }
  };

  const STAGE_CONFIGS: { id: ProductionStageId; name: string; shortName: string; icon: any; color: string; bg: string }[] = [
    { id: 'cutting', name: 'Распил (ЛДСП/МДФ)', shortName: 'Распил', icon: Scissors, color: 'text-blue-600', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'edging', name: 'Кромкооблицовка', shortName: 'Кромка', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'cnc', name: 'Присадка / ЧПУ', shortName: 'Присадка', icon: Factory, color: 'text-purple-600', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'kitting', name: 'Комплектовка', shortName: 'Фурнитура', icon: Box, color: 'text-cyan-600', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { id: 'assembly', name: 'Сборка корпусов', shortName: 'Сборка', icon: Wrench, color: 'text-teal-600', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'packing', name: 'Упаковка мест', shortName: 'Упаковка', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  ];

  const handleAssignStageTaskToDate = (orderId: string, stageId: ProductionStageId, dateStr: string | null) => {
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

    const updatedOrder: ProductionOrder = {
      ...order,
      stagePlannedDates: updatedStageDates,
      plannedCuttingDate: plannedCuttingDate || undefined
    };

    onUpdateOrder(updatedOrder);
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
      const textContent = await file.text();
      const updatedOrder: ProductionOrder = {
        ...order,
        assemblyFileData: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
          fileContent: textContent.substring(0, 100000)
        }
      };

      onUpdateOrder(updatedOrder);
      alert(`Файл Сборка "${file.name}" прикреплен к заказу ${order.orderNumber}`);
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
      currentStage: firstProdStage // Always starts at cutting stage when launched
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

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName.toLowerCase().includes(search.toLowerCase()) ||
      o.projectName.toLowerCase().includes(search.toLowerCase());
    
    const matchesPriority = selectedPriority === 'all' || o.priority === selectedPriority;

    let matchesStatus = true;
    if (statusFilter === 'queue') {
      matchesStatus = !o.isReadyForProduction && o.status !== 'completed';
    } else if (statusFilter === 'ready') {
      matchesStatus = !!o.isReadyForProduction;
    }

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const queueOrdersCount = orders.filter(o => !o.isReadyForProduction && o.status !== 'completed').length;
  const readyOrdersCount = orders.filter(o => !!o.isReadyForProduction).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" /> Планирование производства & спецификации
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Формирование плана и подгрузка файлов бирок
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Прикрепите спецификацию бирок (`.bir`), назначьте день распила, заполните доп. работы и нажмите «Готов к началу».
          </p>
        </div>

        {/* View Mode Switcher & Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-indigo-50/80 rounded-2xl border border-indigo-200 shrink-0">
            <button
              onClick={() => setPlanningViewTab('calendar')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                planningViewTab === 'calendar' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-900 hover:text-indigo-950'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>📅 Календарь задач (Drag & Drop)</span>
            </button>
            <button
              onClick={() => setPlanningViewTab('list')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                planningViewTab === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-900 hover:text-indigo-950'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>📋 Реестр и подгрузка файлов</span>
            </button>
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
            <button
              onClick={() => setStatusFilter('queue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'queue' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Очередь</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${statusFilter === 'queue' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {queueOrdersCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'ready' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Запущены</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${statusFilter === 'ready' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {readyOrdersCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Все
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Calendar View vs List View */}
      {planningViewTab === 'calendar' ? (
        <div className="space-y-5">
          {/* Calendar Navigation & Period Controls Bar */}
          <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Date Navigation */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={handlePrevPeriod}
                    className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
                    title="Предыдущий период"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleTodayPeriod}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Сегодня</span>
                  </button>
                  <button
                    onClick={handleNextPeriod}
                    className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer"
                    title="Следующий период"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xs font-black text-slate-900 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  {timelineDays[0].dayNum} {timelineDays[0].monthName} – {timelineDays[timelineDays.length - 1].dayNum} {timelineDays[timelineDays.length - 1].monthName} {timelineDays[timelineDays.length - 1].dateObj.getFullYear()}
                </span>
              </div>

              {/* Period Horizon selector & Grid mode switch */}
              <div className="flex items-center gap-2 flex-wrap">
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
                    Неделя (7 дн)
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
                    2 недели (14 дн)
                  </button>
                  <button
                    onClick={() => {
                      setPeriodRange('month');
                      handleTodayPeriod();
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      periodRange === 'month' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Месяц (30 дн)
                  </button>
                </div>

                {/* Rows Display Mode: Stages vs Orders */}
                <div className="flex items-center p-1 bg-indigo-50/90 rounded-2xl border border-indigo-200 text-xs font-bold">
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

          {/* Queue Drawer: Collapsible Section for Unscheduled Orders & Stage Tasks */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div
              onClick={() => setIsQueueDrawerOpen(!isQueueDrawerOpen)}
              className="p-4 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-blue-100 text-blue-700">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>📦 Очередь нераспределенных заказов и задач</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-xs font-mono font-bold">
                      {filteredOrders.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Кликните чтобы развернуть заказ и перетащить задачи участков в ячейки календаря
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-48 md:w-64" onClick={(e) => e.stopPropagation()}>
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Фильтр в очереди..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>

                <button className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors">
                  {isQueueDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isQueueDrawerOpen && (
              <div className="p-4 max-h-[300px] overflow-y-auto space-y-2.5 bg-slate-50/30">
                {filteredOrders.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    Нет заказов в очереди
                  </div>
                ) : (
                  filteredOrders.map(order => {
                    const isExpanded = !!expandedOrdersMap[order.id];
                    const stageDates = order.stagePlannedDates || {};

                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-2">
                        <div
                          onClick={() => toggleOrderExpanded(order.id)}
                          className="flex items-center justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                              №{order.orderNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {order.clientName || order.projectName}
                            </span>
                            {order.priority === 'urgent' && (
                              <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black shrink-0">
                                🚨 Срочно
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-medium text-slate-500">
                              {order.partsCount || 0} дет.
                            </span>
                            <button
                              onClick={(e) => handleLaunchToProduction(order, e)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Запустить</span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-stage tasks when expanded */}
                        {isExpanded && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
                            {STAGE_CONFIGS.map(st => {
                              const StIcon = st.icon;
                              const assignedDate = stageDates[st.id] || (st.id === 'cutting' ? order.plannedCuttingDate : null);

                              return (
                                <div
                                  key={st.id}
                                  draggable={true}
                                  onDragStart={() => setDraggedStageTask({ orderId: order.id, stageId: st.id })}
                                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-1 transition-all shadow-2xs ${
                                    assignedDate 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                                      : 'bg-white border-dashed border-slate-300 text-slate-700 hover:border-blue-400 cursor-grab active:cursor-grabbing'
                                  }`}
                                  title={assignedDate ? `Назначена на ${assignedDate}` : 'Перетащите в календарь'}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <StIcon className={`w-3.5 h-3.5 shrink-0 ${st.color}`} />
                                    <span className="truncate text-[11px]">{st.shortName}</span>
                                  </div>

                                  {assignedDate ? (
                                    <span className="text-[10px] font-mono font-bold text-emerald-700 shrink-0">
                                      {assignedDate.split('-').slice(1).join('.')}
                                    </span>
                                  ) : (
                                    <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
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
            )}
          </div>

          {/* Main Planner Matrix Grid (Table with Sticky Left Column) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Matrix Header Row: Dates across the top */}
              <div className="flex border-b border-slate-200 bg-slate-100/90 sticky top-0 z-20 text-xs font-black text-slate-700">
                <div className="w-64 p-3 shrink-0 border-r border-slate-200 flex items-center gap-2 bg-slate-100">
                  <Factory className="w-4 h-4 text-blue-600" />
                  <span>{gridRowsMode === 'stages' ? 'Участки производства' : 'Заказы и этапы'}</span>
                </div>

                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(110px, 1fr))` }}>
                  {timelineDays.map(day => (
                    <div
                      key={day.dateStr}
                      className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 flex flex-col items-center justify-center gap-0.5 ${
                        day.isToday 
                          ? 'bg-blue-600 text-white font-black' 
                          : day.isWeekend 
                            ? 'bg-slate-200/60 text-slate-800' 
                            : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <span>{day.dayName}</span>
                        <span className="font-mono font-extrabold">{day.dayNum}</span>
                        <span className="text-[10px] opacity-80">{day.monthName}</span>
                      </div>
                      {day.isToday && (
                        <span className="text-[9px] uppercase font-black tracking-wider bg-white/20 px-1.5 rounded">
                          Сегодня
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Rows Body */}
              {gridRowsMode === 'stages' ? (
                /* STAGES AS ROWS */
                <div className="divide-y divide-slate-200">
                  {STAGE_CONFIGS.map(st => {
                    const StIcon = st.icon;

                    return (
                      <div key={st.id} className="flex min-h-[90px] hover:bg-slate-50/50 transition-colors">
                        {/* Row Header: Stage name & icon */}
                        <div className="w-64 p-3 shrink-0 border-r border-slate-200 flex flex-col justify-center bg-slate-50/80">
                          <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                            <div className={`p-1.5 rounded-xl border ${st.bg}`}>
                              <StIcon className={`w-4 h-4 ${st.color}`} />
                            </div>
                            <span>{st.name}</span>
                          </div>
                        </div>

                        {/* Day Cells for this stage */}
                        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(110px, 1fr))` }}>
                          {timelineDays.map(day => {
                            // Find tasks assigned to this stage on this day
                            const tasksInCell: ProductionOrder[] = [];
                            orders.forEach(o => {
                              const sDates = o.stagePlannedDates || {};
                              const assigned = sDates[st.id] || (st.id === 'cutting' ? o.plannedCuttingDate : null);
                              if (assigned === day.dateStr) {
                                tasksInCell.push(o);
                              }
                            });

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
                                className={`p-1.5 border-r border-slate-200 last:border-r-0 space-y-1 overflow-y-auto max-h-[160px] transition-colors ${
                                  day.isToday ? 'bg-blue-50/20' : day.isWeekend ? 'bg-slate-50/50' : ''
                                }`}
                              >
                                {tasksInCell.map(order => (
                                  <div
                                    key={order.id}
                                    draggable={true}
                                    onDragStart={() => setDraggedStageTask({ orderId: order.id, stageId: st.id })}
                                    className={`px-2 py-1.5 rounded-xl border bg-white shadow-2xs hover:shadow-md transition-all text-xs font-bold flex items-center justify-between gap-1 group cursor-grab active:cursor-grabbing ${
                                      order.priority === 'urgent' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="font-mono font-black text-[11px] text-slate-900 shrink-0">
                                        №{order.orderNumber}
                                      </span>
                                      <span className="text-[10px] text-slate-600 truncate max-w-[60px]">
                                        {order.clientName || order.projectName}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => handleAssignStageTaskToDate(order.id, st.id, null)}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                      title="Убрать из этой даты"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ORDERS AS ROWS */
                <div className="divide-y divide-slate-200">
                  {filteredOrders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      Заказов не найдено
                    </div>
                  ) : (
                    filteredOrders.map(order => {
                      const isExpanded = !!expandedOrdersMap[order.id];
                      const stageDates = order.stagePlannedDates || {};

                      return (
                        <div key={order.id} className="divide-y divide-slate-100">
                          {/* Order Parent Row */}
                          <div className="flex min-h-[48px] bg-slate-50/90 font-bold text-xs items-center">
                            <div
                              onClick={() => toggleOrderExpanded(order.id)}
                              className="w-64 p-3 shrink-0 border-r border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                                <span className="font-mono font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  №{order.orderNumber}
                                </span>
                                <span className="truncate text-slate-800 text-[11px]">
                                  {order.clientName || order.projectName}
                                </span>
                              </div>
                            </div>

                            {/* Timeline row summary for this order */}
                            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(110px, 1fr))` }}>
                              {timelineDays.map(day => {
                                // Find all stage tasks of this order on this day
                                const assignedStages = STAGE_CONFIGS.filter(st => {
                                  const assigned = stageDates[st.id] || (st.id === 'cutting' ? order.plannedCuttingDate : null);
                                  return assigned === day.dateStr;
                                });

                                return (
                                  <div key={day.dateStr} className="p-1 border-r border-slate-200 last:border-r-0 flex flex-wrap gap-1 items-center justify-center">
                                    {assignedStages.map(st => {
                                      const StIcon = st.icon;
                                      return (
                                        <span key={st.id} className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black flex items-center gap-0.5 ${st.bg}`} title={st.name}>
                                          <StIcon className="w-2.5 h-2.5" />
                                          <span>{st.shortName}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Expanded Order Stage Sub-Rows */}
                          {isExpanded && STAGE_CONFIGS.map(st => {
                            const StIcon = st.icon;
                            const assignedDate = stageDates[st.id] || (st.id === 'cutting' ? order.plannedCuttingDate : null);

                            return (
                              <div key={st.id} className="flex min-h-[38px] bg-white text-xs hover:bg-slate-50/40">
                                <div className="w-64 pl-8 pr-3 py-2 shrink-0 border-r border-slate-200 flex items-center justify-between text-[11px] text-slate-700">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <StIcon className={`w-3.5 h-3.5 ${st.color}`} />
                                    <span>{st.name}</span>
                                  </span>
                                </div>

                                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timelineDays.length}, minmax(110px, 1fr))` }}>
                                  {timelineDays.map(day => {
                                    const isAssignedToThisDay = assignedDate === day.dateStr;

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
                                        className={`p-1 border-r border-slate-200 last:border-r-0 flex items-center justify-center transition-colors ${
                                          isAssignedToThisDay ? 'bg-emerald-50/80' : ''
                                        }`}
                                      >
                                        {isAssignedToThisDay && (
                                          <div
                                            draggable={true}
                                            onDragStart={() => setDraggedStageTask({ orderId: order.id, stageId: st.id })}
                                            className={`px-2 py-1 rounded-lg border text-[10px] font-black flex items-center justify-between gap-1 w-full bg-white border-emerald-300 text-emerald-900 shadow-2xs group cursor-grab active:cursor-grabbing`}
                                          >
                                            <span className="truncate">№{order.orderNumber}</span>
                                            <button
                                              onClick={() => handleAssignStageTaskToDate(order.id, st.id, null)}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
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
                            onUpdateOrder({
                              ...order,
                              plannedCuttingDate: e.target.value
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
                        {viewingBirkaModalOrder.birkaData.details
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
