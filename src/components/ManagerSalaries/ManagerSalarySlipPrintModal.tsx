import React from 'react';
import { X, Printer, User, RussianRuble } from 'lucide-react';
import { ManagerMonthlySalaryCalculation } from './types';

interface ManagerSalarySlipPrintModalProps {
  calculation: ManagerMonthlySalaryCalculation;
  companyName: string;
  onClose: () => void;
}

export const ManagerSalarySlipPrintModal: React.FC<ManagerSalarySlipPrintModalProps> = ({
  calculation,
  companyName,
  onClose
}) => {
  const [year, month] = (calculation.month || '').split('-');
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const monthLabel = month ? `${monthNames[parseInt(month, 10) - 1]} ${year} года` : calculation.month;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative my-8 print:m-0 print:p-0 print:shadow-none print:max-w-none">
        {/* Action Bar */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <RussianRuble className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Расчетный листок менеджера</h2>
              <p className="text-xs text-gray-500">{calculation.managerName} • {monthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all"
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

        {/* Document Body */}
        <div className="text-gray-900 text-xs leading-relaxed font-sans print:text-black">
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                {companyName || 'ООО «Мебельная компания»'}
              </div>
              <h1 className="text-lg font-black uppercase tracking-tight">
                РАСЧЕТНЫЙ ЛИСТОК ЗА {monthLabel.toUpperCase()}
              </h1>
              <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-2">
                <span>Менеджер: {calculation.managerName}</span>
                {calculation.managerEmail && <span className="text-xs text-gray-500 font-normal">({calculation.managerEmail})</span>}
              </div>
            </div>
            <div className="text-right border-l-2 border-gray-300 pl-4">
              <div className="text-[10px] text-gray-500 uppercase font-bold">ИТОГО К ВЫПЛАТЕ:</div>
              <div className="text-xl font-black text-emerald-700 mt-0.5 print:text-black">
                {calculation.totalPayout.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl print:border-black print:bg-white text-xs">
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Встречи / Сделки</div>
              <div className="text-sm font-black mt-0.5">
                {calculation.formalizedCount} из {calculation.totalMeetings}
              </div>
              <div className="text-[10px] text-gray-500">оформлено договоров</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Конверсия</div>
              <div className={`text-sm font-black mt-0.5 ${calculation.conversionAchieved ? 'text-emerald-700' : 'text-amber-700'}`}>
                {calculation.conversionPercent}%
              </div>
              <div className="text-[10px] text-gray-500">порог: {calculation.conversionThreshold}% {calculation.conversionAchieved ? '✓' : '✗'}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Объем продаж</div>
              <div className="text-sm font-black mt-0.5">
                {calculation.totalSales.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-[10px] text-gray-500">по договорам месяца</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">План продаж</div>
              <div className="text-sm font-black mt-0.5">
                {calculation.salesPlanPercent}%
              </div>
              <div className="text-[10px] text-gray-500">план: {calculation.salesPlanTarget.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>

          {/* Accruals Breakdown Table */}
          <table className="w-full border-collapse border border-black text-xs mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-3 py-2 text-left">Вид начисления / Показатель</th>
                <th className="border border-black px-3 py-2 text-left">Основание / Расчет</th>
                <th className="border border-black px-3 py-2 text-right w-36">Сумма (₽)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-1.5 font-bold">Гарантированный оклад</td>
                <td className="border border-black px-3 py-1.5 text-gray-600">
                  {calculation.policyUsed.hasBaseSalary ? 'По условиям схемы премирования' : 'Оклад не установлен'}
                </td>
                <td className="border border-black px-3 py-1.5 text-right font-bold">
                  {calculation.baseSalary.toLocaleString('ru-RU')} ₽
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-1.5 font-bold">Комиссия со сделок (базовая)</td>
                <td className="border border-black px-3 py-1.5 text-gray-600">
                  {calculation.policyUsed.splitByTypes ? (
                    `Прод: ${calculation.productsTotal.toLocaleString('ru-RU')}₽ (${calculation.policyUsed.productsPercent}%), Стол: ${calculation.countertopsTotal.toLocaleString('ru-RU')}₽, Техн: ${calculation.appliancesTotal.toLocaleString('ru-RU')}₽, Тов: ${calculation.goodsTotal.toLocaleString('ru-RU')}₽`
                  ) : (
                    `Общая сумма ${calculation.totalSales.toLocaleString('ru-RU')}₽ × ${calculation.policyUsed.generalPercent}%`
                  )}
                </td>
                <td className="border border-black px-3 py-1.5 text-right font-bold">
                  {calculation.baseCommission.toLocaleString('ru-RU')} ₽
                </td>
              </tr>
              {calculation.conversionAchieved && (
                <>
                  {calculation.conversionExtraCommission > 0 && (
                    <tr>
                      <td className="border border-black px-3 py-1.5 font-bold text-emerald-800">
                        Повышенный % за конверсию (+{calculation.policyUsed.conversionExtraPercent}%)
                      </td>
                      <td className="border border-black px-3 py-1.5 text-gray-600">
                        Конверсия {calculation.conversionPercent}% ≥ порога {calculation.conversionThreshold}%
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right font-bold text-emerald-800">
                        +{calculation.conversionExtraCommission.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  )}
                  {calculation.conversionFixedBonus > 0 && (
                    <tr>
                      <td className="border border-black px-3 py-1.5 font-bold text-emerald-800">
                        Фиксированная премия за конверсию
                      </td>
                      <td className="border border-black px-3 py-1.5 text-gray-600">
                        Успешное выполнение нормы конверсии встреч
                      </td>
                      <td className="border border-black px-3 py-1.5 text-right font-bold text-emerald-800">
                        +{calculation.conversionFixedBonus.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  )}
                </>
              )}
              {calculation.planBonusEarned > 0 && (
                <tr>
                  <td className="border border-black px-3 py-1.5 font-bold text-emerald-800">
                    Бонус за выполнение плана продаж
                  </td>
                  <td className="border border-black px-3 py-1.5 text-gray-600">
                    Выполнение {calculation.salesPlanPercent}% от плана
                  </td>
                  <td className="border border-black px-3 py-1.5 text-right font-bold text-emerald-800">
                    +{calculation.planBonusEarned.toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              )}
              {calculation.dealPenalties > 0 && (
                <tr>
                  <td className="border border-black px-3 py-1.5 font-bold text-red-700">
                    Штрафы и удержания
                  </td>
                  <td className="border border-black px-3 py-1.5 text-gray-600">
                    Удержания по сделкам месяца
                  </td>
                  <td className="border border-black px-3 py-1.5 text-right font-bold text-red-700">
                    -{calculation.dealPenalties.toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              )}
              <tr className="bg-gray-100 font-bold border-t-2 border-black">
                <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase">
                  ИТОГО НАЧИСЛЕНО К ВЫПЛАТЕ:
                </td>
                <td className="border border-black px-3 py-2 text-right text-sm text-emerald-800 print:text-black">
                  {calculation.totalPayout.toLocaleString('ru-RU')} ₽
                </td>
              </tr>
            </tbody>
          </table>

          {/* Deals details table */}
          {calculation.dealsBreakdown && calculation.dealsBreakdown.length > 0 && (
            <div className="mb-6">
              <div className="font-bold uppercase text-[11px] mb-2">Детализация по договорам и платежам:</div>
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-black px-2 py-1 text-left">№ Договора</th>
                    <th className="border border-black px-2 py-1 text-left">Заказчик</th>
                    <th className="border border-black px-2 py-1 text-right">Сумма (₽)</th>
                    <th className="border border-black px-2 py-1 text-right">Оплачено клиентом</th>
                    <th className="border border-black px-2 py-1 text-right">Премия полная</th>
                    <th className="border border-black px-2 py-1 text-right">К выплате в мес.</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.dealsBreakdown.map((item, idx) => (
                    <tr key={item.deal.id || idx}>
                      <td className="border border-black px-2 py-1 font-bold">{item.deal.contractNumber || 'Б/Н'}</td>
                      <td className="border border-black px-2 py-1">{item.deal.clientName || '—'}</td>
                      <td className="border border-black px-2 py-1 text-right">{(item.deal.contractAmount || 0).toLocaleString('ru-RU')} ₽</td>
                      <td className="border border-black px-2 py-1 text-right font-semibold text-emerald-700">
                        {item.paidInThisMonth > 0 ? `+${item.paidInThisMonth.toLocaleString('ru-RU')} ₽` : '—'}
                      </td>
                      <td className="border border-black px-2 py-1 text-right">{item.dealCommissionWithConversion.toLocaleString('ru-RU')} ₽</td>
                      <td className="border border-black px-2 py-1 text-right font-bold">{item.payableCommissionThisMonth.toLocaleString('ru-RU')} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-gray-300 text-xs">
            <div>
              <div className="font-bold mb-3">Главный бухгалтер / Руководитель:</div>
              <div className="border-b border-black w-48 mb-1"></div>
              <div className="text-[10px] text-gray-500">(подпись)</div>
            </div>
            <div>
              <div className="font-bold mb-3">Сотрудник (с расчетом ознакомлен):</div>
              <div className="border-b border-black w-48 mb-1"></div>
              <div className="text-[10px] text-gray-500">(подпись сотрудника)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
