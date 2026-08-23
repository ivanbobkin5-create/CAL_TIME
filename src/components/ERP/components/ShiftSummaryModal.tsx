import React, { useRef } from 'react';
import { CheckCircle2, X, Printer, Scissors, Layers, Factory, Package, Clock, User, Award, FileText } from 'lucide-react';
import { ProductionOrder, ERPEmployee, ERPCompanySettings } from '../types';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  currentUser?: ERPEmployee | null;
  orders: ProductionOrder[];
  settings?: ERPCompanySettings;
  onClose: () => void;
  onConfirmEndShift?: () => void;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  isOpen,
  currentUser,
  orders,
  settings,
  onClose,
  onConfirmEndShift
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const empName = currentUser?.name || 'Мастер смены';

  // Calculate real performance metrics for today across all orders
  let totalCuttingParts = 0;
  let totalCuttingM2 = 0;
  let totalEdgingParts = 0;
  let totalEdgingM = 0;
  let totalCncParts = 0;
  let totalCncHoles = 0;
  let totalPackedBoxes = 0;

  const processedOrdersMap = new Map<string, { orderNumber: string; clientName: string; totalParts: number; packedParts: number; packagesCount: number }>();

  orders.forEach(ord => {
    const details = ord.birkaData?.details || [];
    const packages = ord.packages || [];
    const totalOrdParts = details.length || ord.partsCount || 1;

    // 1. Cutting Progress
    if (ord.stageScanningProgress?.cutting) {
      Object.values(ord.stageScanningProgress.cutting).forEach(mat => {
        if (mat?.scannedPartIds) {
          mat.scannedPartIds.forEach(partId => {
            const dt = details.find(d => d.id === partId);
            if (dt) {
              totalCuttingParts++;
              totalCuttingM2 += (dt.length * dt.width) / 1000000;
            }
          });
        }
      });
    }

    // 2. Edging Progress
    if (ord.stageScanningProgress?.edging) {
      Object.values(ord.stageScanningProgress.edging).forEach(mat => {
        if (mat?.scannedPartIds) {
          mat.scannedPartIds.forEach(partId => {
            const dt = details.find(d => d.id === partId);
            if (dt) {
              totalEdgingParts++;
              totalEdgingM += ((dt.length + dt.width) * 2) / 1000;
            }
          });
        }
      });
    }

    // 3. CNC Progress
    if (ord.stageScanningProgress?.cnc) {
      Object.values(ord.stageScanningProgress.cnc).forEach(mat => {
        if (mat?.scannedPartIds) {
          mat.scannedPartIds.forEach(partId => {
            const dt = details.find(d => d.id === partId);
            if (dt) {
              totalCncParts++;
              totalCncHoles += dt.holesCount || 4;
            }
          });
        }
      });
    }

    // 4. Packaging Progress
    if (packages.length > 0) {
      const packedDetailIds = new Set(packages.flatMap(p => p.parts.map(pt => pt.detailId)));
      if (packedDetailIds.size > 0 || packages.some(p => p.type === 'kitting')) {
        totalPackedBoxes += packages.length;
        processedOrdersMap.set(ord.id, {
          orderNumber: ord.orderNumber,
          clientName: ord.clientName,
          totalParts: totalOrdParts,
          packedParts: packedDetailIds.size,
          packagesCount: packages.length
        });
      }
    }
  });

  // Calculate sheets estimate (sheet area ~ 5.7 m2)
  const estimatedSheets = Math.ceil(totalCuttingM2 / 5.7);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-300 space-y-4 my-auto max-h-[96vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Отчет выработки по итогу завершения смены
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Фактические результаты работы сотрудника {empName} за {new Date().toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-md hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Печать (А4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Shift Summary A4 Document */}
        <div className="overflow-y-auto flex-1 bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-inner text-slate-900 font-sans print:p-0 print:border-none print:shadow-none">
          <div ref={printAreaRef} className="space-y-6 max-w-[210mm] mx-auto text-xs leading-relaxed">
            
            {/* Header / Banner */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Производственный отчет выработки</span>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                  СМЕННЫЙ ОТЧЕТ СОТРУДНИКА
                </h1>
                <div className="text-xs font-bold text-emerald-700 mt-0.5">
                  Сотрудник: {empName} ({currentUser?.department || 'Цех производства'})
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Дата смены</div>
                <div className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('ru-RU')}</div>
                <div className="text-[10px] text-slate-500">Время: {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            {/* Stage Performance Cards */}
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                Фактическая выработка по участкам
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Cutting */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-blue-900 text-xs">
                    <Scissors className="w-4 h-4 text-blue-600" />
                    <span>Участок раскроя (Распил)</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalCuttingM2.toFixed(2)} м² <span className="text-xs font-normal text-slate-600">(~ {estimatedSheets} листов ЛДСП)</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Распилено деталей: <strong className="font-mono text-slate-900">{totalCuttingParts} шт.</strong>
                  </div>
                </div>

                {/* 2. Edging */}
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-indigo-900 text-xs">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Участок кромкооблицовки</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalEdgingM.toFixed(1)} п.м. <span className="text-xs font-normal text-slate-600">кромки</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Облицовано деталей: <strong className="font-mono text-slate-900">{totalEdgingParts} шт.</strong>
                  </div>
                </div>

                {/* 3. CNC */}
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                    <Factory className="w-4 h-4 text-purple-600" />
                    <span>Участок присадки / ЧПУ</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalCncHoles} <span className="text-xs font-normal text-slate-600">отверстий</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Обработано деталей: <strong className="font-mono text-slate-900">{totalCncParts} шт.</strong>
                  </div>
                </div>

                {/* 4. Packaging */}
                <div className="p-3.5 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 font-black text-orange-900 text-xs">
                    <Package className="w-4 h-4 text-orange-600" />
                    <span>Участок упаковки и комплектовки</span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 mt-1">
                    {totalPackedBoxes} <span className="text-xs font-normal text-slate-600">упакованных мест</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Обработано заказов: <strong className="font-mono text-slate-900">{processedOrdersMap.size} зак.</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Packaging Breakdown */}
            {processedOrdersMap.size > 0 && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
                  Статус комплектации и упаковки заказов за смену
                </h2>

                <table className="w-full border-collapse border border-slate-900 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold text-left">
                      <th className="border border-slate-900 p-2">№ Заказа</th>
                      <th className="border border-slate-900 p-2">Заказчик</th>
                      <th className="border border-slate-900 p-2 text-center">Сформировано мест</th>
                      <th className="border border-slate-900 p-2 text-center">Прогресс упаковки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(processedOrdersMap.values()).map((row, idx) => {
                      const pct = Math.min(100, Math.round((row.packedParts / Math.max(1, row.totalParts)) * 100));
                      return (
                        <tr key={idx}>
                          <td className="border border-slate-900 p-2 font-mono font-bold">{row.orderNumber}</td>
                          <td className="border border-slate-900 p-2 font-bold">{row.clientName}</td>
                          <td className="border border-slate-900 p-2 text-center font-mono font-bold">{row.packagesCount} упак.</td>
                          <td className="border border-slate-900 p-2 text-center font-mono font-bold">
                            <span className={pct === 100 ? 'text-emerald-700 font-black' : 'text-orange-700'}>
                              {pct}% ({row.packedParts} / {row.totalParts} дет.)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signatures Footer */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 font-medium">
              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-6">Смену сдал (Сотрудник):</div>
                <div className="border-b border-slate-900 pb-1 font-bold">{empName} _______________</div>
              </div>

              <div>
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-6">Смену принял (Мастер/Нач. цеха):</div>
                <div className="border-b border-slate-900 pb-1 font-bold">__________________________</div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
          >
            Закрыть окно
          </button>

          {onConfirmEndShift && (
            <button
              type="button"
              onClick={() => {
                onConfirmEndShift();
                onClose();
              }}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Подтвердить завершение смены</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
