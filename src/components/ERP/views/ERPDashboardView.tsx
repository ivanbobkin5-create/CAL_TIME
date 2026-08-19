import React from 'react';
import { 
  Factory, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Package, 
  Gauge, 
  Scissors, 
  Sparkles,
  ChevronRight,
  PlayCircle
} from 'lucide-react';
import { ProductionOrder, ERPEmployee, WorkShift, ERPSection } from '../types';
import { formatDeadlineDate } from '../utils';

interface ERPDashboardViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  shifts: WorkShift[];
  onNavigateSection: (section: ERPSection) => void;
  onSelectOrder: (order: ProductionOrder) => void;
  onCreateOrderModal?: () => void;
}

export const ERPDashboardView: React.FC<ERPDashboardViewProps> = ({
  orders,
  employees,
  shifts,
  onNavigateSection,
  onSelectOrder,
  onCreateOrderModal
}) => {
  const activeOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'planned');
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'shipped');
  const urgentOrders = activeOrders.filter(o => o.priority === 'urgent' || o.priority === 'high');

  const totalAreaInWork = activeOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);
  const totalEdgeInWork = activeOrders.reduce((sum, o) => sum + (o.totalEdgeM || 0), 0);
  const totalPartsInWork = activeOrders.reduce((sum, o) => sum + (o.partsCount || 0), 0);

  const activeEmployeesCount = employees.filter(e => e.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Сводка производственных мощностей
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              Оперативная сводка цеха
            </h2>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              В работе <strong className="text-white font-bold">{activeOrders.length} заказов</strong> общей площадью {totalAreaInWork.toFixed(1)} м² деталей. Все производственные участки функционируют в штатном режиме.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateSection('production')}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Factory className="w-4 h-4" /> Перейти к стадиям
            </button>
            <button
              onClick={() => onNavigateSection('planning')}
              className="px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> Планирование
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Заказы в работе</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{activeOrders.length}</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Готово за смену: {completedOrders.length}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Раскрой в очереди</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Scissors className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{totalAreaInWork.toFixed(1)} <span className="text-lg font-bold text-slate-400">м²</span></div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>Всего деталей: {totalPartsInWork} шт.</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Кромкооблицовка</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{totalEdgeInWork.toFixed(0)} <span className="text-lg font-bold text-slate-400">п.м.</span></div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Норматив: ~4.2 часа</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Сотрудники в смене</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{activeEmployeesCount} <span className="text-lg font-bold text-slate-400">мастеров</span></div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Штат укомплектован</span>
          </div>
        </div>
      </div>

      {/* Main Content 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Production Stages Status & Critical Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Orders Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Срочные заказы и контроль сроков</h3>
                  <p className="text-xs text-slate-400">Требуют первоочередного запуска на станки</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateSection('production')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Все заказы <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {urgentOrders.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">Все срочные заказы выполнены</p>
                <p className="text-xs text-slate-400 mt-0.5">В цехе нет заказов с критическим дедлайном</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentOrders.slice(0, 4).map(order => (
                  <div 
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2 h-10 rounded-full bg-red-500 shrink-0" />
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-sm">{order.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                            {order.priority === 'urgent' ? 'Срочно' : 'Высокий'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                          {order.clientName} • {order.projectName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900">
                        {order.totalAreaM2} м² | {order.partsCount} дет.
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3 text-red-500" />
                        Срок: {formatDeadlineDate(order.deadlineDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Pipeline Workload */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-1">Загрузка технологических участков</h3>
            <p className="text-xs text-slate-400 mb-6">Текущая загрузка станков и пропускная способность</p>

            <div className="space-y-4">
              {[
                { name: '1. Участок раскроя (Форматно-раскроечный / ЧПУ раскрой)', load: 78, ordersCount: 5, color: 'bg-blue-600' },
                { name: '2. Участок кромления (Кромкооблицовочный станок)', load: 64, ordersCount: 4, color: 'bg-indigo-600' },
                { name: '3. Участок присадки (Сверлильно-присадочный центр ЧПУ)', load: 85, ordersCount: 6, color: 'bg-purple-600' },
                { name: '4. Фасадный и покрасочный цех', load: 45, ordersCount: 2, color: 'bg-amber-600' },
                { name: '5. Участок контрольной сборки и упаковки', load: 30, ordersCount: 3, color: 'bg-emerald-600' }
              ].map((dep, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                    <span>{dep.name}</span>
                    <span className="font-mono text-slate-600">{dep.load}% ({dep.ordersCount} заказов)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${dep.color} rounded-full transition-all duration-500`} style={{ width: `${dep.load}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Active Shift & Quick Actions */}
        <div className="space-y-6">
          {/* Active Shift Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base">Текущая смена</h3>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Активна
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Мастер смены</div>
              <div className="font-bold text-slate-900 text-sm">
                {employees[0]?.name || "Иванов Сергей (Начальник производства)"}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                08:00 — 20:00 (Дневная смена)
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Мастеров на линии:</span>
                <span className="font-bold text-slate-800">{activeEmployeesCount} чел.</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Выработка за сегодня:</span>
                <span className="font-bold text-emerald-600">38.4 м²</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-slate-500">Брак / Рекламации:</span>
                <span className="font-bold text-slate-800">0 шт. (0%)</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('schedule')}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> График смен и табель
            </button>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white rounded-3xl p-6 border border-blue-100 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-3">Быстрые операции</h3>
            <div className="space-y-2.5">
              <button
                onClick={() => onNavigateSection('planning')}
                className="w-full p-3 rounded-2xl bg-white hover:bg-blue-50 text-slate-800 font-bold text-xs border border-blue-200/80 shadow-sm transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Поставить заказ в план</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateSection('salaries')}
                className="w-full p-3 rounded-2xl bg-white hover:bg-blue-50 text-slate-800 font-bold text-xs border border-blue-200/80 shadow-sm transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Расчет сдельной зарплаты</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateSection('reports')}
                className="w-full p-3 rounded-2xl bg-white hover:bg-blue-50 text-slate-800 font-bold text-xs border border-blue-200/80 shadow-sm transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-purple-600" />
                  <span>Производственный отчет</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
