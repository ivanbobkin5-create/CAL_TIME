import React, { useState } from 'react';
import { 
  Factory, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Layers, 
  Scissors, 
  Wrench, 
  CheckCircle2, 
  Package, 
  AlertTriangle, 
  FileText, 
  Printer, 
  User, 
  X,
  Play,
  Check,
  ExternalLink,
  ArrowLeft,
  Calendar,
  Box,
  Flame,
  UserCheck,
  Camera,
  Sparkles,
  Truck
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPEmployee, ERPCompanySettings } from '../types';
import { formatDeadlineDate, getNextRequiredStage } from '../utils';
import { ERPOrderDetailsModal } from './ERPOrderDetailsModal';
import { ERPDispatchView } from './ERPDispatchView';
import { MobileCameraScannerModal } from '../components/MobileCameraScannerModal';

interface ERPProductionViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  settings?: ERPCompanySettings;
  companyName?: string;
  companyId?: string;
  currentUser?: any;
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
  onUpdateOrder?: (updatedOrder: ProductionOrder) => void;
  onSelectOrder: (order: ProductionOrder, stageId?: ProductionStageId) => void;
}

export const ERPProductionView: React.FC<ERPProductionViewProps> = ({
  orders,
  employees,
  settings,
  companyName,
  companyId,
  currentUser,
  onUpdateOrderStatus,
  onUpdateOrder,
  onSelectOrder
}) => {
  const [search, setSearch] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<ProductionStageId | null>(null);
  const [stageTabFilter, setStageTabFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow' | 'future'>('all');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<ProductionOrder | null>(null);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState<boolean>(false);
  const [cameraScanFeedback, setCameraScanFeedback] = useState<string | null>(null);

  const allStages: { id: ProductionStageId; name: string; icon: any; color: string; badgeColor: string; bgGradient: string }[] = [
    { id: 'cutting', name: 'Участок раскроя (Распил)', icon: Scissors, color: 'text-blue-600 border-blue-200 bg-blue-50', badgeColor: 'bg-blue-600 text-white', bgGradient: 'from-blue-50/50 to-white' },
    { id: 'edging', name: 'Участок кромкооблицовки', icon: Layers, color: 'text-indigo-600 border-indigo-200 bg-indigo-50', badgeColor: 'bg-indigo-600 text-white', bgGradient: 'from-indigo-50/50 to-white' },
    { id: 'cnc', name: 'Участок присадки / ЧПУ', icon: Factory, color: 'text-purple-600 border-purple-200 bg-purple-50', badgeColor: 'bg-purple-600 text-white', bgGradient: 'from-purple-50/50 to-white' },
    { id: 'facades', name: 'Фасадный участок / Покраска', icon: Wrench, color: 'text-amber-600 border-amber-200 bg-amber-50', badgeColor: 'bg-amber-600 text-white', bgGradient: 'from-amber-50/50 to-white' },
    { id: 'assembly', name: 'Участок сборки', icon: Wrench, color: 'text-teal-600 border-teal-200 bg-teal-50', badgeColor: 'bg-teal-600 text-white', bgGradient: 'from-teal-50/50 to-white' },
    { id: 'kitting', name: 'Участок комплектовки', icon: Box, color: 'text-cyan-600 border-cyan-200 bg-cyan-50', badgeColor: 'bg-cyan-600 text-white', bgGradient: 'from-cyan-50/50 to-white' },
    { id: 'qc', name: 'Контроль ОТК', icon: CheckCircle2, color: 'text-emerald-600 border-emerald-200 bg-emerald-50', badgeColor: 'bg-emerald-600 text-white', bgGradient: 'from-emerald-50/50 to-white' },
    { id: 'packing', name: 'Упаковка и склад', icon: Package, color: 'text-orange-600 border-orange-200 bg-orange-50', badgeColor: 'bg-orange-600 text-white', bgGradient: 'from-orange-50/50 to-white' },
    { id: 'shipping', name: 'Участок отгрузки и доставки', icon: Truck, color: 'text-emerald-700 border-emerald-200 bg-emerald-50', badgeColor: 'bg-emerald-700 text-white', bgGradient: 'from-emerald-50/50 to-white' }
  ];

  const enabledStageIds = settings?.enabledStages || allStages.map(s => s.id);
  const stages = (settings?.enabledStages && settings.enabledStages.length > 0)
    ? settings.enabledStages
        .map(id => allStages.find(s => s.id === id))
        .filter((s): s is typeof allStages[0] => !!s)
    : allStages.filter(s => enabledStageIds.includes(s.id));

  // Date categorization helpers
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const getOrderDateCategory = (order: ProductionOrder): 'overdue' | 'today' | 'tomorrow' | 'future' => {
    const planned = order.plannedCuttingDate || order.plannedStartDate;
    if (!planned) return 'today';
    if (planned < todayStr) return 'overdue';
    if (planned === todayStr) return 'today';
    if (planned === tomorrowStr) return 'tomorrow';
    return 'future';
  };

  // Filter orders in production (must be ready or in progress)
  const productionOrders = orders.filter(o => 
    (o.isReadyForProduction || o.status === 'in_progress' || o.currentStage !== 'queue') &&
    (o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
     o.clientName.toLowerCase().includes(search.toLowerCase()) ||
     o.projectName.toLowerCase().includes(search.toLowerCase()))
  );

  // Keep selectedOrderDetails in sync with polled/updated parent orders
  React.useEffect(() => {
    if (selectedOrderDetails) {
      const updated = orders.find(o => o.id === selectedOrderDetails.id);
      if (updated && (
        updated.currentStage !== selectedOrderDetails.currentStage ||
        updated.status !== selectedOrderDetails.status ||
        (updated.birkaData?.fileHash || updated.birkaData?.uploadedAt || '') !== (selectedOrderDetails.birkaData?.fileHash || selectedOrderDetails.birkaData?.uploadedAt || '') ||
        JSON.stringify(updated.stageScanningProgress) !== JSON.stringify(selectedOrderDetails.stageScanningProgress) ||
        (updated.packages || []).length !== (selectedOrderDetails.packages || []).length ||
        (updated.workLogs || []).length !== (selectedOrderDetails.workLogs || []).length
      )) {
        setSelectedOrderDetails(updated);
      }
    }
  }, [orders, selectedOrderDetails]);

  // Stage details view
  const activeStage = stages.find(s => s.id === selectedStageId);

  const handleCameraScanOrder = (scannedCode: string) => {
    let rawCode = scannedCode.trim().toLowerCase();
    if (rawCode.includes('/p/')) {
      rawCode = rawCode.split('/p/').pop()?.split('?')[0] || rawCode;
    } else if (rawCode.includes('/package/')) {
      rawCode = rawCode.split('/package/').pop()?.split('?')[0] || rawCode;
    } else if (rawCode.includes('/pkg/')) {
      rawCode = rawCode.split('/pkg/').pop()?.split('?')[0] || rawCode;
    } else if (rawCode.includes('/')) {
      rawCode = rawCode.split('/').pop()?.split('?')[0] || rawCode;
    }

    const cleanCode = rawCode.trim().toLowerCase();
    const foundOrder = orders.find(o => {
      if (o.id.toLowerCase() === cleanCode) return true;
      if (o.orderNumber.toLowerCase() === cleanCode) return true;
      if (o.orderNumber.toLowerCase().replace(/[^0-9a-zа-я]/g, '') === cleanCode.replace(/[^0-9a-zа-я]/g, '')) return true;
      if (cleanCode.includes(o.orderNumber.toLowerCase())) return true;
      if (o.orderNumber.toLowerCase().includes(cleanCode)) return true;
      if (o.packages && o.packages.some(p => 
        p.code?.toLowerCase() === cleanCode || 
        p.id?.toLowerCase() === cleanCode || 
        `pkg-${o.orderNumber}-${p.packageNumber}`.toLowerCase() === cleanCode ||
        `pkg-${o.orderNumber}-m${p.packageNumber}`.toLowerCase() === cleanCode
      )) return true;
      return false;
    });

    if (foundOrder) {
      setShowCameraScannerModal(false);
      onSelectOrder(foundOrder);
    } else {
      setCameraScanFeedback(`Заказ с кодом "${scannedCode}" не найден в системе`);
      setTimeout(() => setCameraScanFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Factory className="w-4 h-4" /> Производственные участки
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            {selectedStageId ? activeStage?.name : 'Панель оператора участков цеха'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {selectedStageId 
              ? 'Список заказов на участке с возможностью взятия в работу и распределения выработки'
              : 'Крупные карточки участков с раскладкой по просроченным, сегодняшним и будущим заказам'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCameraScannerModal(true)}
            className="md:hidden px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            title="Сканировать бирку или QR-код заказа камерой телефона"
          >
            <Camera className="w-4 h-4" />
            <span>Сканер камерой</span>
          </button>

          {selectedStageId && (
            <button
              onClick={() => setSelectedStageId(null)}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Все участки</span>
            </button>
          )}

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по номеру, клиенту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {cameraScanFeedback && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{cameraScanFeedback}</span>
        </div>
      )}

      {/* VIEW MODE 1: Large Department Cards Grid (When no stage selected) */}
      {!selectedStageId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const stageOrders = productionOrders.filter(o => o.currentStage === stage.id);

            const overdueOrders = stageOrders.filter(o => getOrderDateCategory(o) === 'overdue');
            const todayOrders = stageOrders.filter(o => getOrderDateCategory(o) === 'today');
            const tomorrowOrders = stageOrders.filter(o => getOrderDateCategory(o) === 'tomorrow');
            const futureOrders = stageOrders.filter(o => getOrderDateCategory(o) === 'future');

            const totalArea = stageOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);
            const totalParts = stageOrders.reduce((sum, o) => sum + (o.partsCount || 0), 0);

            return (
              <div
                key={stage.id}
                onClick={() => {
                  setSelectedStageId(stage.id);
                  setStageTabFilter('all');
                }}
                className={`bg-gradient-to-br ${stage.bgGradient} rounded-3xl p-6 border border-slate-200/90 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group space-y-5`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-bold ${stage.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black font-mono shadow-sm ${stage.badgeColor}`}>
                      {stageOrders.length} заказов
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                    {stage.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    Общий объем: <strong className="text-slate-800">{totalArea.toFixed(1)} м²</strong> ({totalParts} деталей)
                  </p>
                </div>

                {/* 4 Status Counters Tiles (Просрочено / На сегодня / На завтра / Будущие) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Overdue */}
                  <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    overdueOrders.length > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50/80 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3 h-3 text-red-500" /> Просрочено
                    </span>
                    <span className="text-xl font-black font-mono mt-1">
                      {overdueOrders.length}
                    </span>
                  </div>

                  {/* Today */}
                  <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    todayOrders.length > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50/80 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-500" /> На сегодня
                    </span>
                    <span className="text-xl font-black font-mono mt-1">
                      {todayOrders.length}
                    </span>
                  </div>

                  {/* Tomorrow */}
                  <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    tomorrowOrders.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50/80 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-500" /> На завтра
                    </span>
                    <span className="text-xl font-black font-mono mt-1">
                      {tomorrowOrders.length}
                    </span>
                  </div>

                  {/* Future */}
                  <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    futureOrders.length > 0 ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-50/80 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      ⏳ Будущие
                    </span>
                    <span className="text-xl font-black font-mono mt-1">
                      {futureOrders.length}
                    </span>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:underline">
                  <span>Перейти к заказам участка</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      ) : selectedStageId === 'shipping' ? (
        <ERPDispatchView 
          orders={orders} 
          employees={employees} 
          settings={settings}
          companyName={companyName}
          onUpdateOrder={onUpdateOrder || (() => {})}
          onSelectOrder={(order) => onSelectOrder(order, 'shipping')}
        />
      ) : (
        /* VIEW MODE 2: Selected Stage Orders List */
        <div className="space-y-4">
          {/* Stage Filter Tabs */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setStageTabFilter('all')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  stageTabFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Все заказы участка
              </button>
              <button
                onClick={() => setStageTabFilter('overdue')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  stageTabFilter === 'overdue' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <span>🚨 Просроченные</span>
              </button>
              <button
                onClick={() => setStageTabFilter('today')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  stageTabFilter === 'today' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>📅 На сегодня</span>
              </button>
              <button
                onClick={() => setStageTabFilter('tomorrow')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  stageTabFilter === 'tomorrow' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <span>🌅 На завтра</span>
              </button>
              <button
                onClick={() => setStageTabFilter('future')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  stageTabFilter === 'future' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ⏳ Будущие
              </button>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Участок: <strong className="text-slate-900 font-bold">{activeStage?.name}</strong>
            </div>
          </div>

          {/* Orders Cards List */}
          {(() => {
            const stageOrders = productionOrders.filter(o => {
              if (o.currentStage === selectedStageId) return true;
              
              // Заказы на комплектовку и упаковку доступны только когда заказ уже начал этап кромления (edging) и далее
              if (selectedStageId === 'kitting' || selectedStageId === 'packing') {
                const startedEdgingStages: ProductionStageId[] = ['edging', 'cnc', 'facades', 'assembly', 'kitting', 'qc', 'packing'];
                if (startedEdgingStages.includes(o.currentStage)) {
                  return true;
                }
              }
              return false;
            });
            const filteredByTab = stageOrders.filter(o => {
              if (stageTabFilter === 'all') return true;
              return getOrderDateCategory(o) === stageTabFilter;
            });

            if (filteredByTab.length === 0) {
              return (
                <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Заказы в выбранной категории отсутствуют</p>
                  <p className="text-xs text-slate-400 mt-1">Все задачи этого типа выполнены или нет новых поступлений</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredByTab.map((order) => {
                  const dateCat = getOrderDateCategory(order);
                  const dateBadgeStyles = {
                    overdue: 'bg-red-100 text-red-800 border-red-300',
                    today: 'bg-amber-100 text-amber-900 border-amber-300',
                    tomorrow: 'bg-blue-100 text-blue-800 border-blue-300',
                    future: 'bg-slate-100 text-slate-700 border-slate-300'
                  }[dateCat];

                  const dateCatText = {
                    overdue: '🚨 Просрочен',
                    today: '📅 На сегодня',
                    tomorrow: '🌅 На завтра',
                    future: '⏳ Будущие'
                  }[dateCat];

                  const works = order.additionalWorks;
                  const activeLogs = order.workLogs?.filter(l => l.stageId === selectedStageId) || [];

                  const clientNameClean = (order.clientName || '').trim();
                  const projectNameClean = (order.projectName || '').trim();
                  const isDuplicateName = projectNameClean.toLowerCase() === clientNameClean.toLowerCase() ||
                    (projectNameClean && clientNameClean.toLowerCase().includes(projectNameClean.toLowerCase())) ||
                    (clientNameClean && projectNameClean.toLowerCase().includes(clientNameClean.toLowerCase()));

                  return (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order, selectedStageId || order.currentStage)}
                      className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-blue-400 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
                    >
                      {/* Left: Info */}
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 shrink-0">
                            {order.orderNumber}
                          </span>

                          <a
                            href={order.bitrixUrl || (order.bitrixDealId ? `https://b24.ru/crm/deal/details/${order.bitrixDealId}/` : '#')}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
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
                            className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold text-[11px] shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                            title="Открыть сделку в Битрикс24"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>B24</span>
                          </a>

                          <span className="font-extrabold text-slate-900 text-sm max-w-[220px] sm:max-w-[360px] truncate" title={clientNameClean || 'Заказ без названия'}>
                            {clientNameClean || 'Заказ без названия'}
                          </span>

                          {!isDuplicateName && projectNameClean && (
                            <>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-600 font-semibold max-w-[200px] truncate" title={projectNameClean}>
                                {projectNameClean}
                              </span>
                            </>
                          )}
                          
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 ${dateBadgeStyles}`}>
                            {dateCatText} ({order.plannedCuttingDate || 'Не указана'})
                          </span>

                          {order.currentStage !== selectedStageId && (
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              <span>⚡ Онлайн-упаковка</span>
                            </span>
                          )}
                        </div>

                        {/* Additional Works Pills if present */}
                        {works && (works.countertopCutting || works.wallPanelCutting || works.barCutting || works.plinthCutting) && (
                          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-amber-800 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200">
                            <Box className="w-3.5 h-3.5 text-amber-600" />
                            <span>Доп. работы:</span>
                            {works.countertopCutting && <span> Столешница (распил{works.countertopEdging ? ', кромка' : ''}{works.countertopRadius ? ', радиус' : ''})</span>}
                            {works.wallPanelCutting && <span> Стеновая панель</span>}
                            {works.barCutting && <span> Штанга ({works.barCount || 1} шт.)</span>}
                            {works.plinthCutting && <span> Цоколь ({works.plinthLength || 1} м.)</span>}
                          </div>
                        )}

                        {/* Work logs output summary */}
                        {activeLogs.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>История смен:</span>
                            {activeLogs.map(l => (
                              <span key={l.id} className="font-bold text-slate-800">
                                {l.employeeName}: {l.scannedPartsCount} дет. ({l.scannedAreaM2.toFixed(1)} м²)
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                          <span>Площадь: <strong>{order.totalAreaM2} м²</strong></span>
                          <span>Деталей: <strong>{order.partsCount} шт.</strong></span>
                          <span>Кромка: <strong>{order.totalEdgeM} п.м.</strong></span>
                          <span>Дата готовности: <strong>{formatDeadlineDate(order.deadlineDate)}</strong></span>
                        </div>

                        {/* Previous Stage Completion Summary */}
                        {(() => {
                          const getPreviousStageId = (stId: ProductionStageId): ProductionStageId | null => {
                            const sequence: ProductionStageId[] = ['cutting', 'edging', 'cnc', 'facades', 'assembly', 'qc', 'packing'];
                            const idx = sequence.indexOf(stId);
                            if (idx > 0) return sequence[idx - 1];
                            return null;
                          };

                          const curStage = selectedStageId || order.currentStage;
                          const prevStageId = getPreviousStageId(curStage);
                          if (!prevStageId) return null;

                          const stageObj = allStages.find(s => s.id === prevStageId);
                          const prevStageName = stageObj ? stageObj.name : prevStageId;
                          const prevLogs = (order.workLogs || []).filter(l => l.stageId === prevStageId);

                          if (prevLogs.length > 0) {
                            const formattedWorkers = prevLogs.map(l => 
                              `${l.employeeName || order.stageProgress?.[prevStageId]?.completedBy || order.responsibleEmployeeName || 'Сотрудник'}, ${l.scannedPartsCount || order.partsCount} деталей в объеме ${(l.scannedAreaM2 || order.totalAreaM2).toFixed(1)} м², ${l.endTime || l.startTime || 'сегодня'}`
                            );
                            const text = formattedWorkers.length > 1
                              ? `${prevStageName} выполнили: ${formattedWorkers[0]} совместно с ${formattedWorkers.slice(1).join(', ')}`
                              : `${prevStageName} выполнил: ${formattedWorkers[0]}`;

                            return (
                              <div className="mt-2 text-[11px] font-semibold text-slate-800 bg-emerald-50/90 p-2.5 rounded-2xl border border-emerald-200/90 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div>{text}</div>
                              </div>
                            );
                          }

                          const prevScanning = order.stageScanningProgress?.[prevStageId];
                          const completedByName = order.stageProgress?.[prevStageId]?.completedBy || order.responsibleEmployeeName || 'Сотрудник';
                          if (prevScanning && Object.keys(prevScanning).length > 0) {
                            return (
                              <div className="mt-2 text-[11px] font-semibold text-slate-800 bg-emerald-50/90 p-2.5 rounded-2xl border border-emerald-200/90 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  {prevStageName} выполнил: {completedByName}, {order.partsCount} деталей в объеме {order.totalAreaM2} м², {order.plannedCuttingDate || 'Ранее'}
                                </div>
                              </div>
                            );
                          }

                          if (order.stageProgress?.[prevStageId]?.status === 'done') {
                            return (
                              <div className="mt-2 text-[11px] font-semibold text-slate-800 bg-emerald-50/90 p-2.5 rounded-2xl border border-emerald-200/90 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  {prevStageName} выполнил: {completedByName}, {order.partsCount} деталей в объеме {order.totalAreaM2} м²
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3 shrink-0 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(order, selectedStageId || order.currentStage);
                          }}
                          className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Взять в работу (Сканировать)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <ERPOrderDetailsModal
          order={selectedOrderDetails}
          settings={settings}
          currentUser={currentUser}
          companyId={companyId}
          onClose={() => setSelectedOrderDetails(null)}
          onUpdateOrder={(updated) => {
            setSelectedOrderDetails(updated);
            if (onUpdateOrder) onUpdateOrder(updated);
          }}
          onUpdateOrderStatus={(orderId, nextStage) => {
            onUpdateOrderStatus(orderId, nextStage);
            const updated = {
              ...selectedOrderDetails,
              currentStage: nextStage
            };
            setSelectedOrderDetails(updated);
            if (onUpdateOrder) onUpdateOrder(updated);
          }}
        />
      )}

      {/* Mobile Camera Scanner Modal */}
      <MobileCameraScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        onScan={handleCameraScanOrder}
        title="Сканирование заказа камерой"
        subtitle="Наведите камеру на QR-код или штрихкод бланка / бирки заказа"
      />
    </div>
  );
};
