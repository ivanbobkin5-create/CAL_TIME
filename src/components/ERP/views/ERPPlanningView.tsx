import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPEmployee, ERPCompanySettings, AdditionalWorks } from '../types';
import { formatDeadlineDate } from '../utils';
import { parseBirkaFile } from '../utils/birkaParser';

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
  const [launchedModalOrder, setLaunchedModalOrder] = useState<{ order: ProductionOrder; plannedDate: string } | null>(null);
  const [birkaSearchQuery, setBirkaSearchQuery] = useState('');

  const handleBirkaUploadForOrder = async (order: ProductionOrder, file: File) => {
    if (order.birkaData) {
      if (!window.confirm(`К заказу ${order.orderNumber} уже прикреплен файл "${order.birkaData.fileName}". Перезаписать спецификацию бирок?`)) {
        return;
      }
    }

    setUploadingOrderId(order.id);
    try {
      const parseRes = await parseBirkaFile(file);
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

        {/* Quick Filter Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setStatusFilter('queue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'queue' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Очередь запуска</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${statusFilter === 'queue' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {queueOrdersCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'ready' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Запущены в цех</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${statusFilter === 'ready' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {readyOrdersCount}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Все
          </button>
        </div>
      </div>

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
                className={`bg-white rounded-3xl p-5 md:p-6 border transition-all shadow-sm space-y-4 ${
                  order.isReadyForProduction 
                    ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/20 to-white' 
                    : 'border-slate-200/90 hover:border-blue-300'
                }`}
              >
                {/* Top Row: Order Number, Client Name & Status Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                    {/* Order Number Badge */}
                    <div className="font-mono font-black text-slate-900 text-xs sm:text-sm bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
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

                  {/* Badges: Priority & Planning Stage */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shrink-0 ${priorityStyles}`}>
                      {order.priority === 'urgent' ? 'Срочно' : order.priority === 'high' ? 'Высокий' : 'Обычный'}
                    </span>

                    {order.isReadyForProduction ? (
                      <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Запущен в цех
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        В очереди планирования
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Metrics (Left) & Actions (Right) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Specification Metrics & Birka status */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400">Площадь:</span>
                      <strong className="text-slate-900 font-bold">{order.totalAreaM2 || 0} м²</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400">Кромка:</span>
                      <strong className="text-slate-900 font-bold">{order.totalEdgeM || 0} п.м.</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="text-slate-400">Деталей:</span>
                      <strong className="text-slate-900 font-bold">{order.partsCount || 0} шт.</strong>
                    </div>

                    {order.birkaData ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingBirkaModalOrder(order);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer shadow-xs max-w-[260px] truncate"
                        title="Нажмите, чтобы просмотреть сводку бирок, детали и расход материалов"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Бирки: {order.birkaData.fileName}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/90">
                        <Upload className="w-3.5 h-3.5 text-amber-600" />
                        <span>Бирки не прикреплены</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Date Picker, Upload & Ready Button */}
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-between lg:justify-end shrink-0 pt-2 lg:pt-0">
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
                    <label className="px-3.5 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs font-bold text-blue-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0">
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

                    {/* Launch / Ready Button */}
                    {!order.isReadyForProduction ? (
                      <button
                        onClick={(e) => handleLaunchToProduction(order, e)}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
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
                        className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
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
    </div>
  );
};
