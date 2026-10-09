import React from 'react';
import { X, Printer, Award, FileText } from 'lucide-react';
import { BonusPolicy, PayoutSettings } from './types';

interface BonusPolicyPrintModalProps {
  policy: BonusPolicy;
  payoutSettings: PayoutSettings;
  companyName: string;
  onClose: () => void;
}

export const BonusPolicyPrintModal: React.FC<BonusPolicyPrintModalProps> = ({
  policy,
  payoutSettings,
  companyName,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getBaseLabel = (base: string) => {
    switch (base) {
      case 'products': return 'Сумма Продукция';
      case 'countertops': return 'Столешницы заказные';
      case 'appliances': return 'Техника';
      case 'goods': return 'Сумма Товары';
      case 'general':
      case 'all':
      default: return 'Общая сумма договора';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative my-8 print:m-0 print:p-0 print:shadow-none print:max-w-none">
        {/* Screen Action Bar */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Печать схемы премирования</h2>
              <p className="text-xs text-gray-500">Официальное Положение для выдачи сотрудникам под роспись</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 flex items-center gap-1.5 transition-all"
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

        {/* Printable Document */}
        <div className="text-gray-900 text-xs leading-relaxed font-sans print:text-black">
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                {companyName || 'ООО «Мебельная компания»'}
              </div>
              <h1 className="text-lg font-black uppercase tracking-tight">
                ПОЛОЖЕНИЕ О СИСТЕМЕ ОПЛАТЫ ТРУДА И ПРЕМИРОВАНИИ МЕНЕДЖЕРОВ ПО ПРОДАЖАМ
              </h1>
              <div className="text-[11px] text-gray-600 mt-1">
                Дата вступления в силу: <span className="font-bold">{new Date(policy.effectiveDate).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <div className="text-right border-l-2 border-gray-300 pl-4 text-[11px]">
              <div className="font-bold">УТВЕРЖДЕНО:</div>
              <div className="text-gray-600 mt-1">Приказом Генерального директора</div>
              <div className="mt-4 border-b border-black w-32 ml-auto"></div>
              <div className="text-[9px] text-gray-400 mt-0.5">(подпись / М.П.)</div>
            </div>
          </div>

          {/* Section 1: Общие положения и Оклад */}
          <div className="mb-4">
            <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-[12px]">
              1. Базовая часть (Оклад)
            </h3>
            <p className="mb-1">
              {policy.hasBaseSalary ? (
                <>
                  Сотруднику устанавливается гарантированный ежемесячный должностной оклад в размере{' '}
                  <span className="font-bold underline">{policy.baseSalaryAmount.toLocaleString('ru-RU')} рублей</span> при выполнении норм рабочего времени.
                </>
              ) : (
                <>Должностной оклад не предусмотрен (100% сдельная оплата от продаж).</>
              )}
            </p>
          </div>

          {/* Section 2: Проценты со сделок */}
          <div className="mb-4">
            <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-[12px]">
              2. Премирование от объема продаж (Комиссия со сделок)
            </h3>
            {policy.splitByTypes ? (
              <div>
                <p className="mb-2">Премия начисляется раздельно по товарным направлениям оформленных договоров:</p>
                <table className="w-full border-collapse border border-black text-[11px] mb-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1.5 text-left">Категория начисления</th>
                      <th className="border border-black px-2 py-1.5 text-center w-28">Ставка комиссии (%)</th>
                      <th className="border border-black px-2 py-1.5 text-left">Примечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-1.5 font-bold">Сумма Продукция (корпуса, фасады, мебель)</td>
                      <td className="border border-black px-2 py-1.5 text-center font-bold text-blue-700">{policy.productsPercent}%</td>
                      <td className="border border-black px-2 py-1.5 text-gray-600">Основное собственное производство</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1.5 font-bold">Столешницы заказные (искусственный камень / HPL)</td>
                      <td className="border border-black px-2 py-1.5 text-center font-bold text-blue-700">{policy.countertopsPercent}%</td>
                      <td className="border border-black px-2 py-1.5 text-gray-600">Заказные позиции столешниц</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1.5 font-bold">Бытовая техника (встраиваемая, мойки, смесители)</td>
                      <td className="border border-black px-2 py-1.5 text-center font-bold text-blue-700">{policy.appliancesPercent}%</td>
                      <td className="border border-black px-2 py-1.5 text-gray-600">Партнерская техника</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1.5 font-bold">Сумма Товары (сопутствующие товары, фурнитура)</td>
                      <td className="border border-black px-2 py-1.5 text-center font-bold text-blue-700">{policy.goodsPercent}%</td>
                      <td className="border border-black px-2 py-1.5 text-gray-600">Рассчитывается автоматически</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                Премия начисляется по единой ставке от Общей суммы договора:{' '}
                <span className="font-bold underline">{policy.generalPercent}%</span> от суммы продажи.
              </p>
            )}
          </div>

          {/* Section 3: Конверсия */}
          <div className="mb-4">
            <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-[12px]">
              3. Система бонусирования за выполнение нормы конверсии
            </h3>
            <p className="mb-1.5">
              Конверсия рассчитывается как отношение количества оформленных договоров к общему количеству проведенных встреч за календарный месяц:{' '}
              <span className="font-mono font-bold">(Оформленные договоры / Всего встреч) × 100%</span>.
            </p>
            <div className="p-3 bg-gray-50 border border-black rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold">Порог конверсии: </span>
                  <span className="underline font-bold">{policy.conversionThresholdPercent}%</span>
                </div>
                <div>
                  <span className="font-bold">Фиксированная премия за конверсию: </span>
                  <span className="underline font-bold">{policy.conversionFixedBonus.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div>
                  <span className="font-bold">Дополнительный процент: </span>
                  <span className="underline font-bold">+{policy.conversionExtraPercent}%</span>
                </div>
                <div>
                  <span className="font-bold">База начисления доп. процента: </span>
                  <span className="underline font-bold">{getBaseLabel(policy.conversionExtraBase)}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                * При конверсии ниже {policy.conversionThresholdPercent}% дополнительные бонусы и повышенный процент не выплачиваются.
              </p>
            </div>
          </div>

          {/* Section 4: План продаж */}
          <div className="mb-4">
            <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-[12px]">
              4. Бонус за выполнение личного плана продаж
            </h3>
            {policy.linkToSalesPlan ? (
              <p>
                При достижении 100% и более установленного на месяц плана продаж сотруднику начисляется дополнительный бонус:{' '}
                <span className="font-bold underline">
                  {policy.planBonusType === 'fixed'
                    ? `${policy.planBonusValue.toLocaleString('ru-RU')} рублей`
                    : `${policy.planBonusValue}% от объема личных продаж`}
                </span>.
              </p>
            ) : (
              <p>Премирование не привязано к порогу выполнения плана продаж.</p>
            )}
          </div>

          {/* Section 5: Порядок выплат */}
          <div className="mb-4">
            <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-[12px]">
              5. Порядок и график выплат
            </h3>
            <p className="mb-1">
              Формат выплаты:{' '}
              <span className="font-bold">
                {payoutSettings.payoutMode === 'by_payments'
                  ? 'Пропорционально поступающим оплатам от заказчика (включая авансы)'
                  : 'По факту полного закрытия и передачи договора'}
              </span>
            </p>
            <p className="text-gray-600 mb-2">
              Дни выплат: {payoutSettings.payoutDates?.map(d => `${d.dayOfMonth}-е число (${d.title})`).join(', ') || '10 и 25 числа месяца'}.
            </p>
          </div>

          {/* Section 6: Штрафные санкции */}
          {policy.penaltyRulesNote && (
            <div className="mb-4">
              <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-[12px]">
                6. Удержания и штрафные санкции
              </h3>
              <p className="text-gray-700">{policy.penaltyRulesNote}</p>
            </div>
          )}

          {/* Acknowledgment & Signatures */}
          <div className="mt-8 pt-4 border-t-2 border-black">
            <div className="font-bold uppercase text-[11px] mb-3">
              Лист ознакомления сотрудника с Положением о премировании:
            </div>
            <p className="text-[10px] text-gray-500 mb-6">
              С условиями настоящего Положения о премировании, порядком расчета комиссии, порогами конверсии и графиком выплат ознакомлен(а), согласен(на), один экземпляр получил(а) на руки:
            </p>
            <div className="grid grid-cols-3 gap-6 text-xs">
              <div>
                <div className="text-[10px] text-gray-500 mb-1">ФИО сотрудника:</div>
                <div className="border-b border-black pb-1 font-bold">________________________________</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Личная подпись:</div>
                <div className="border-b border-black pb-1">____________________</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Дата:</div>
                <div className="border-b border-black pb-1">«____» ____________ 202___ г.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
