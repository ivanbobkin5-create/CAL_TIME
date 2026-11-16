import React from 'react';
import { Printer, Check, X, ShieldCheck } from 'lucide-react';
import { MaterialResidual } from '../types';
import { printRemainsLabelDirect } from '../utils/remainsLabelPrinter';

interface RemainsLabelPrintModalProps {
  isOpen: boolean;
  residuals: MaterialResidual[];
  onClose: () => void;
  widthMm?: number;
  heightMm?: number;
}

export const RemainsLabelPrintModal: React.FC<RemainsLabelPrintModalProps> = ({
  isOpen,
  residuals,
  onClose,
  widthMm = 58,
  heightMm = 40
}) => {
  if (!isOpen || residuals.length === 0) return null;

  const extractClientSurname = (name?: string) => {
    if (!name) return "Заказчик";
    const parts = name.trim().split(/\s+/);
    return parts.length > 0 ? parts[0] : name;
  };

  const handlePrintSingle = async (res: MaterialResidual) => {
    const dimensions = res.type === 'edge' 
      ? `${res.lengthMeters} м` 
      : `${res.lengthMm}x${res.widthMm}`;
    
    const clientSurname = extractClientSurname(res.clientName);

    await printRemainsLabelDirect(
      res.materialName,
      dimensions,
      res.orderNumber ? `Заказ #${res.orderNumber}` : "Остаток склада",
      clientSurname,
      { widthMm, heightMm }
    );
  };

  const handlePrintAll = async () => {
    for (const res of residuals) {
      await handlePrintSingle(res);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Printer className="w-5 h-5 text-blue-300 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-blue-300 font-bold">
                Внесение остатков • Печать бирок
              </div>
              <h3 className="text-base font-black text-white">
                Рекомендуется распечатать термоэтикетки ({residuals.length} шт)
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

        {/* Label list preview */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-medium leading-relaxed">
            Система сгенерировала термоэтикетки со специальной разметкой (пунктирные линии — это полоса 16 мм для наклейки на торец плиты). Наклейте их на деловые остатки перед отправкой на склад хранения.
          </div>

          <div className="space-y-4">
            {residuals.map((res, index) => {
              const dimensions = res.type === 'edge' 
                ? `${res.lengthMeters} м` 
                : `${res.lengthMm}x${res.widthMm}`;
              
              const parts = (res.clientName || "Заказчик").trim().split(/\s+/);
              const surname = parts.length > 0 ? parts[0] : (res.clientName || "Заказчик");

              return (
                <div 
                  key={res.id} 
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Visual preview matching the user image exactly */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                      Превью этикетки #{index + 1} ({res.type === 'edge' ? 'Кромка' : 'Обрезок'})
                    </div>
                    
                    {/* High-fidelity label card matching the layout of the user image */}
                    <div 
                      className="border border-slate-300 rounded-xl bg-white p-3 mx-auto relative overflow-hidden select-none"
                      style={{ 
                        aspectRatio: '58/40', 
                        maxWidth: '240px',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Dotted lines defining the exact 16mm strip */}
                      <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-center pointer-events-none">
                        <div className="w-full border-t border-dashed border-slate-400"></div>
                        {/* 16mm tall gap in preview (roughly scaled to fit aspect ratio) */}
                        <div className="w-full h-12"></div>
                        <div className="w-full border-b border-dashed border-slate-400"></div>
                      </div>

                      {/* Content aligned inside the 16mm band */}
                      <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                        {/* Left Column (Material Name) */}
                        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                          <div 
                            className="font-black text-slate-900 leading-tight uppercase truncate"
                            style={{ fontSize: '9px' }}
                            title={res.materialName}
                          >
                            {res.materialName.substring(0, 18)}
                          </div>
                          {res.materialName.length > 18 && (
                            <div 
                              className="font-bold text-slate-700 leading-tight uppercase truncate mt-0.5"
                              style={{ fontSize: '7.5px' }}
                            >
                              {res.materialName.substring(18, 36)}
                            </div>
                          )}
                        </div>

                        {/* Right Column (Dimensions, Order, Client Surname) */}
                        <div className="flex flex-col items-end justify-center text-right shrink-0">
                          <div className="font-extrabold text-slate-950 font-mono leading-none" style={{ fontSize: '12px' }}>
                            {dimensions}
                          </div>
                          <div className="text-[7.5px] font-bold text-slate-800 mt-1 font-mono">
                            {res.orderNumber ? `Заказ #${res.orderNumber}` : "Остаток"}
                          </div>
                          <div className="text-[7px] font-bold text-slate-600 mt-0.5" title={`Фамилия заказчика: ${surname}`}>
                            {surname}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Action for this label */}
                  <div className="flex items-center gap-2 shrink-0 md:self-center">
                    <button
                      onClick={() => handlePrintSingle(res)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Печать</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            Пропустить и закрыть
          </button>

          <button
            type="button"
            onClick={handlePrintAll}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Распечатать все бирки остатков ({residuals.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
