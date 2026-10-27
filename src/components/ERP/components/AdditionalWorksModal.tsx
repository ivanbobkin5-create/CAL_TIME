import React from 'react';
import { X, Check, Box, Wrench, Scissors, Layers } from 'lucide-react';
import { ProductionOrder, AdditionalWorks } from '../types';

interface AdditionalWorksModalProps {
  order: ProductionOrder;
  isOpen: boolean;
  onClose: () => void;
  onUpdateOrder: (updatedOrder: ProductionOrder) => void;
}

export const AdditionalWorksModal: React.FC<AdditionalWorksModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateOrder
}) => {
  if (!isOpen) return null;

  const works: AdditionalWorks = order.additionalWorks || {};

  const handleUpdate = (patch: Partial<AdditionalWorks>) => {
    const updatedWorks = {
      ...works,
      ...patch
    };
    onUpdateOrder({
      ...order,
      additionalWorks: updatedWorks
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <Box className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-mono text-xs font-black">
                  Заказ № {order.orderNumber}
                </span>
                <span className="text-xs text-slate-400 truncate">{order.clientName}</span>
              </div>
              <h2 className="text-lg font-black text-white truncate mt-0.5">
                Дополнительные производственные работы
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Work 1: Countertop */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-black text-slate-900 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!works.countertopCutting}
                  onChange={(e) => handleUpdate({ countertopCutting: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
                <Scissors className="w-4 h-4 text-blue-600" />
                <span>1. Распил столешницы</span>
              </label>
              {works.countertopCutting && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                  Включено
                </span>
              )}
            </div>

            {works.countertopCutting && (
              <div className="pl-6 space-y-3 pt-2 border-t border-slate-200/60">
                <div className="flex flex-wrap items-center gap-4 text-slate-800 font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!works.countertopEdging}
                      onChange={(e) => handleUpdate({ countertopEdging: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span>Кромление столешницы</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!works.countertopRadius}
                      onChange={(e) => handleUpdate({ countertopRadius: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span>Радиус (скругление)</span>
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Примечание к распилу столешницы (размеры, материал, бренд)..."
                  value={works.countertopNotes || ''}
                  onChange={(e) => handleUpdate({ countertopNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Work 2: Wall Panel */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-black text-slate-900 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!works.wallPanelCutting}
                  onChange={(e) => handleUpdate({ wallPanelCutting: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>2. Распил стеновой панели</span>
              </label>
              {works.wallPanelCutting && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  Включено
                </span>
              )}
            </div>

            {works.wallPanelCutting && (
              <div className="pl-6 space-y-3 pt-2 border-t border-slate-200/60">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="checkbox"
                    checked={!!works.wallPanelEdging}
                    onChange={(e) => handleUpdate({ wallPanelEdging: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span>Кромление стеновой панели</span>
                </label>

                <input
                  type="text"
                  placeholder="Примечание к стеновой панели..."
                  value={works.wallPanelNotes || ''}
                  onChange={(e) => handleUpdate({ wallPanelNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Work 3: Bar / Tube */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-black text-slate-900 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!works.barCutting}
                  onChange={(e) => handleUpdate({ barCutting: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
                <Wrench className="w-4 h-4 text-teal-600" />
                <span>3. Нарезка штанги / трубы</span>
              </label>
              {works.barCutting && (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">
                  Включено
                </span>
              )}
            </div>

            {works.barCutting && (
              <div className="pl-6 space-y-3 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Количество штук:</span>
                  <input
                    type="number"
                    min={1}
                    value={works.barCount || 1}
                    onChange={(e) => handleUpdate({ barCount: Math.max(1, Number(e.target.value)) })}
                    className="w-24 px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs text-center"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Примечание, длина штанг (мм)..."
                  value={works.barNotes || ''}
                  onChange={(e) => handleUpdate({ barNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Work 4: Plinth */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-black text-slate-900 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!works.plinthCutting}
                  onChange={(e) => handleUpdate({ plinthCutting: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
                />
                <Box className="w-4 h-4 text-purple-600" />
                <span>4. Нарезка цоколя</span>
              </label>
              {works.plinthCutting && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                  Включено
                </span>
              )}
            </div>

            {works.plinthCutting && (
              <div className="pl-6 space-y-3 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Длина (мм):</span>
                  <input
                    type="number"
                    min={0}
                    value={works.plinthLength || 0}
                    onChange={(e) => handleUpdate({ plinthLength: Number(e.target.value) })}
                    className="w-32 px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs text-center"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Примечание к цоколю (цвет, материал ПВХ/МДФ)..."
                  value={works.plinthNotes || ''}
                  onChange={(e) => handleUpdate({ plinthNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Сохранить и закрыть</span>
          </button>
        </div>
      </div>
    </div>
  );
};
