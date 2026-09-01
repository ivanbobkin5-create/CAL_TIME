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
import { ProductionOrder, ERPEmployee, WorkShift, ERPSection, ERPCompanySettings } from '../types';
import { formatDeadlineDate } from '../utils';

interface ERPDashboardViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  shifts: WorkShift[];
  settings?: ERPCompanySettings;
  companyId?: string;
  onNavigateSection: (section: ERPSection) => void;
  onSelectOrder: (order: ProductionOrder) => void;
  onCreateOrderModal?: () => void;
}

export const ERPDashboardView: React.FC<ERPDashboardViewProps> = ({
  orders,
  employees,
  shifts,
  settings,
  companyId,
  onNavigateSection,
  onSelectOrder,
  onCreateOrderModal
}) => {
  const activeOrders = orders.filter(o => !o.isDeleted && (o.status === 'in_progress' || o.status === 'planned'));
  const completedOrders = orders.filter(o => !o.isDeleted && (o.status === 'completed' || o.status === 'shipped'));
  const urgentOrders = activeOrders.filter(o => o.priority === 'urgent' || o.priority === 'high');

  const totalAreaInWork = activeOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);
  const totalEdgeInWork = activeOrders.reduce((sum, o) => sum + (o.totalEdgeM || 0), 0);
  const totalPartsInWork = activeOrders.reduce((sum, o) => sum + (o.partsCount || 0), 0);

  // Filter out superadmins/non-production employees if applicable
  const validEmployees = employees.filter(e => 
    e.email?.toLowerCase() !== 'lk.ivanbobkin@gmail.com' &&
    !(e as any).isSuperAdmin &&
    e.role !== 'superadmin' &&
    e.productionRole !== 'superadmin' &&
    e.status !== 'inactive'
  );

  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Production Plan for Today: cutting m2, sheets estimate, edge meters
  // Filter active orders that are in cutting or edging or scheduled for today
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayCuttingOrders = orders.filter(o => !o.isDeleted && ((o.currentStage === 'cutting' && o.status === 'in_progress') || (o.currentStage === 'queue' && o.status === 'in_progress')));
  const todayCuttingM2 = todayCuttingOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);
  const todayCuttingSheets = Math.ceil(todayCuttingM2 / 5.8) || (todayCuttingM2 > 0 ? 1 : 0);

  const todayEdgingOrders = orders.filter(o => !o.isDeleted && o.currentStage === 'edging' && o.status === 'in_progress');
  const todayEdgingM = todayEdgingOrders.reduce((sum, o) => sum + (o.totalEdgeM || 0), 0);

  // Current Month Production Pace Calculation
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgressPercent = Math.round((currentDay / totalDaysInMonth) * 100);

  // Month target (estimated from settings or sum of active + completed orders this month)
  const monthOrders = orders.filter(o => {
    if (o.isDeleted) return false;
    if (!o.createdAt) return true;
    const d = new Date(o.createdAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const monthCompletedArea = monthOrders.filter(o => o.status === 'completed' || o.status === 'shipped').reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);
  const monthTotalTargetArea = Math.max(
    (settings as any)?.customProductionMetrics?.monthlyTargetM2 || 0,
    monthOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0) || 500
  );

  const monthCompletedPercent = Math.min(100, Math.round((monthCompletedArea / Math.max(monthTotalTargetArea, 1)) * 100));
  // Pace ratio: if completed percent matches or exceeds month elapsed time, pace is on track or ahead
  const paceRatio = monthProgressPercent > 0 ? (monthCompletedPercent / monthProgressPercent) : 1;
  const isPaceOnTrack = paceRatio >= 0.85;
  const isPaceAhead = paceRatio >= 1.05;

  // Calculate actual stage load based on real orders in progress
  const stageStats = {
    cutting: orders.filter(o => !o.isDeleted && o.currentStage === 'cutting' && o.status === 'in_progress'),
    edging: orders.filter(o => !o.isDeleted && o.currentStage === 'edging' && o.status === 'in_progress'),
    cnc: orders.filter(o => !o.isDeleted && o.currentStage === 'cnc' && o.status === 'in_progress'),
    facades: orders.filter(o => !o.isDeleted && o.currentStage === 'facades' && o.status === 'in_progress'),
    assembly: orders.filter(o => !o.isDeleted && o.currentStage === 'assembly' && o.status === 'in_progress'),
    kitting: orders.filter(o => !o.isDeleted && o.currentStage === 'kitting' && o.status === 'in_progress'),
    packing: orders.filter(o => !o.isDeleted && o.currentStage === 'packing' && o.status === 'in_progress'),
    shipping: orders.filter(o => !o.isDeleted && o.currentStage === 'shipping' && o.status === 'in_progress')
  };

  const getStageLoadPercent = (count: number, capacity: number = 6) => {
    if (count === 0) return 0;
    return Math.min(100, Math.round((count / capacity) * 100));
  };

  // Today completed output in m2
  const completedTodayM2 = completedOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              Оперативная сводка цеха
            </h2>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              В работе <strong className="text-white font-bold">{activeOrders.length} заказов</strong> общей площадью {totalAreaInWork.toFixed(1)} м² деталей.
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
            <span>Готово заказов: {completedOrders.length}</span>
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
            <span>Объем кромки в заказах</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Темп месяца</span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isPaceAhead ? 'bg-emerald-50 text-emerald-600' : isPaceOnTrack ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mb-1">{monthCompletedPercent}% <span className="text-sm font-bold text-slate-400">от плана</span></div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${
            isPaceAhead ? 'text-emerald-600' : isPaceOnTrack ? 'text-blue-600' : 'text-amber-600'
          }`}>
            {isPaceAhead ? <CheckCircle2 className="w-3.5 h-3.5" /> : isPaceOnTrack ? <TrendingUp className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{isPaceAhead ? 'Опережение графика' : isPaceOnTrack ? 'В графике месяца' : 'Отставание от темпа'}</span>
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
                <p className="text-xs text-slate-400 mt-0.5">В цехе нет заказов с критической датой готовности</p>
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
                          {(() => {
                            const c = (order.clientName || '').trim();
                            const p = (order.projectName || '').trim();
                            if (!c && !p) return 'Заказ без названия';
                            if (!p || c.toLowerCase() === p.toLowerCase() || c.toLowerCase().includes(p.toLowerCase())) return c || p;
                            if (!c || p.toLowerCase().includes(c.toLowerCase())) return p;
                            return `${c} • ${p}`;
                          })()}
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
            <h3 className="font-bold text-slate-900 text-base mb-1">Загрузка участков</h3>
            <p className="text-xs text-slate-400 mb-6">Текущая загрузка станков и пропускная способность</p>

            <div className="space-y-4">
              {[
                { 
                  name: '1. Участок раскроя (Форматно-раскроечный / ЧПУ раскрой)', 
                  ordersCount: stageStats.cutting.length,
                  load: getStageLoadPercent(stageStats.cutting.length, 5), 
                  color: 'bg-blue-600' 
                },
                { 
                  name: '2. Участок кромления (Кромкооблицовочный станок)', 
                  ordersCount: stageStats.edging.length,
                  load: getStageLoadPercent(stageStats.edging.length, 5), 
                  color: 'bg-indigo-600' 
                },
                { 
                  name: '3. Участок присадки (Сверлильно-присадочный центр ЧПУ)', 
                  ordersCount: stageStats.cnc.length,
                  load: getStageLoadPercent(stageStats.cnc.length, 5), 
                  color: 'bg-purple-600' 
                },
                { 
                  name: '4. Фасадный и покрасочный цех', 
                  ordersCount: stageStats.facades.length,
                  load: getStageLoadPercent(stageStats.facades.length, 3), 
                  color: 'bg-amber-600' 
                },
                { 
                  name: '5. Участок комплектовки, упаковки и склада', 
                  ordersCount: stageStats.assembly.length + stageStats.kitting.length + stageStats.packing.length + stageStats.shipping.length,
                  load: getStageLoadPercent(stageStats.assembly.length + stageStats.kitting.length + stageStats.packing.length + stageStats.shipping.length, 5), 
                  color: 'bg-emerald-600' 
                }
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

        {/* Right 1 Col: Production Plan for Today & Pace + Quick Actions */}
        <div className="space-y-6">
          {/* Daily Production Plan & Pace Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">План на сегодня</h3>
                <p className="text-xs text-slate-400">Текущий сменный объем по ключевым станкам</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                Сегодня
              </span>
            </div>

            {/* Cutting & Edging Plan Boxes */}
            <div className="grid grid-cols-1 gap-3">
              {/* Cutting Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-blue-600" />
                    В распиле на сегодня:
                  </span>
                  <span className="font-mono font-black text-blue-700">
                    ~{todayCuttingSheets} листов
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Общая площадь: <strong className="text-slate-800">{todayCuttingM2.toFixed(1)} м²</strong> ({todayCuttingOrders.length} заказов)
                </div>
              </div>

              {/* Edging Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    В плане по кромке:
                  </span>
                  <span className="font-mono font-black text-indigo-700">
                    {todayEdgingM.toFixed(0)} метров
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Заказов на участке: <strong className="text-slate-800">{todayEdgingOrders.length}</strong>
                </div>
              </div>
            </div>

            {/* Monthly Pace Progress Indicator */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Темп выполнения месяца</span>
                <span className="font-mono font-bold text-emerald-400">{monthCompletedPercent}%</span>
              </div>

              <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPaceAhead ? 'bg-emerald-400' : isPaceOnTrack ? 'bg-blue-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.max(monthCompletedPercent, 5)}%` }}
                />
              </div>

              <div className="text-[11.5px] leading-relaxed">
                {isPaceAhead ? (
                  <span className="text-emerald-300 font-semibold">
                    🚀 <strong>Отличный темп!</strong> Производство опережает календарный график (прошло {monthProgressPercent}% месяца, сдано {monthCompletedPercent}% объема).
                  </span>
                ) : isPaceOnTrack ? (
                  <span className="text-blue-200 font-semibold">
                    👍 <strong>В графике!</strong> Выполнение соответствует календарному темпу месяца ({monthCompletedArea.toFixed(0)} м² из {monthTotalTargetArea.toFixed(0)} м²).
                  </span>
                ) : (
                  <span className="text-amber-300 font-semibold">
                    ⚠️ <strong>Риск задержки:</strong> Темп сдачи ({monthCompletedPercent}%) отстает от календарного времени ({monthProgressPercent}% месяца). Рекомендуется усилить смены.
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('planning')}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> Открыть производственный план
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
