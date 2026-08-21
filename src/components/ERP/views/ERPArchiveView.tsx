import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Search, 
  PackageCheck, 
  Calendar, 
  Truck, 
  FileText, 
  ChevronRight, 
  Layers, 
  Scissors, 
  Box,
  Download,
  RotateCcw
} from 'lucide-react';
import { ProductionOrder, ERPEmployee } from '../types';
import { formatDeadlineDate } from '../utils';

interface ERPArchiveViewProps {
  orders: ProductionOrder[];
  employees?: ERPEmployee[];
  onSelectOrder: (order: ProductionOrder) => void;
  onRestoreOrder?: (orderId: string) => void;
}

export const ERPArchiveView: React.FC<ERPArchiveViewProps> = ({
  orders,
  employees = [],
  onSelectOrder,
  onRestoreOrder
}) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // All archived orders: status is strictly completed or shipped (when handed over to driver)
  const archivedOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

    return orders.filter(o => {
      const isArchived = o.status === 'completed' || o.status === 'shipped';
      if (!isArchived) return false;

      // Text search
      const s = search.toLowerCase().trim();
      if (s) {
        const matchesNum = o.orderNumber.toLowerCase().includes(s);
        const matchesClient = o.clientName.toLowerCase().includes(s);
        const matchesProject = o.projectName.toLowerCase().includes(s);
        const matchesSalon = o.salonName ? o.salonName.toLowerCase().includes(s) : false;
        if (!matchesNum && !matchesClient && !matchesProject && !matchesSalon) return false;
      }

      // Date filter
      const targetDate = o.deadlineDate || o.createdAt?.split('T')[0] || '';
      if (dateFilter === 'today') {
        return targetDate === todayStr;
      } else if (dateFilter === 'week') {
        return targetDate >= sevenDaysAgo;
      } else if (dateFilter === 'month') {
        return targetDate >= monthAgo;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.deadlineDate || a.createdAt || '';
      const dateB = b.deadlineDate || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [orders, search, dateFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalM2 = 0;
    let totalEdge = 0;
    let totalParts = 0;
    let totalPackages = 0;

    archivedOrders.forEach(o => {
      totalM2 += o.totalAreaM2 || 0;
      totalEdge += o.totalEdgeM || 0;
      totalParts += o.partsCount || 0;
      totalPackages += o.packages?.length || 0;
    });

    return {
      count: archivedOrders.length,
      totalM2: Math.round(totalM2 * 10) / 10,
      totalEdge: Math.round(totalEdge),
      totalParts,
      totalPackages
    };
  }, [archivedOrders]);

  const handleExportCSV = () => {
    const headers = ['Номер заказа', 'Салон', 'Клиент', 'Проект', 'Статус', 'Мест', 'Деталей', 'Площадь м²', 'Кромка м', 'Сумма ₽'];
    const rows = archivedOrders.map(o => [
      `"${o.orderNumber}"`,
      `"${o.salonName || ''}"`,
      `"${o.clientName || ''}"`,
      `"${o.projectName || ''}"`,
      `"${o.status === 'shipped' ? 'Отгружен' : 'Выполнен'}"`,
      o.packages?.length || 0,
      o.partsCount || 0,
      (o.totalAreaM2 || 0).toFixed(2),
      (o.totalEdgeM || 0).toFixed(1),
      o.priceTotal || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Архив_заказов_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            <Archive className="w-4 h-4 text-emerald-600" /> История и готовая продукция
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Архив выполненных и отгруженных заказов
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Реестр завершенных производственных проектов, маркированных упаковочных мест и актов отгрузки
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Выгрузить в Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Выполнено заказов</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.count}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Сформировано мест</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalPackages}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Общая площадь</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalM2} <span className="text-sm font-semibold text-slate-400">м²</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Всего кромки</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalEdge} <span className="text-sm font-semibold text-slate-400">п.м.</span></div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру, клиенту, салону..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 self-stretch sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Все время' },
            { id: 'today', label: 'Сегодня' },
            { id: 'week', label: 'За 7 дней' },
            { id: 'month', label: 'За месяц' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                dateFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {archivedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Archive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">
            {search ? 'Заказы по вашему запросу не найдены' : 'Архив заказов пока пуст'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            {search 
              ? 'Попробуйте изменить поисковый запрос или сбросить фильтр по датам' 
              : 'Когда заказы проходят полный производственный цикл, маркируются и отгружаются на складе, они автоматически сохраняются в этот раздел.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {archivedOrders.map((order) => {
            const pkgsCount = order.packages?.length || 0;
            const shippedPkgsCount = order.packages?.filter(p => p.isShipped).length || 0;
            const isFullyShipped = order.status === 'shipped' || (pkgsCount > 0 && shippedPkgsCount === pkgsCount);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left: Main Order Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isFullyShipped 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {isFullyShipped ? <Truck className="w-6 h-6" /> : <PackageCheck className="w-6 h-6" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-black text-slate-900 font-mono">
                        № {order.orderNumber}
                      </span>
                      {order.salonName && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                          {order.salonName}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase border ${
                        isFullyShipped 
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' 
                          : 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                      }`}>
                        {isFullyShipped ? '✓ Отгружен водителю' : 'Готов к отгрузке'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800">
                      {order.clientName} {order.projectName ? `— ${order.projectName}` : ''}
                    </h4>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Срок: {formatDeadlineDate(order.deadlineDate)}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Scissors className="w-3.5 h-3.5 text-slate-400" />
                        {order.totalAreaM2 || 0} м² ({order.partsCount || 0} дет.)
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {order.totalEdgeM || 0} м кромки
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Packages Summary */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between sm:justify-start gap-4">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Упаковочные места</div>
                      <div className="text-xs font-black text-slate-800">
                        {pkgsCount > 0 ? `${pkgsCount} ${pkgsCount === 1 ? 'место' : 'мест'}` : 'Упаковки не созданы'}
                      </div>
                    </div>
                  </div>

                  {order.driverInfo && (
                    <div className="border-l border-slate-200 pl-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Водитель / Авто</div>
                      <div className="text-xs font-bold text-slate-700 truncate max-w-[140px]">
                        {order.driverInfo.driverName || order.driverInfo.carPlate || 'Назначен'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  {onRestoreOrder && (
                    <button
                      onClick={() => onRestoreOrder(order.id)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Вернуть заказ в производство"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Вернуть в цех</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectOrder(order)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    title="Открыть рабочее пространство заказа"
                  >
                    <span>Открыть</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
