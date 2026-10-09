import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Sparkles, Building2, Layers, Truck, Warehouse, DollarSign, 
  CreditCard, QrCode, Copy, CheckCircle2, AlertCircle, ShieldCheck, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModuleDef {
  id: string;
  name: string;
  desc: string;
  icon: any;
  baseMonthlyPrice: number;
  availableFor: Array<'Мебельное производство' | 'Салон' | 'Дизайнер'>;
}

const ALL_MODULES: ModuleDef[] = [
  {
    id: 'erp',
    name: 'Производство (ERP)',
    desc: 'Управление цехом, участки распила, кромки, ЧПУ, упаковки, график смен и учет выработки',
    icon: Layers,
    baseMonthlyPrice: 11990,
    availableFor: ['Мебельное производство'],
  },
  {
    id: 'procurement',
    name: 'Снабжение',
    desc: 'Закупки, поставщики, импорт из Базис Мебельщик, контроль счетов и сопоставление позиций',
    icon: Truck,
    baseMonthlyPrice: 3990,
    availableFor: ['Мебельное производство', 'Салон'],
  },
  {
    id: 'warehouse',
    name: 'Склад',
    desc: 'Складской учет, резервы к заказам, списание при отгрузке, инвентаризация и права доступа',
    icon: Warehouse,
    baseMonthlyPrice: 8990,
    availableFor: ['Мебельное производство', 'Салон'],
  },
  {
    id: 'manager_salaries',
    name: 'Зарплаты менеджеров',
    desc: 'Расчет мотивации, проценты с продаж, планы продаж и автоматические расчетные листы',
    icon: DollarSign,
    baseMonthlyPrice: 2990,
    availableFor: ['Мебельное производство', 'Салон'],
  },
];

interface ModuleSubscriptionModalProps {
  companyData: any;
  onClose: () => void;
  showAlert?: (title: string, message: string) => void;
}

export const ModuleSubscriptionModal: React.FC<ModuleSubscriptionModalProps> = ({
  companyData,
  onClose,
  showAlert = (t, m) => alert(`${t}: ${m}`),
}) => {
  const rawType = companyData?.type || companyData?.companyType || 'Мебельное производство';
  const normalizedType: 'Мебельное производство' | 'Салон' | 'Дизайнер' = 
    rawType.toLowerCase().includes('производ') ? 'Мебельное производство' :
    rawType.toLowerCase().includes('салон') ? 'Салон' : 'Дизайнер';

  // Available modules for this company
  const availableModules = useMemo(() => {
    return ALL_MODULES.filter(m => m.availableFor.includes(normalizedType));
  }, [normalizedType]);

  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(() => {
    // By default, select all available modules or existing active ones
    const active = companyData?.activeModules || {};
    const preselected = availableModules.filter(m => active[m.id]).map(m => m.id);
    return preselected.length > 0 ? preselected : availableModules.map(m => m.id);
  });

  const [period, setPeriod] = useState<'month' | 'half_year' | 'year'>('month');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSubmitted, setSuccessSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bank requisites state
  const [requisites, setRequisites] = useState({
    payeeName: "ИП Бобкин Иван Александрович",
    inn: "770000000000",
    account: "40802810000000000000",
    bankName: "ПАО СБЕРБАНК",
    bic: "044525225",
    corrAccount: "30101810400000000225"
  });

  useEffect(() => {
    fetch('/api/system/payment-requisites')
      .then(res => res.json())
      .then(data => {
        if (data?.requisites) {
          setRequisites(data.requisites);
        }
      })
      .catch(() => {});
  }, []);

  const isAllSelected = availableModules.length > 0 && selectedModuleIds.length === availableModules.length;

  const toggleModule = (id: string) => {
    setSelectedModuleIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedModuleIds([]);
    } else {
      setSelectedModuleIds(availableModules.map(m => m.id));
    }
  };

  // Calculations
  const monthsCount = period === 'year' ? 12 : period === 'half_year' ? 6 : 1;
  const rawMonthlySum = availableModules
    .filter(m => selectedModuleIds.includes(m.id))
    .reduce((sum, m) => sum + m.baseMonthlyPrice, 0);

  // Discount rule:
  // "Всё и сразу" bundle: 6 months: 15%, 12 months: 20%
  // Individual modules: 1 month: 0%, 6 months: 10%, 12 months: 15%
  let discountPercent = 0;
  if (isAllSelected && availableModules.length > 1) {
    if (period === 'half_year') discountPercent = 15;
    else if (period === 'year') discountPercent = 20;
  } else {
    if (period === 'half_year') discountPercent = 10;
    else if (period === 'year') discountPercent = 15;
  }

  const basePeriodTotal = rawMonthlySum * monthsCount;
  const discountAmount = Math.round((basePeriodTotal * discountPercent) / 100);
  const finalTotal = basePeriodTotal - discountAmount;

  // Generate Russian Banking SBP QR Code payload (ГОСТ Р 56042-2014)
  const qrString = useMemo(() => {
    const purpose = `Оплата модулей CRM (${selectedModuleIds.join(', ')}), ${companyData?.name || 'Компания'}`;
    const sumKopecks = finalTotal * 100;
    return `ST00012|Name=${requisites.payeeName}|PersonalAcc=${requisites.account}|BankName=${requisites.bankName}|BIC=${requisites.bic}|CorrespAcc=${requisites.corrAccount}|PayeeINN=${requisites.inn}|Purpose=${purpose}|Sum=${sumKopecks}`;
  }, [requisites, selectedModuleIds, companyData, finalTotal]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrString)}`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitRequest = async () => {
    if (selectedModuleIds.length === 0) {
      showAlert('Выберите модули', 'Пожалуйста, выберите хотя бы один модуль для подключения.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/module-payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: {
            companyId: companyData?.id,
            companyName: companyData?.name || 'Без названия',
            companyType: normalizedType,
            modules: selectedModuleIds,
            period,
            months: monthsCount,
            isBundle: isAllSelected,
            monthlySum: rawMonthlySum,
            discountPercent,
            discountAmount,
            totalAmount: finalTotal,
            qrPayload: qrString,
            status: 'pending',
          }
        })
      });
      if (res.ok) {
        setSuccessSubmitted(true);
      } else {
        showAlert('Ошибка', 'Не удалось отправить заявку. Попробуйте позже.');
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Ошибка сети', e.message || 'Ошибка соединения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-100 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Подключение модулей системы</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                  {normalizedType}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Компания: <strong className="text-slate-800">{companyData?.name || 'Моя компания'}</strong> • Бесплатный ознакомительный период 14 дней
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {successSubmitted ? (
            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Заявка успешно отправлена!</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Выбранные модули переданы администратору. Для ускорения активации вы можете оплатить сумму по QR-коду или банковским реквизитам ниже.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs font-mono space-y-1">
                <div>Сумма к оплате: <strong>{finalTotal.toLocaleString()} ₽</strong></div>
                <div>Получатель: {requisites.payeeName}</div>
                <div>Назначение: Оплата модулей CRM ({companyData?.name})</div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
              >
                Вернуться к работе
              </button>
            </div>
          ) : normalizedType === 'Дизайнер' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-3">
              <Building2 className="w-10 h-10 text-blue-600 mx-auto" />
              <h3 className="text-lg font-black text-blue-900">Кабинет Дизайнера</h3>
              <p className="text-sm text-blue-800 max-w-md mx-auto">
                Для аккаунтов со статусом «Дизайнер» весь основной функционал мебельного калькулятора и передачи проектов на фабрики доступен без абонентской платы.
              </p>
            </div>
          ) : (
            <>
              {/* Period Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                  Срок действия подписки
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPeriod('month')}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 text-left transition-all relative cursor-pointer",
                      period === 'month' 
                        ? "border-indigo-600 bg-indigo-50/60 shadow-xs" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="text-xs font-bold text-slate-500">Помесячно</div>
                    <div className="text-base font-black text-slate-900">1 месяц</div>
                    <div className="text-[11px] text-slate-400 font-medium">Стандартный тариф</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriod('half_year')}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 text-left transition-all relative cursor-pointer",
                      period === 'half_year' 
                        ? "border-indigo-600 bg-indigo-50/60 shadow-xs" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <span className="absolute -top-2.5 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs">
                      {isAllSelected ? "СКИДКА -15%" : "СКИДКА -10%"}
                    </span>
                    <div className="text-xs font-bold text-slate-500">Полгода</div>
                    <div className="text-base font-black text-slate-900">6 месяцев</div>
                    <div className="text-[11px] text-emerald-600 font-bold">Выгодная экономия</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriod('year')}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 text-left transition-all relative cursor-pointer",
                      period === 'year' 
                        ? "border-indigo-600 bg-indigo-50/60 shadow-xs" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <span className="absolute -top-2.5 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-xs">
                      {isAllSelected ? "СКИДКА -20%" : "СКИДКА -15%"}
                    </span>
                    <div className="text-xs font-bold text-slate-500">Годовой тариф</div>
                    <div className="text-base font-black text-slate-900">12 месяцев</div>
                    <div className="text-[11px] text-purple-600 font-bold">Максимальная скидка</div>
                  </button>
                </div>
              </div>

              {/* Bundle quick button */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Тариф «Всё и сразу»</h4>
                    <p className="text-xs text-slate-600">
                      Включает все модули для {normalizedType.toLowerCase()} со специальной скидкой до 20%
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs",
                    isAllSelected
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  )}
                >
                  {isAllSelected ? "Снять выбор" : "Выбрать всё"}
                </button>
              </div>

              {/* Module selection list */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                  Доступные модули для вашей компании
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableModules.map((mod) => {
                    const isSelected = selectedModuleIds.includes(mod.id);
                    const ModIcon = mod.icon;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                          isSelected ? "bg-indigo-600 text-white" : "border-2 border-slate-300 text-transparent"
                        )}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 font-black text-sm text-slate-900">
                              <ModIcon className="w-4 h-4 text-indigo-600" />
                              <span>{mod.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-800 shrink-0 font-mono">
                              {mod.baseMonthlyPrice.toLocaleString()} ₽/мес
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculation & Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                {/* Requisites & QR Code */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Оплата по QR-коду (СБП / Банк)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      ГОСТ Р 56042
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                      <img 
                        src={qrImageUrl} 
                        alt="QR код для оплаты" 
                        className="w-28 h-28 object-contain"
                      />
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-1.5 flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">
                        Отсканируйте камерой телефона или приложением любого мобильного банка (Сбер, Т-Банк, ВТБ).
                      </p>
                      <div className="pt-1 text-[10px] font-mono text-slate-500 space-y-0.5">
                        <div className="truncate"><strong>Получатель:</strong> {requisites.payeeName}</div>
                        <div><strong>ИНН:</strong> {requisites.inn}</div>
                        <div className="truncate"><strong>Р/С:</strong> {requisites.account}</div>
                        <div><strong>БИК:</strong> {requisites.bic}</div>
                      </div>
                    </div>
                  </div>

                  {/* Copy Requisites Button */}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      `Получатель: ${requisites.payeeName}\nИНН: ${requisites.inn}\nР/С: ${requisites.account}\nБанк: ${requisites.bankName}\nБИК: ${requisites.bic}\nК/С: ${requisites.corrAccount}\nСумма: ${finalTotal} руб.\nНазначение: Оплата модулей CRM (${companyData?.name})`,
                      'all'
                    )}
                    className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedField === 'all' ? 'Реквизиты скопированы!' : 'Скопировать все реквизиты'}</span>
                  </button>
                </div>

                {/* Price summary */}
                <div className="p-5 bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl border border-indigo-100 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Итоговый расчет стоимости</h4>
                    
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Модулей выбрано:</span>
                      <strong className="font-bold text-slate-800">{selectedModuleIds.length} из {availableModules.length}</strong>
                    </div>

                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Срок подписки:</span>
                      <strong className="font-bold text-slate-800">
                        {period === 'year' ? '12 месяцев' : period === 'half_year' ? '6 месяцев' : '1 месяц'}
                      </strong>
                    </div>

                    {discountPercent > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600 font-bold">
                        <span>Скидка ({discountPercent}%):</span>
                        <span>- {discountAmount.toLocaleString()} ₽</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-indigo-100 flex items-baseline justify-between">
                      <span className="text-sm font-black text-slate-800">К оплате:</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-indigo-700 font-mono tracking-tight">
                          {finalTotal.toLocaleString()} ₽
                        </span>
                        {monthsCount > 1 && (
                          <div className="text-[11px] text-slate-400">
                            ≈ {Math.round(finalTotal / monthsCount).toLocaleString()} ₽/мес
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={isSubmitting || selectedModuleIds.length === 0}
                      onClick={handleSubmitRequest}
                      className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isSubmitting ? 'Отправка заявки...' : 'Отправить заявку на подключение'}</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400 font-medium">
                      После подтверждения оплаты администратором модули активируются автоматически.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Безопасная оплата на расчетный счет ИП • Закрывающие документы для бухгалтерии</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
