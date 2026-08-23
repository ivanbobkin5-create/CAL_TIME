import React, { useState } from 'react';
import { AlertTriangle, X, Check, ArrowRight, Wrench, ShieldAlert } from 'lucide-react';
import { ProductionOrder, ProductionStageId, ERPCompanySettings, OrderDefectItem, ERPEmployee } from '../types';

interface ReportDefectModalProps {
  isOpen: boolean;
  order: ProductionOrder;
  detail: any; // BirkaDetail
  settings?: ERPCompanySettings;
  currentUser?: ERPEmployee | null;
  allOrders: ProductionOrder[];
  onClose: () => void;
  onDefectReported: (updatedMainOrder: ProductionOrder, defectTaskOrder: ProductionOrder) => void;
}

export const ReportDefectModal: React.FC<ReportDefectModalProps> = ({
  isOpen,
  order,
  detail,
  settings,
  currentUser,
  allOrders,
  onClose,
  onDefectReported
}) => {
  const defaultReasons = settings?.defectReasons && settings.defectReasons.length > 0
    ? settings.defectReasons
    : ['Скол при распиле', 'Ошибка кромкооблицовки', 'Брак присадки / ЧПУ', 'Царапина / Повреждение ЛДСП', 'Неверный размер / декор'];

  const [selectedReason, setSelectedReason] = useState<string>(defaultReasons[0]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [targetStage, setTargetStage] = useState<ProductionStageId>('cutting');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !detail) return null;

  const stageOptions: { id: ProductionStageId; name: string }[] = [
    { id: 'cutting', name: 'Участок распила (Раскрой)' },
    { id: 'edging', name: 'Участок кромкооблицовки' },
    { id: 'cnc', name: 'Участок присадки / ЧПУ' },
    { id: 'facades', name: 'Фасадный участок' },
    { id: 'assembly', name: 'Участок сборки' }
  ];

  const handleSubmit = () => {
    setIsSubmitting(true);

    const defectItem: OrderDefectItem = {
      id: `def-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      detailId: detail.id,
      detailName: detail.name,
      labelNumber: detail.labelNumber,
      material: detail.material,
      reason: selectedReason + (customNotes ? `: ${customNotes}` : ''),
      reportedByEmployeeName: currentUser?.name || 'Мастер',
      reportedAt: new Date().toISOString(),
      targetStage,
      notes: customNotes || undefined
    };

    // Find if a non-completed defect rework task already exists for this order
    const defectOrderNumber = `${order.orderNumber} - Переделка брака`;
    let existingDefectOrder = allOrders.find(
      o => o.isDefectReworkOrder && (o.parentOrderId === order.id || o.orderNumber === defectOrderNumber) && o.status !== 'completed'
    );

    let updatedDefectOrder: ProductionOrder;

    if (existingDefectOrder) {
      const updatedDefectItems = [...(existingDefectOrder.defectItems || []), defectItem];
      updatedDefectOrder = {
        ...existingDefectOrder,
        defectItems: updatedDefectItems,
        partsCount: updatedDefectItems.length,
        status: 'in_progress',
        currentStage: targetStage
      };
    } else {
      updatedDefectOrder = {
        id: `deforder-${Date.now()}`,
        orderNumber: defectOrderNumber,
        clientName: order.clientName,
        projectName: `Переделка брака к заказу № ${order.orderNumber}`,
        createdAt: new Date().toISOString(),
        deadlineDate: new Date().toISOString().split('T')[0],
        currentStage: targetStage,
        priority: 'urgent',
        totalAreaM2: (detail.length * detail.width * (detail.quantity || 1)) / 1000000,
        totalEdgeM: ((detail.length + detail.width) * 2 * (detail.quantity || 1)) / 1000,
        partsCount: 1,
        facadesCount: 0,
        status: 'in_progress',
        isDefectReworkOrder: true,
        parentOrderId: order.id,
        parentOrderNumber: order.orderNumber,
        defectItems: [defectItem],
        birkaData: {
          fileHash: `def-${order.id}`,
          uploadedAt: new Date().toISOString(),
          details: [{ ...detail, isDefectPart: true }],
          totalDetailsCount: 1,
          totalAreaM2: (detail.length * detail.width) / 1000000,
          totalEdgeM: ((detail.length + detail.width) * 2) / 1000,
          materialsSummary: [{ material: detail.material || 'ЛДСП', count: 1, areaM2: (detail.length * detail.width) / 1000000 }]
        }
      };
    }

    // Attach defect item record to main order as well
    const updatedMainOrder: ProductionOrder = {
      ...order,
      defectItems: [...(order.defectItems || []), defectItem]
    };

    onDefectReported(updatedMainOrder, updatedDefectOrder);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black font-mono uppercase tracking-wider">
                Зафиксировать брак детали
              </span>
              <h3 className="font-black text-slate-900 text-lg leading-tight mt-0.5">
                Переделка: Заказ № {order.orderNumber}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Part Info Card */}
        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1 text-xs">
          <div className="flex items-center justify-between font-black text-slate-900">
            <span>#{detail.labelNumber} {detail.name}</span>
            <span className="font-mono text-rose-700">{detail.length} × {detail.width} мм</span>
          </div>
          <div className="text-slate-600 font-mono text-[11px]">
            Материал: {detail.material || 'ЛДСП'} • Кромка: {detail.edgeLeft || detail.edgeRight || 'Без кромки'}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Причина брака:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {defaultReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    selectedReason === reason
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{reason}</span>
                  {selectedReason === reason && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Дополнительный комментарий / причина:
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="например: Скол на лицевом пластике 5мм"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Target Stage for Task */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              На какой участок направить задачу переделки:
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value as ProductionStageId)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
            >
              {stageOptions.map(stg => (
                <option key={stg.id} value={stg.id}>{stg.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Задача появится на этом участке под названием «{order.orderNumber} - Переделка брака».
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Зафиксировать брак и передать</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
