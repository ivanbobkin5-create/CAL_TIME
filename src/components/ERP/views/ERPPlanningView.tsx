import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Factory, 
  ArrowRight,
  Layers,
  Scissors,
  Wrench,
  Check
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPEmployee } from '../types';

interface ERPPlanningViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  onUpdateOrder: (order: ProductionOrder) => void;
  onSelectOrder: (order: ProductionOrder) => void;
}

export const ERPPlanningView: React.FC<ERPPlanningViewProps> = ({
  orders,
  employees,
  onUpdateOrder,
  onSelectOrder
}) => {
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName.toLowerCase().includes(search.toLowerCase()) ||
      o.projectName.toLowerCase().includes(search.toLowerCase());
    
    const matchesPriority = selectedPriority === 'all' || o.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  const departmentStages: { id: ProductionStageId; name: string; icon: any; color: string }[] = [
    { id: 'cutting', name: 'Раскрой', icon: Scissors, color: 'border-blue-500 text-blue-700 bg-blue-50' },
    { id: 'edging', name: 'Кромкооблицовка', icon: Layers, color: 'border-indigo-500 text-indigo-700 bg-indigo-50' },
    { id: 'cnc', name: 'Присадка / ЧПУ', icon: Factory, color: 'border-purple-500 text-purple-700 bg-purple-50' },
    { id: 'facades', name: 'Фасады / Покраска', icon: Wrench, color: 'border-amber-500 text-amber-700 bg-amber-50' },
    { id: 'assembly', name: 'Сборка и ОТК', icon: CheckCircle2, color: 'border-emerald-500 text-emerald-700 bg-emerald-50' }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" /> Производственный график
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Календарное планирование мощностей
          </h2>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск заказа, клиента, проекта..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

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

          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Таймлайн
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Таблица
            </button>
          </div>
        </div>
      </div>

      {/* Department Stages Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {departmentStages.map((stage) => {
          const Icon = stage.icon;
          const stageOrders = filteredOrders.filter(o => o.currentStage === stage.id);
          const totalArea = stageOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);

          return (
            <div key={stage.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold border ${stage.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                    {stageOrders.length} в очереди
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{stage.name}</h3>
                <p className="text-xs text-slate-400">Объем: {totalArea.toFixed(1)} м²</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>Статус участка:</span>
                  <span className="text-emerald-600 font-bold">В работе</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orders Planning Timeline / Queue */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Очередь запуска в производство</h3>
            <p className="text-xs text-slate-400">Распределение заказов по датам и загрузке</p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Найдено: <strong className="text-slate-800 font-bold">{filteredOrders.length} заказов</strong>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Заказы не найдены</p>
            <p className="text-xs text-slate-400 mt-1">Попробуйте изменить поисковый запрос или фильтры</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const priorityStyles = {
                urgent: 'bg-red-50 text-red-700 border-red-200',
                high: 'bg-amber-50 text-amber-700 border-amber-200',
                normal: 'bg-blue-50 text-blue-700 border-blue-200',
                low: 'bg-slate-50 text-slate-700 border-slate-200'
              }[order.priority];

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="p-4 rounded-2xl bg-slate-50/70 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="flex items-start md:items-center gap-4 min-w-0">
                    <div className="font-mono font-black text-slate-900 text-sm bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
                      {order.orderNumber}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">{order.clientName}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 font-medium truncate">{order.projectName}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${priorityStyles}`}>
                          {order.priority === 'urgent' ? 'Срочно' : order.priority === 'high' ? 'Высокий' : 'Обычный'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>Площадь: <strong>{order.totalAreaM2} м²</strong></span>
                        <span>Кромка: <strong>{order.totalEdgeM} п.м.</strong></span>
                        <span>Деталей: <strong>{order.partsCount} шт.</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stage, Dates & Actions */}
                  <div className="flex items-center gap-4 justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Дедлайн: {order.deadlineDate}
                      </div>
                      <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                        Стадия: {order.currentStage === 'cutting' ? 'Раскрой' : order.currentStage === 'edging' ? 'Кромление' : order.currentStage === 'cnc' ? 'Присадка' : order.currentStage === 'assembly' ? 'Сборка' : 'В очереди'}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order);
                      }}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm transition-all"
                    >
                      Карта заказа
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
