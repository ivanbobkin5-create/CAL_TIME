import React from 'react';
import { X, Printer } from 'lucide-react';
import { MonthlySalesPlan } from './types';

interface SalesPlanPrintModalProps {
  salesPlan: MonthlySalesPlan;
  companyName: string;
  managers: Array<{ id: string; name: string; email?: string }>;
  actualSalesByManager: Record<string, number>;
  onClose: () => void;
}

export const SalesPlanPrintModal: React.FC<SalesPlanPrintModalProps> = ({
  salesPlan,
  companyName,
  managers,
  actualSalesByManager,
  onClose
}) => {
  const [year, month] = (salesPlan.month || '').split('-');
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const monthLabel = month ? `${monthNames[parseInt(month, 10) - 1]} ${year} года` : salesPlan.month;

  const totalPlan = salesPlan.companyTargetAmount || 0;
  const totalActual = Object.values(actualSalesByManager).reduce((a, b) => a + b, 0);
  const totalPct = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 1000) / 10 : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative my-8 print:m-0 print:p-0 print:shadow-none print:max-w-none">
        {/* Screen Action Bar (hidden in print) */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Печать плана продаж</h2>
              <p className="text-xs text-gray-500">Документ утверждения и контроля показателей на {monthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" /> Распечатать / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="text-gray-900 text-sm leading-relaxed font-sans print:text-black">
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">
                {companyName || 'ООО «Мебельная компания»'}
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight">
                ПЛАН ПРОДАЖ НА {monthLabel.toUpperCase()}
              </h1>
              <div className="text-xs text-gray-600 mt-1">
                Статус документа: <span className="font-bold uppercase">{salesPlan.status === 'approved' ? 'УТВЕРЖДЕН' : 'ПРОЕКТ / ЧЕРНОВИК'}</span>
                {salesPlan.approvedAt && ` от ${new Date(salesPlan.approvedAt).toLocaleDateString('ru-RU')}`}
              </div>
            </div>
            <div className="text-right border-l-2 border-gray-300 pl-4 text-xs">
              <div className="font-bold">УТВЕРЖДАЮ:</div>
              <div className="text-gray-600 mt-1">Руководитель компании</div>
              <div className="mt-4 border-b border-black w-36 ml-auto"></div>
              <div className="text-[10px] text-gray-400 mt-0.5">(подпись / расшифровка)</div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl print:border-black print:bg-white">
            <div>
              <div className="text-[11px] text-gray-500 uppercase font-bold">Общий план компании</div>
              <div className="text-lg font-black mt-0.5">{totalPlan.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 uppercase font-bold">Текущий факт продаж</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">{totalActual.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 uppercase font-bold">Процент выполнения</div>
              <div className={`text-lg font-black mt-0.5 ${totalPct >= 100 ? 'text-emerald-700' : 'text-blue-700'}`}>
                {totalPct}%
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-black text-xs mb-6">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200">
                <th className="border border-black px-2 py-2 text-left w-8">№</th>
                <th className="border border-black px-3 py-2 text-left">Менеджер по продажам</th>
                <th className="border border-black px-3 py-2 text-right">План продаж (₽)</th>
                <th className="border border-black px-3 py-2 text-center w-24">План встреч</th>
                <th className="border border-black px-3 py-2 text-center w-24">Конверсия план</th>
                <th className="border border-black px-3 py-2 text-right">Факт продаж (₽)</th>
                <th className="border border-black px-3 py-2 text-center w-20">% вып.</th>
                <th className="border border-black px-3 py-2 text-center w-28">Подпись</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m, idx) => {
                const p = salesPlan.managerPlans?.[m.id] || { targetAmount: 0 };
                const actual = actualSalesByManager[m.id] || 0;
                const pct = p.targetAmount > 0 ? Math.round((actual / p.targetAmount) * 1000) / 10 : 0;
                return (
                  <tr key={m.id} className="border border-black">
                    <td className="border border-black px-2 py-2 text-center">{idx + 1}</td>
                    <td className="border border-black px-3 py-2 font-medium">
                      {m.name}
                      {m.email && <div className="text-[10px] text-gray-500">{m.email}</div>}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-bold">
                      {p.targetAmount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="border border-black px-3 py-2 text-center">
                      {p.targetMeetingsCount || '—'}
                    </td>
                    <td className="border border-black px-3 py-2 text-center">
                      {p.targetConversionPercent ? `${p.targetConversionPercent}%` : '—'}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-semibold">
                      {actual.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="border border-black px-3 py-2 text-center font-bold">
                      {pct > 0 ? `${pct}%` : '0%'}
                    </td>
                    <td className="border border-black px-3 py-2 text-center text-gray-300">
                      ____________
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-100 font-bold border-t-2 border-black">
                <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase">Итого по компании:</td>
                <td className="border border-black px-3 py-2 text-right">{totalPlan.toLocaleString('ru-RU')} ₽</td>
                <td className="border border-black px-3 py-2 text-center">—</td>
                <td className="border border-black px-3 py-2 text-center">—</td>
                <td className="border border-black px-3 py-2 text-right text-emerald-800">{totalActual.toLocaleString('ru-RU')} ₽</td>
                <td className="border border-black px-3 py-2 text-center">{totalPct}%</td>
                <td className="border border-black px-3 py-2 text-center"></td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          {salesPlan.notes && (
            <div className="mb-6 p-3 border border-gray-300 rounded-lg text-xs bg-gray-50">
              <span className="font-bold">Примечания и задачи: </span>
              {salesPlan.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-gray-300 text-xs">
            <div>
              <div className="font-bold mb-4">Руководитель отдела продаж:</div>
              <div className="border-b border-black w-48 mb-1"></div>
              <div className="text-[10px] text-gray-500">(подпись / расшифровка)</div>
            </div>
            <div>
              <div className="font-bold mb-4">Дата утверждения:</div>
              <div>«____» ________________ 202___ г.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
