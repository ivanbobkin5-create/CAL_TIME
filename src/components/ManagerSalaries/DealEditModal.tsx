import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, User, FileText, AlertTriangle, RussianRuble, Clock, ShieldAlert } from 'lucide-react';
import { ManagerDeal, DealStatus } from './types';
import { calculateGoodsAmount } from './calcEngine';

interface DealEditModalProps {
  deal: ManagerDeal | null;
  managers: Array<{ id: string; name: string; email?: string }>;
  currentManagerId?: string;
  canChooseManager?: boolean;
  onSave: (deal: ManagerDeal) => void;
  onClose: () => void;
}

export const DealEditModal: React.FC<DealEditModalProps> = ({
  deal,
  managers,
  currentManagerId,
  canChooseManager = true,
  onSave,
  onClose
}) => {
  const isEditing = !!deal;
  const todayStr = new Date().toISOString().split('T')[0];

  const defaultManager = managers.find(m => m.id === currentManagerId) || managers[0] || { id: 'unknown', name: 'Менеджер' };

  const [formData, setFormData] = useState<Partial<ManagerDeal>>({
    id: deal?.id || `deal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    companyId: deal?.companyId || '',
    managerId: deal?.managerId || defaultManager.id,
    managerName: deal?.managerName || defaultManager.name,
    managerEmail: deal?.managerEmail || defaultManager.email,
    meetingDate: deal?.meetingDate || todayStr,
    status: deal?.status || 'formalized',
    contractDate: deal?.contractDate || todayStr,
    contractNumber: deal?.contractNumber || '',
    clientName: deal?.clientName || '',
    saleDate: deal?.saleDate || todayStr,
    completionDate: deal?.completionDate || '',
    handoverDate: deal?.handoverDate || '',
    contractAmount: deal?.contractAmount || 0,
    productsAmount: deal?.productsAmount || 0,
    customCountertopsAmount: deal?.customCountertopsAmount || 0,
    appliancesAmount: deal?.appliancesAmount || 0,
    goodsAmount: deal?.goodsAmount || 0,
    prepayment1: deal?.prepayment1 || 0,
    prepayment1Date: deal?.prepayment1Date || todayStr,
    prepayment1Paid: deal?.prepayment1Paid !== undefined ? deal.prepayment1Paid : true,
    payment2: deal?.payment2 || 0,
    payment2Date: deal?.payment2Date || '',
    payment2Paid: deal?.payment2Paid || false,
    payment3: deal?.payment3 || 0,
    payment3Date: deal?.payment3Date || '',
    payment3Paid: deal?.payment3Paid || false,
    payment4: deal?.payment4 || 0,
    payment4Date: deal?.payment4Date || '',
    payment4Paid: deal?.payment4Paid || false,
    isInstallment: deal?.isInstallment || false,
    penaltyAmount: deal?.penaltyAmount || 0,
    penaltyReason: deal?.penaltyReason || '',
    notes: deal?.notes || ''
  });

  // Автоматический пересчет "Сумма Товары"
  const autoGoods = calculateGoodsAmount(
    formData.contractAmount || 0,
    formData.productsAmount || 0,
    formData.customCountertopsAmount || 0,
    formData.appliancesAmount || 0
  );

  const handleManagerChange = (mgrId: string) => {
    const selected = managers.find(m => m.id === mgrId);
    setFormData(prev => ({
      ...prev,
      managerId: mgrId,
      managerName: selected?.name || 'Менеджер',
      managerEmail: selected?.email
    }));
  };

  const handleStatusChange = (newStatus: DealStatus) => {
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      contractDate: newStatus === 'formalized' && !prev.contractDate ? todayStr : prev.contractDate,
      saleDate: newStatus === 'formalized' && !prev.saleDate ? todayStr : prev.saleDate
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDeal: ManagerDeal = {
      ...(formData as ManagerDeal),
      goodsAmount: autoGoods,
      updatedAt: new Date().toISOString(),
      createdAt: deal?.createdAt || new Date().toISOString()
    };
    onSave(finalDeal);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8 border border-slate-200">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Редактирование встречи / сделки' : 'Новая встреча / сделка менеджера'}
              </h2>
              <p className="text-xs text-slate-500">
                Фиксация встречи с клиентом и условий договора
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Status selector */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-xs">Статус встречи / договора</div>
              <div className="text-[11px] text-slate-500">
                {formData.status === 'formalized'
                  ? 'Договор оформлен (идет в расчет продаж и конверсии)'
                  : 'Встреча проведена, договор пока не оформлен'}
              </div>
            </div>
            <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => handleStatusChange('formalized')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  formData.status === 'formalized'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✓ Оформлен
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('not_formalized')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  formData.status === 'not_formalized'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Не оформлен
              </button>
            </div>
          </div>

          {/* Manager & Meeting Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Менеджер *</label>
              <select
                disabled={!canChooseManager && managers.length > 0}
                value={formData.managerId}
                onChange={(e) => handleManagerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Дата встречи *</label>
              <input
                type="date"
                required
                value={formData.meetingDate}
                onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* If Formalized -> Contract Details */}
          {formData.status === 'formalized' && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Номер договора *</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Д-104"
                    value={formData.contractNumber || ''}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Заказчик (ФИО / Компания) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Иванов Иван Иванович"
                    value={formData.clientName || ''}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Дата заключения</label>
                  <input
                    type="date"
                    value={formData.contractDate || ''}
                    onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Дата продажи</label>
                  <input
                    type="date"
                    value={formData.saleDate || ''}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Дата завершения</label>
                  <input
                    type="date"
                    value={formData.completionDate || ''}
                    onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Дата передачи заказа</label>
                  <input
                    type="date"
                    value={formData.handoverDate || ''}
                    onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Amounts breakdown */}
              <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>Финансовая разбивка договора</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-normal text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!formData.isInstallment}
                      onChange={(e) => setFormData({ ...formData, isInstallment: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Статус: Рассрочка</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">Сумма договора *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      placeholder="0"
                      value={formData.contractAmount || ''}
                      onChange={(e) => setFormData({ ...formData, contractAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-blue-200 font-bold text-blue-900 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Сумма Продукция</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formData.productsAmount || ''}
                      onChange={(e) => setFormData({ ...formData, productsAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Столешницы заказные</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formData.customCountertopsAmount || ''}
                      onChange={(e) => setFormData({ ...formData, customCountertopsAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Техника</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formData.appliancesAmount || ''}
                      onChange={(e) => setFormData({ ...formData, appliancesAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Сумма Товары (авто)</label>
                    <div className="w-full px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700 text-xs">
                      {autoGoods.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>
              </div>

              {/* Payments Schedule */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>График оплат заказчика (1 / 2 / 3 / 4 платежи)</span>
                  <span className="text-[10px] text-slate-500">Отметьте галочкой поступившие платежи</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Payment 1 */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] text-slate-700">1. Предоплата (Аванс)</span>
                        <input
                          type="checkbox"
                          checked={!!formData.prepayment1Paid}
                          onChange={(e) => setFormData({ ...formData, prepayment1Paid: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          placeholder="Сумма"
                          value={formData.prepayment1 || ''}
                          onChange={(e) => setFormData({ ...formData, prepayment1: parseFloat(e.target.value) || 0 })}
                          className="px-2 py-1 bg-slate-50 rounded-lg text-xs font-medium border border-slate-200"
                        />
                        <input
                          type="date"
                          value={formData.prepayment1Date || ''}
                          onChange={(e) => setFormData({ ...formData, prepayment1Date: e.target.value })}
                          className="px-1.5 py-1 bg-slate-50 rounded-lg text-[11px] border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment 2 */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] text-slate-700">2. Вторая часть оплаты</span>
                        <input
                          type="checkbox"
                          checked={!!formData.payment2Paid}
                          onChange={(e) => setFormData({ ...formData, payment2Paid: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          placeholder="Сумма"
                          value={formData.payment2 || ''}
                          onChange={(e) => setFormData({ ...formData, payment2: parseFloat(e.target.value) || 0 })}
                          className="px-2 py-1 bg-slate-50 rounded-lg text-xs font-medium border border-slate-200"
                        />
                        <input
                          type="date"
                          value={formData.payment2Date || ''}
                          onChange={(e) => setFormData({ ...formData, payment2Date: e.target.value })}
                          className="px-1.5 py-1 bg-slate-50 rounded-lg text-[11px] border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment 3 */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] text-slate-700">3. Третья часть оплаты</span>
                        <input
                          type="checkbox"
                          checked={!!formData.payment3Paid}
                          onChange={(e) => setFormData({ ...formData, payment3Paid: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          placeholder="Сумма"
                          value={formData.payment3 || ''}
                          onChange={(e) => setFormData({ ...formData, payment3: parseFloat(e.target.value) || 0 })}
                          className="px-2 py-1 bg-slate-50 rounded-lg text-xs font-medium border border-slate-200"
                        />
                        <input
                          type="date"
                          value={formData.payment3Date || ''}
                          onChange={(e) => setFormData({ ...formData, payment3Date: e.target.value })}
                          className="px-1.5 py-1 bg-slate-50 rounded-lg text-[11px] border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment 4 */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] text-slate-700">4. Четвертая часть (Остаток)</span>
                        <input
                          type="checkbox"
                          checked={!!formData.payment4Paid}
                          onChange={(e) => setFormData({ ...formData, payment4Paid: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          placeholder="Сумма"
                          value={formData.payment4 || ''}
                          onChange={(e) => setFormData({ ...formData, payment4: parseFloat(e.target.value) || 0 })}
                          className="px-2 py-1 bg-slate-50 rounded-lg text-xs font-medium border border-slate-200"
                        />
                        <input
                          type="date"
                          value={formData.payment4Date || ''}
                          onChange={(e) => setFormData({ ...formData, payment4Date: e.target.value })}
                          className="px-1.5 py-1 bg-slate-50 rounded-lg text-[11px] border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Penalties */}
              <div className="p-3 bg-red-50/50 rounded-2xl border border-red-100">
                <div className="font-bold text-red-900 text-xs mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Штраф по данной сделке (уменьшает премию)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-red-800 mb-0.5">Сумма штрафа (₽)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formData.penaltyAmount || ''}
                      onChange={(e) => setFormData({ ...formData, penaltyAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-red-200 font-bold text-red-700 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-red-800 mb-0.5">Причина наложения штрафа</label>
                    <input
                      type="text"
                      placeholder="Например: ошибка в замере, задержка договора"
                      value={formData.penaltyReason || ''}
                      onChange={(e) => setFormData({ ...formData, penaltyReason: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-red-200 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Заметки и комментарии по встрече</label>
            <textarea
              rows={2}
              placeholder="Клиент думает над бюджетом, повторный звонок через 3 дня..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isEditing ? 'Сохранить изменения' : 'Зафиксировать сделку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
