import React, { useState, useMemo } from 'react';
import {
  X,
  DollarSign,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  Printer,
  Briefcase,
  CreditCard,
  Banknote,
  Building2,
  BarChart3,
  FileText,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import {
  ManagerMonthlySalaryCalculation,
  SalaryPayoutRecord,
  ManagerDeal
} from './types';

interface ManagerPayoutDetailModalProps {
  calculation: ManagerMonthlySalaryCalculation;
  monthLabel: string;
  allPayouts: SalaryPayoutRecord[];
  allDeals: ManagerDeal[];
  canManagePayouts: boolean;
  onAddPayout: (payout: Omit<SalaryPayoutRecord, 'id' | 'companyId' | 'createdAt'>) => Promise<void>;
  onDeletePayout: (payoutId: string) => Promise<void>;
  onPrintSlip: (calc: ManagerMonthlySalaryCalculation) => void;
  onClose: () => void;
}

const PAYOUT_TYPE_LABELS: Record<SalaryPayoutRecord['payoutType'], { label: string; color: string }> = {
  advance: { label: 'Аванс', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  base_salary: { label: 'Оклад', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  commission: { label: 'Премия по заказам', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  bonus: { label: 'Бонус (план / конверсия)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  full_settlement: { label: 'Полный расчет', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

const PAYMENT_METHOD_LABELS: Record<NonNullable<SalaryPayoutRecord['paymentMethod']>, { label: string; icon: any }> = {
  cash: { label: 'Наличные', icon: Banknote },
  card: { label: 'На карту', icon: CreditCard },
  bank_transfer: { label: 'Расчетный счет', icon: Building2 },
};

export const ManagerPayoutDetailModal: React.FC<ManagerPayoutDetailModalProps> = ({
  calculation,
  monthLabel,
  allPayouts,
  allDeals,
  canManagePayouts,
  onAddPayout,
  onDeletePayout,
  onPrintSlip,
  onClose,
}) => {
  const managerPayouts = useMemo(() => {
    return allPayouts
      .filter((p) => p.managerId === calculation.managerId)
      .sort((a, b) => new Date(b.payoutDate || b.createdAt).getTime() - new Date(a.payoutDate || a.createdAt).getTime());
  }, [allPayouts, calculation.managerId]);

  const monthPayouts = useMemo(() => {
    return managerPayouts.filter((p) => p.month === calculation.month);
  }, [managerPayouts, calculation.month]);

  const totalPaidForMonth = useMemo(() => {
    return monthPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [monthPayouts]);

  const totalPaidAllTime = useMemo(() => {
    return managerPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [managerPayouts]);

  const remainingForMonth = Math.max(0, calculation.totalPayout - totalPaidForMonth);

  // Form state for recording a payout
  const [amount, setAmount] = useState<string>(remainingForMonth > 0 ? String(Math.round(remainingForMonth)) : '');
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [payoutType, setPayoutType] = useState<SalaryPayoutRecord['payoutType']>('full_settlement');
  const [paymentMethod, setPaymentMethod] = useState<NonNullable<SalaryPayoutRecord['paymentMethod']>>('card');
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyScope, setHistoryScope] = useState<'month' | 'all'>('month');

  // Deals available to link
  const managerFormalizedDeals = useMemo(() => {
    return allDeals.filter(
      (d) => d.managerId === calculation.managerId && d.status === 'formalized'
    );
  }, [allDeals, calculation.managerId]);

  // Group payouts by dealId to show how much was paid per order
  const paidByDealId = useMemo(() => {
    const map: Record<string, number> = {};
    managerPayouts.forEach((p) => {
      if (p.dealId) {
        map[p.dealId] = (map[p.dealId] || 0) + (Number(p.amount) || 0);
      }
    });
    return map;
  }, [managerPayouts]);

  // Chart data: group payouts by date (for current month or last 8 payouts)
  const payoutTimelineChart = useMemo(() => {
    const source = historyScope === 'month' ? monthPayouts : managerPayouts.slice(0, 12);
    const byDateMap = new Map<string, { date: string; amount: number; count: number; items: SalaryPayoutRecord[] }>();
    source.forEach((p) => {
      const d = p.payoutDate || p.createdAt.substring(0, 10);
      const existing = byDateMap.get(d) || { date: d, amount: 0, count: 0, items: [] };
      existing.amount += Number(p.amount) || 0;
      existing.count += 1;
      existing.items.push(p);
      byDateMap.set(d, existing);
    });
    const arr = Array.from(byDateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const maxAmount = Math.max(...arr.map((x) => x.amount), calculation.totalPayout || 1, 1);
    return { items: arr, maxAmount };
  }, [historyScope, monthPayouts, managerPayouts, calculation.totalPayout]);

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const linkedDeal = managerFormalizedDeals.find((d) => d.id === selectedDealId);
      await onAddPayout({
        managerId: calculation.managerId,
        managerName: calculation.managerName,
        month: calculation.month,
        payoutDate,
        amount: numAmount,
        payoutType,
        paymentMethod,
        dealId: linkedDeal?.id || undefined,
        dealContractNumber: linkedDeal?.contractNumber || undefined,
        dealClientName: linkedDeal?.clientName || undefined,
        comment: comment.trim() || undefined,
      });

      const nextRemaining = Math.max(0, remainingForMonth - numAmount);
      setAmount(nextRemaining > 0 ? String(Math.round(nextRemaining)) : '');
      setSelectedDealId('');
      setComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDealForPayout = (deal: ManagerDeal, dealCommission: number) => {
    const alreadyPaid = paidByDealId[deal.id] || 0;
    const toPay = Math.max(0, Math.round(dealCommission - alreadyPaid));
    setSelectedDealId(deal.id);
    setPayoutType('commission');
    setAmount(String(toPay > 0 ? toPay : Math.round(dealCommission)));
    setComment(`Выплата премии по договору №${deal.contractNumber || 'б/н'} (${deal.clientName || 'Клиент'})`);
  };

  const displayedPayouts = historyScope === 'month' ? monthPayouts : managerPayouts;
  const paidPercent = calculation.totalPayout > 0
    ? Math.min(100, Math.round((totalPaidForMonth / calculation.totalPayout) * 100))
    : (totalPaidForMonth > 0 ? 100 : 0);

  return (
    <div
      className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-5xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-100">
              {calculation.managerName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900">{calculation.managerName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {monthLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Детальный отчет по начислениям, заказам, график и фиксация выдачи зарплаты
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onPrintSlip(calculation)}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Расчетный листок
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Начислено за {monthLabel}</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {calculation.totalPayout.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Оклад: {calculation.baseSalary.toLocaleString('ru-RU')} ₽ • Премии: {(calculation.totalPayout - calculation.baseSalary).toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-700 uppercase">Выплачено за месяц</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {totalPaidForMonth.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Выплат зафиксировано: {monthPayouts.length} ({paidPercent}%)
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${remainingForMonth > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-blue-50/60 border-blue-200'}`}>
            <div className={`text-[11px] font-bold uppercase ${remainingForMonth > 0 ? 'text-amber-700' : 'text-blue-700'}`}>
              {remainingForMonth > 0 ? 'Остаток к выдаче' : 'Статус расчета'}
            </div>
            <div className={`text-2xl font-black mt-1 ${remainingForMonth > 0 ? 'text-amber-700' : 'text-blue-700'}`}>
              {remainingForMonth > 0 ? `${remainingForMonth.toLocaleString('ru-RU')} ₽` : 'Выплачено полностью ✓'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalPaidForMonth > calculation.totalPayout
                ? `Переплата / Аванс: +${(totalPaidForMonth - calculation.totalPayout).toLocaleString('ru-RU')} ₽`
                : 'За выбранный расчетный месяц'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
            <div className="text-[11px] font-bold text-purple-700 uppercase">Всего выдано (за всё время)</div>
            <div className="text-2xl font-black text-purple-900 mt-1">
              {totalPaidAllTime.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-[11px] text-purple-600 mt-1">
              Всего операций выдачи: {managerPayouts.length}
            </div>
          </div>
        </div>

        {/* Progress bar of monthly payout */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Прогресс выплаты зарплаты за {monthLabel}</span>
            <span className="font-black text-slate-900">
              {totalPaidForMonth.toLocaleString('ru-RU')} ₽ из {calculation.totalPayout.toLocaleString('ru-RU')} ₽ ({paidPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>

        {/* Section 1: Record Salary Payout Form */}
        {canManagePayouts && (
          <div className="p-5 bg-gradient-to-br from-emerald-50/60 via-white to-blue-50/40 rounded-2xl border border-emerald-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Зафиксировать выдачу зарплаты
                </h3>
              </div>
              {/* Quick amount buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {remainingForMonth > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(Math.round(remainingForMonth)));
                      setPayoutType('full_settlement');
                    }}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Весь остаток ({Math.round(remainingForMonth).toLocaleString('ru-RU')} ₽)
                  </button>
                )}
                {calculation.baseSalary > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(Math.round(calculation.baseSalary)));
                      setPayoutType('base_salary');
                      setComment(`Выплата оклада за ${monthLabel}`);
                    }}
                    className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Оклад ({calculation.baseSalary.toLocaleString('ru-RU')} ₽)
                  </button>
                )}
                {calculation.baseCommission > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(String(Math.round(calculation.baseCommission)));
                      setPayoutType('commission');
                      setComment(`Премия со сделок за ${monthLabel}`);
                    }}
                    className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Премия со сделок ({Math.round(calculation.baseCommission).toLocaleString('ru-RU')} ₽)
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitPayout} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Сумма выдачи (₽) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Например: 35000"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Дата выдачи *</label>
                <input
                  type="date"
                  required
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Тип выплаты</label>
                <select
                  value={payoutType}
                  onChange={(e) => setPayoutType(e.target.value as SalaryPayoutRecord['payoutType'])}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="full_settlement">Полный расчет</option>
                  <option value="advance">Аванс</option>
                  <option value="base_salary">Оклад</option>
                  <option value="commission">Премия по заказам</option>
                  <option value="bonus">Бонус (план / конверсия)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Способ выплаты</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as NonNullable<SalaryPayoutRecord['paymentMethod']>)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="card">На карту</option>
                  <option value="cash">Наличные (из кассы)</option>
                  <option value="bank_transfer">Расчетный счет</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Привязать к заказу / договору (необязательно)
                </label>
                <select
                  value={selectedDealId}
                  onChange={(e) => setSelectedDealId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">— Общая выплата за {monthLabel} (без привязки к одному заказу) —</option>
                  {managerFormalizedDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      Договор №{d.contractNumber || 'б/н'} — {d.clientName || 'Клиент'} ({(d.contractAmount || 0).toLocaleString('ru-RU')} ₽)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Комментарий к выплате</label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Например: Выплата за заказы первой половины месяца"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Зафиксировать выдачу
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Section 2: Visual Payout Schedule / Chart */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">График выплат зарплаты</h3>
                <p className="text-[11px] text-slate-500">Когда и сколько выплачивалось сотруднику по датам</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setHistoryScope('month')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyScope === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                За {monthLabel} ({monthPayouts.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryScope('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyScope === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Вся история ({managerPayouts.length})
              </button>
            </div>
          </div>

          {payoutTimelineChart.items.length > 0 ? (
            <div className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 items-end min-h-[140px] p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {payoutTimelineChart.items.map((bar) => {
                  const heightPercent = Math.max(18, Math.round((bar.amount / payoutTimelineChart.maxAmount) * 100));
                  return (
                    <div key={bar.date} className="flex flex-col items-center justify-end h-32 group">
                      <div className="text-[11px] font-black text-emerald-700 mb-1">
                        {bar.amount.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="w-full max-w-[54px] bg-slate-200/70 rounded-t-xl h-20 flex items-end overflow-hidden">
                        <div
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl transition-all duration-300"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <div className="mt-1.5 text-[10px] font-bold text-slate-700">
                        {new Date(bar.date).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {bar.count} {bar.count === 1 ? 'выплата' : 'выплаты'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              За выбранный период выплаты еще не фиксировались. Используйте форму выше, чтобы зафиксировать выдачу зарплаты.
            </div>
          )}
        </div>

        {/* Section 3: Detailed Orders Breakdown (По каким заказам начислена и выплачена ЗП) */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Детализация начислений по заказам ({calculation.dealsBreakdown.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  По каким заказам начислена премия за {monthLabel} и статус выдачи по каждому заказу
                </p>
              </div>
            </div>
          </div>

          {calculation.dealsBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-3">Заказ / Договор</th>
                    <th className="p-3">Заказчик</th>
                    <th className="p-3 text-right">Сумма заказа</th>
                    <th className="p-3 text-right">Оплачено клиентом</th>
                    <th className="p-3 text-right">Премия по заказу</th>
                    <th className="p-3 text-right">К выплате в мес.</th>
                    <th className="p-3 text-right">Выдано по заказу</th>
                    {canManagePayouts && <th className="p-3 text-center">Действие</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculation.dealsBreakdown.map((item) => {
                    const paidForDeal = paidByDealId[item.deal.id] || 0;
                    const targetCommission = item.payableCommissionThisMonth || item.dealCommissionWithConversion;
                    const isDealFullyPaid = paidForDeal >= targetCommission && targetCommission > 0;

                    return (
                      <tr key={item.deal.id} className="hover:bg-slate-50/80">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">№ {item.deal.contractNumber || 'б/н'}</div>
                          <div className="text-[10px] text-slate-400">
                            от {item.deal.contractDate ? new Date(item.deal.contractDate).toLocaleDateString('ru-RU') : '—'}
                          </div>
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {item.deal.clientName || '—'}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {(item.deal.contractAmount || 0).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {item.paidInThisMonth.toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="p-3 text-right font-bold text-blue-700">
                          {Math.round(item.dealCommissionWithConversion).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700">
                          {Math.round(item.payableCommissionThisMonth).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="p-3 text-right">
                          {paidForDeal > 0 ? (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isDealFullyPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {paidForDeal.toLocaleString('ru-RU')} ₽
                            </span>
                          ) : (
                            <span className="text-slate-400">0 ₽</span>
                          )}
                        </td>
                        {canManagePayouts && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleSelectDealForPayout(item.deal, targetCommission)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Выдать по заказу
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
              В выбранном месяце ({monthLabel}) нет оформленных заказов.
            </div>
          )}
        </div>

        {/* Section 4: Payout History Log (Журнал выдачи зарплаты) */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  История выдачи зарплаты ({displayedPayouts.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Все зафиксированные выплаты сотруднику с датами, суммами и привязанными заказами
                </p>
              </div>
            </div>
          </div>

          {displayedPayouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-3">Дата выдачи</th>
                    <th className="p-3">Период</th>
                    <th className="p-3">Тип выплаты</th>
                    <th className="p-3">Способ</th>
                    <th className="p-3">Заказ / Основание</th>
                    <th className="p-3 text-right">Сумма выдачи</th>
                    {canManagePayouts && <th className="p-3 text-center">Удалить</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedPayouts.map((p) => {
                    const typeCfg = PAYOUT_TYPE_LABELS[p.payoutType] || PAYOUT_TYPE_LABELS.full_settlement;
                    const methodCfg = PAYMENT_METHOD_LABELS[p.paymentMethod || 'card'] || PAYMENT_METHOD_LABELS.card;
                    const MethodIcon = methodCfg.icon;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {p.payoutDate ? new Date(p.payoutDate).toLocaleDateString('ru-RU') : new Date(p.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="p-3 text-slate-600 font-medium whitespace-nowrap">
                          {p.month}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <MethodIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{methodCfg.label}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {p.dealContractNumber || p.dealClientName ? (
                            <div className="font-bold text-blue-700">
                              Договор №{p.dealContractNumber || 'б/н'} ({p.dealClientName || 'Клиент'})
                            </div>
                          ) : null}
                          {p.comment ? (
                            <div className="text-slate-600">{p.comment}</div>
                          ) : (
                            !p.dealContractNumber && <span className="text-slate-400">Выплата за период {p.month}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                          {Number(p.amount).toLocaleString('ru-RU')} ₽
                        </td>
                        {canManagePayouts && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => onDeletePayout(p.id)}
                              title="Удалить запись о выплате"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
              Записей о выдаче зарплаты пока нет.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
