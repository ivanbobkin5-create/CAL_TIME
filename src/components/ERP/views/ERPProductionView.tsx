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
  ExternalLink
} from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPEmployee } from '../types';

interface ERPProductionViewProps {
  orders: ProductionOrder[];
  employees: ERPEmployee[];
  onUpdateOrderStatus: (orderId: string, nextStage: ProductionStageId) => void;
  onSelectOrder: (order: ProductionOrder) => void;
}

export const ERPProductionView: React.FC<ERPProductionViewProps> = ({
  orders,
  employees,
  onUpdateOrderStatus,
  onSelectOrder
}) => {
  const [search, setSearch] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<ProductionOrder | null>(null);

  const stages: { id: ProductionStageId; name: string; icon: any; color: string; badgeColor: string }[] = [
    { id: 'queue', name: 'Очередь запуска', icon: Clock, color: 'border-slate-300 bg-slate-50', badgeColor: 'bg-slate-200 text-slate-700' },
    { id: 'cutting', name: 'Раскрой', icon: Scissors, color: 'border-blue-300 bg-blue-50/50', badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'edging', name: 'Кромление', icon: Layers, color: 'border-indigo-300 bg-indigo-50/50', badgeColor: 'bg-indigo-100 text-indigo-800' },
    { id: 'cnc', name: 'Присадка ЧПУ', icon: Factory, color: 'border-purple-300 bg-purple-50/50', badgeColor: 'bg-purple-100 text-purple-800' },
    { id: 'facades', name: 'Фасады', icon: Wrench, color: 'border-amber-300 bg-amber-50/50', badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'assembly', name: 'Сборка', icon: Wrench, color: 'border-teal-300 bg-teal-50/50', badgeColor: 'bg-teal-100 text-teal-800' },
    { id: 'qc', name: 'Контроль ОТК', icon: CheckCircle2, color: 'border-emerald-300 bg-emerald-50/50', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'packing', name: 'Упаковка', icon: Package, color: 'border-orange-300 bg-orange-50/50', badgeColor: 'bg-orange-100 text-orange-800' },
    { id: 'ready', name: 'Готово к отгрузке', icon: CheckCircle2, color: 'border-green-400 bg-green-50/70', badgeColor: 'bg-green-100 text-green-800' }
  ];

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.clientName.toLowerCase().includes(search.toLowerCase()) ||
    o.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const handleNextStage = (order: ProductionOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = stages.findIndex(s => s.id === order.currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1].id;
      onUpdateOrderStatus(order.id, nextStage);
    }
  };

  const handlePrevStage = (order: ProductionOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = stages.findIndex(s => s.id === order.currentStage);
    if (currentIndex > 0) {
      const prevStage = stages[currentIndex - 1].id;
      onUpdateOrderStatus(order.id, prevStage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Factory className="w-4 h-4" /> Производственный конвейер
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Канбан технологических стадий
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по номеру заказа, клиенту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board Container with horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1900px]">
          {stages.map((stage, sIdx) => {
            const Icon = stage.icon;
            const stageOrders = filteredOrders.filter(o => o.currentStage === stage.id);
            const totalStageArea = stageOrders.reduce((sum, o) => sum + (o.totalAreaM2 || 0), 0);

            return (
              <div 
                key={stage.id}
                className="w-72 bg-slate-100/80 rounded-3xl p-4 border border-slate-200/80 flex flex-col max-h-[calc(100vh-250px)]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-sm">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">{stage.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono ${stage.badgeColor}`}>
                    {stageOrders.length}
                  </span>
                </div>

                {/* Stage Summary Sub-text */}
                <div className="text-[11px] font-semibold text-slate-400 px-1 mb-3">
                  {totalStageArea > 0 ? `${totalStageArea.toFixed(1)} м² деталей` : 'Нет заказов'}
                </div>

                {/* Cards Column */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderDetails(order);
                        onSelectOrder(order);
                      }}
                      className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        {/* Order Number & Priority */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-black text-slate-900 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            {order.orderNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                            order.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            order.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {order.priority === 'urgent' ? 'Срочно' : order.priority === 'high' ? 'Высокий' : 'Обычный'}
                          </span>
                        </div>

                        {/* Client & Project */}
                        <h4 className="font-bold text-slate-900 text-xs truncate mb-1">
                          {order.clientName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate mb-2">
                          {order.projectName}
                        </p>

                        {/* Bitrix24 Deal info badge if present */}
                        {order.bitrixStageName && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50/80 border border-blue-100/80 text-[10px] text-blue-700 font-semibold mb-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">CRM: {order.bitrixStageName}</span>
                          </div>
                        )}

                        {/* Metrics specs */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3">
                          <div>Площадь: <strong>{order.totalAreaM2} м²</strong></div>
                          <div>Кромка: <strong>{order.totalEdgeM} м</strong></div>
                          <div>Деталей: <strong>{order.partsCount} шт.</strong></div>
                          <div>Дедлайн: <strong className="text-red-600">{order.deadlineDate}</strong></div>
                        </div>
                      </div>

                      {/* Card Bottom Quick Stage Mover Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          disabled={sIdx === 0}
                          onClick={(e) => handlePrevStage(order, e)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Вернуть на предыдущую стадию"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-[10px] font-bold text-blue-600 group-hover:underline">
                          Открыть карту
                        </span>

                        <button
                          disabled={sIdx === stages.length - 1}
                          onClick={(e) => handleNextStage(order, e)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Перевести на следующую стадию"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech Card Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      Маршрутная карта {selectedOrderDetails.orderNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                      {selectedOrderDetails.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedOrderDetails.clientName} • {selectedOrderDetails.projectName}
                  </p>
                  {selectedOrderDetails.bitrixUrl && (
                    <a
                      href={selectedOrderDetails.bitrixUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1"
                    >
                      <span>Открыть сделку #{selectedOrderDetails.bitrixDealId} в Bitrix24</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Spec Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Площадь ЛДСП</div>
                <div className="text-base font-black text-slate-900">{selectedOrderDetails.totalAreaM2} м²</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Кромка ПВХ</div>
                <div className="text-base font-black text-slate-900">{selectedOrderDetails.totalEdgeM} п.м.</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Деталей всего</div>
                <div className="text-base font-black text-slate-900">{selectedOrderDetails.partsCount} шт.</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Дедлайн отгрузки</div>
                <div className="text-base font-black text-red-600">{selectedOrderDetails.deadlineDate}</div>
              </div>
            </div>

            {/* Technological Stages Progress Checklist */}
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Технологические стадии выполнения
            </h4>
            <div className="space-y-2 mb-6">
              {stages.map((stg) => {
                const isCurrent = selectedOrderDetails.currentStage === stg.id;
                const stageIndex = stages.findIndex(s => s.id === stg.id);
                const currentIndex = stages.findIndex(s => s.id === selectedOrderDetails.currentStage);
                const isCompleted = stageIndex < currentIndex;

                return (
                  <div
                    key={stg.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isCurrent ? 'bg-blue-50 border-blue-300' :
                      isCompleted ? 'bg-emerald-50/50 border-emerald-200 text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isCompleted ? 'bg-emerald-500 text-white' :
                        isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : stageIndex + 1}
                      </div>
                      <span className={`text-xs font-bold ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                        {stg.name}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onUpdateOrderStatus(selectedOrderDetails.id, stg.id);
                        setSelectedOrderDetails({ ...selectedOrderDetails, currentStage: stg.id });
                      }}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                        isCurrent ? 'bg-blue-600 text-white shadow-sm' :
                        'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isCurrent ? 'Текущая стадия' : 'Установить'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Распечатать техкарту
              </button>

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-200"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
