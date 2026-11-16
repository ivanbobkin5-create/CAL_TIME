import React, { useState } from 'react';
import { X, Check, RussianRuble, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { ManagerDeal } from './types';

interface QuickPaymentModalProps {
  deal: ManagerDeal;
  onSave: (updatedDeal: ManagerDeal) => void;
  onClose: () => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  deal,
  onSave,
  onClose
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [prepayment1Paid, setPrepayment1Paid] = useState(!!deal.prepayment1Paid);
  const [prepayment1, setPrepayment1] = useState(deal.prepayment1 || 0);
  const [prepayment1Date, setPrepayment1Date] = useState(deal.prepayment1Date || todayStr);

  const [payment2Paid, setPayment2Paid] = useState(!!deal.payment2Paid);
  const [payment2, setPayment2] = useState(deal.payment2 || 0);
  const [payment2Date, setPayment2Date] = useState(deal.payment2Date || todayStr);

  const [payment3Paid, setPayment3Paid] = useState(!!deal.payment3Paid);
  const [payment3, setPayment3] = useState(deal.payment3 || 0);
  const [payment3Date, setPayment3Date] = useState(deal.payment3Date || todayStr);

  const [payment4Paid, setPayment4Paid] = useState(!!deal.payment4Paid);
  const [payment4, setPayment4] = useState(deal.payment4 || 0);
  const [payment4Date, setPayment4Date] = useState(deal.payment4Date || todayStr);

  const contractTotal = deal.contractAmount || 0;
  const currentPaid = (prepayment1Paid ? prepayment1 : 0) +
                      (payment2Paid ? payment2 : 0) +
                      (payment3Paid ? payment3 : 0) +
                      (payment4Paid ? payment4 : 0);
  const balance = Math.max(0, contractTotal - currentPaid);

  const handlePayRemaining = () => {
    if (balance <= 0) return;
    if (!payment2Paid) {
      setPayment2Paid(true);
      setPayment2(balance);
      setPayment2Date(todayStr);
    } else if (!payment3Paid) {
      setPayment3Paid(true);
      setPayment3(balance);
      setPayment3Date(todayStr);
    } else {
      setPayment4Paid(true);
      setPayment4(balance);
      setPayment4Date(todayStr);
    }
  };

  const handleSave = () => {
    const updated: ManagerDeal = {
      ...deal,
      prepayment1,
      prepayment1Paid,
      prepayment1Date,
      payment2,
      payment2Paid,
      payment2Date,
      payment3,
      payment3Paid,
      payment3Date,
      payment4,
      payment4Paid,
      payment4Date,
      updatedAt: new Date().toISOString()
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8 border border-slate-200">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <RussianRuble className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Оплата по договору {deal.contractNumber || 'Б/Н'}
              </h2>
              <p className="text-xs text-slate-500">
                Заказчик: {deal.clientName || '—'} • Сумма: {contractTotal.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Status */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase">Внесено клиентом</div>
            <div className="text-base font-black text-emerald-700 mt-0.5">
              {currentPaid.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500 font-bold uppercase">Остаток к оплате</div>
            <div className={`text-base font-black mt-0.5 ${balance > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
              {balance.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          {balance > 0 && (
            <button
              type="button"
              onClick={handlePayRemaining}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap ml-2"
            >
              Оплатить остаток
            </button>
          )}
        </div>

        {/* Payments Rows */}
        <div className="space-y-3 mb-6 text-xs">
          {/* Part 1 */}
          <div className={`p-3 rounded-2xl border transition-all ${
            prepayment1Paid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">1. Предоплата (Аванс)</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11px] text-emerald-800">
                <input
                  type="checkbox"
                  checked={prepayment1Paid}
                  onChange={(e) => setPrepayment1Paid(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Внесен</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Сумма (₽)</label>
                <input
                  type="number"
                  value={prepayment1 || ''}
                  onChange={(e) => setPrepayment1(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Дата платежа</label>
                <input
                  type="date"
                  value={prepayment1Date}
                  onChange={(e) => setPrepayment1Date(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded-xl border border-slate-200 font-medium text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Part 2 */}
          <div className={`p-3 rounded-2xl border transition-all ${
            payment2Paid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">2. Вторая часть оплаты</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11px] text-emerald-800">
                <input
                  type="checkbox"
                  checked={payment2Paid}
                  onChange={(e) => setPayment2Paid(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Внесен</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Сумма (₽)</label>
                <input
                  type="number"
                  value={payment2 || ''}
                  onChange={(e) => setPayment2(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Дата платежа</label>
                <input
                  type="date"
                  value={payment2Date}
                  onChange={(e) => setPayment2Date(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded-xl border border-slate-200 font-medium text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Part 3 */}
          <div className={`p-3 rounded-2xl border transition-all ${
            payment3Paid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">3. Третья часть оплаты</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11px] text-emerald-800">
                <input
                  type="checkbox"
                  checked={payment3Paid}
                  onChange={(e) => setPayment3Paid(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Внесен</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Сумма (₽)</label>
                <input
                  type="number"
                  value={payment3 || ''}
                  onChange={(e) => setPayment3(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Дата платежа</label>
                <input
                  type="date"
                  value={payment3Date}
                  onChange={(e) => setPayment3Date(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded-xl border border-slate-200 font-medium text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Part 4 */}
          <div className={`p-3 rounded-2xl border transition-all ${
            payment4Paid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">4. Четвертая часть (Остаток)</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11px] text-emerald-800">
                <input
                  type="checkbox"
                  checked={payment4Paid}
                  onChange={(e) => setPayment4Paid(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Внесен</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Сумма (₽)</label>
                <input
                  type="number"
                  value={payment4 || ''}
                  onChange={(e) => setPayment4(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Дата платежа</label>
                <input
                  type="date"
                  value={payment4Date}
                  onChange={(e) => setPayment4Date(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white rounded-xl border border-slate-200 font-medium text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Сохранить платежи
          </button>
        </div>
      </div>
    </div>
  );
};
