import React, { useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { ProductionOrder, ERPEmployee, MaterialResidual } from '../types';

interface EdgingRemainsModalProps {
  isOpen: boolean;
  order: ProductionOrder;
  currentUser?: ERPEmployee | null;
  onClose: () => void;
  onSubmit: (edges: MaterialResidual[]) => void;
}

export const EdgingRemainsModal: React.FC<EdgingRemainsModalProps> = ({
  isOpen,
  order,
  currentUser,
  onClose,
  onSubmit
}) => {
  const [edgesList, setEdgesList] = useState<MaterialResidual[]>([]);

  // Default edge from order birkaData allEdges or default
  const defaultEdgeName = order.birkaData?.allEdges?.[0]?.name || 'Кромка ПВХ 2/19';

  const [selectedEdge, setSelectedEdge] = useState<string>(defaultEdgeName);
  const [customEdge, setCustomEdge] = useState<string>('');
  const [lengthMeters, setLengthMeters] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [storageCell, setStorageCell] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddEdgeToList = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const mat = selectedEdge === 'CUSTOM' ? customEdge.trim() : selectedEdge;
    if (!mat) {
      setFormError('Укажите наименование кромки');
      return;
    }

    const lenM = Number(lengthMeters);
    const qty = Number(quantity) || 1;

    if (!lenM || lenM <= 0) {
      setFormError('Укажите корректный остаток кромки в метрах');
      return;
    }

    const newEdge: MaterialResidual = {
      id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'edge',
      category: 'Кромка',
      materialName: mat,
      lengthMeters: lenM,
      quantity: qty,
      addedAt: new Date().toISOString(),
      addedByEmployeeName: currentUser?.name || 'Оператор кромления',
      storageCell: storageCell.trim() || 'Стеллаж кромки',
      notes: notes.trim(),
      status: 'available'
    };

    setEdgesList(prev => [...prev, newEdge]);

    // Reset inputs
    setLengthMeters('');
    setNotes('');
  };

  const handleRemoveItem = (id: string) => {
    setEdgesList(prev => prev.filter(item => item.id !== id));
  };

  const handleFinish = (saveEdges: boolean) => {
    if (saveEdges && edgesList.length > 0) {
      onSubmit(edgesList);
    } else {
      onSubmit([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Layers className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold">
                Завершение этапа кромления • Заказ #{order.orderNumber}
              </div>
              <h3 className="text-base font-black text-white">
                Заполнение остатков кромки (в метрах)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Operator Banner Instruction */}
          <div className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-950 space-y-2">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-indigo-900">
              <AlertTriangle className="w-4 h-4 text-indigo-600 shrink-0" />
              ИНСТРУКЦИЯ ДЛЯ ОПЕРАТОРА КРОМЛЕНИЯ:
            </div>
            <p className="text-xs text-indigo-900 leading-relaxed font-medium">
              Оцените или замерьте оставшийся метраж кромочной ленты на рулоне/бобине после кромления заказа.
              Введите остаток в погонных метрах (например: 25 м, 40 м).
            </p>
          </div>

          {/* Form to add edge remain */}
          <form onSubmit={handleAddEdgeToList} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
              + Внесение остатка кромочной ленты
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Кромка *</label>
                <select
                  value={selectedEdge}
                  onChange={(e) => setSelectedEdge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {order.birkaData?.allEdges?.map((eItem) => (
                    <option key={eItem.name} value={eItem.name}>
                      {eItem.name} ({eItem.totalMeters} м в заказе)
                    </option>
                  ))}
                  <option value="CUSTOM">+ Ввести наименование кромки вручную...</option>
                </select>

                {selectedEdge === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Например: Кромка ПВХ 0.4х19 Белый гладкий"
                    value={customEdge}
                    onChange={(e) => setCustomEdge(e.target.value)}
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-indigo-300 text-xs font-bold text-slate-900 outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Остаток (в метрах) *</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={lengthMeters}
                    onChange={(e) => setLengthMeters(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Кол-во рулонов</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ячейка / Место хранения</label>
                <input
                  type="text"
                  placeholder="Стеллаж кромки №1"
                  value={storageCell}
                  onChange={(e) => setStorageCell(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Примечание</label>
                <input
                  type="text"
                  placeholder="Остаток в бухте, надрезов нет..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Зафиксировать остаток кромки</span>
            </button>
          </form>

          {/* Table of added edge remains in this modal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Зафиксированная кромка ({edgesList.length} поз.):
              </span>
            </div>

            {edgesList.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Нет зафиксированной кромки. Если кромка израсходована полностью, нажмите «Пропустить и завершить этап».
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {edgesList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        #{idx + 1} {item.materialName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        Остаток: <strong className="text-indigo-700">{item.lengthMeters} м</strong> ({item.quantity} рул) • Ячейка: {item.storageCell}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Удалить позицию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleFinish(false)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            Пропустить и завершить кромление
          </button>

          <button
            type="button"
            onClick={() => handleFinish(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Сохранить остаток кромки ({edgesList.length}) и завершить этап</span>
          </button>
        </div>
      </div>
    </div>
  );
};
